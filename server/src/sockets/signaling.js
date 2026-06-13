import { config } from "../config.js";
import { getSession, getSessionForAgent, addParticipant, markParticipantLeft, markSessionActive, endSession } from "../services/sessionService.js";
import { mediasoupProducersTotal, socketErrorsTotal } from "../services/metricsService.js";
import { authenticateSocket } from "./authSocket.js";
import { closeRoom, getOrCreateRoom } from "./rooms.js";

const pendingDisconnects = new Map();
const customerReturnTimers = new Map();

function callbackOrEmit(socket, event, payload, cb) {
  if (typeof cb === "function") cb(payload);
  else socket.emit(event, payload);
}

function socketError(socket, message, cb) {
  socketErrorsTotal.inc();
  callbackOrEmit(socket, "error", { message }, cb);
}

export function registerSignaling(io, socket) {
  let joined = null;

  function clearCustomerReturnTimer(sessionId) {
    const timer = customerReturnTimers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      customerReturnTimers.delete(sessionId);
    }
  }

  function scheduleCustomerReturnWindow(sessionId) {
    clearCustomerReturnTimer(sessionId);
    const timer = setTimeout(async () => {
      const session = getSession(sessionId);
      if (!session || session.status === "ended") return;
      const room = await getOrCreateRoom(sessionId);
      if (room.findActivePeerByRole("customer")) return;
      endSession(sessionId, "system");
      io.to(sessionId).emit("call-ended", { by: "customer-timeout" });
      closeRoom(sessionId);
      customerReturnTimers.delete(sessionId);
    }, config.customerReturnWindowMs);
    customerReturnTimers.set(sessionId, timer);
    io.to(sessionId).emit("customer-return-window", {
      sessionId,
      timeoutMs: config.customerReturnWindowMs
    });
  }

  socket.on("join-room", async ({ sessionId, role, clientId }, cb) => {
    try {
      const tokenUser = authenticateSocket(socket);
      const session = getSession(sessionId);
      if (!session) return socketError(socket, "Session not found", cb);
      if (session.status === "ended") return socketError(socket, "This session has ended", cb);
      if (role !== tokenUser.role) return socketError(socket, "Role does not match token", cb);
      if (role === "customer" && tokenUser.sessionId !== sessionId) return socketError(socket, "Invite token is not valid for this session", cb);
      if (role === "agent" && !getSessionForAgent(sessionId, tokenUser.agentId)) return socketError(socket, "Agent cannot access this session", cb);

      const room = await getOrCreateRoom(sessionId);
      if (role === "customer") clearCustomerReturnTimer(sessionId);
      const existingSameRole = room.findActivePeerByRole(role);
      const pendingKey = `${sessionId}:${role}:${clientId}`;
      const pending = pendingDisconnects.get(pendingKey);
      if (existingSameRole && existingSameRole.clientId !== clientId && !pending) {
        return socketError(socket, `A ${role} is already connected to this session`, cb);
      }

      const participantId = addParticipant(sessionId, role, clientId, socket.id);
      room.ensurePeer(socket.id, role, clientId, participantId);
      socket.join(sessionId);
      joined = { sessionId, role, clientId, participantId };
      markSessionActive(sessionId);

      if (pending) {
        clearTimeout(pending.timer);
        room.removePeer(pending.socketId);
        pendingDisconnects.delete(pendingKey);
      } else {
        socket.to(sessionId).emit("peer-joined", { peerId: socket.id, role });
      }

      callbackOrEmit(socket, "joined", { ok: true, peerId: socket.id, existingProducers: room.getProducersExcept(socket.id) }, cb);
    } catch (error) {
      socketError(socket, error.message, cb);
    }
  });

  socket.on("get-router-rtp-capabilities", async (_payload, cb) => {
    if (!joined) return socketError(socket, "Join a room first", cb);
    const room = await getOrCreateRoom(joined.sessionId);
    callbackOrEmit(socket, "router-rtp-capabilities", { rtpCapabilities: room.router.rtpCapabilities }, cb);
  });

  socket.on("create-transport", async ({ direction }, cb) => {
    try {
      if (!joined) return socketError(socket, "Join a room first", cb);
      const room = await getOrCreateRoom(joined.sessionId);
      const transport = await room.createWebRtcTransport(socket.id, direction);
      const params = {
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters
      };
      callbackOrEmit(socket, "transport-created", params, cb);
    } catch (error) {
      socketError(socket, error.message, cb);
    }
  });

  socket.on("connect-transport", async ({ transportId, dtlsParameters }, cb) => {
    try {
      const room = await getOrCreateRoom(joined.sessionId);
      const transport = room.getTransport(socket.id, transportId);
      if (!transport) return socketError(socket, "Transport not found", cb);
      await transport.connect({ dtlsParameters });
      callbackOrEmit(socket, "transport-connected", { transportId }, cb);
    } catch (error) {
      socketError(socket, error.message, cb);
    }
  });

  socket.on("produce", async ({ transportId, kind, rtpParameters, appData }, cb) => {
    try {
      const room = await getOrCreateRoom(joined.sessionId);
      const transport = room.getTransport(socket.id, transportId);
      if (!transport) return socketError(socket, "Transport not found", cb);
      const producer = await transport.produce({ kind, rtpParameters, appData });
      room.addProducer(socket.id, producer);
      mediasoupProducersTotal.inc();
      socket.to(joined.sessionId).emit("new-producer", { producerId: producer.id, peerId: socket.id, kind });
      callbackOrEmit(socket, "produced", { producerId: producer.id }, cb);
    } catch (error) {
      socketError(socket, error.message, cb);
    }
  });

  socket.on("consume", async ({ producerId, rtpCapabilities }, cb) => {
    try {
      const room = await getOrCreateRoom(joined.sessionId);
      if (!room.router.canConsume({ producerId, rtpCapabilities })) {
        return socketError(socket, "Client cannot consume this producer", cb);
      }
      const peer = room.getPeer(socket.id);
      const recvTransport = [...peer.transports.values()].find((transport) => transport.appData?.direction === "recv") || [...peer.transports.values()][0];
      if (!recvTransport) return socketError(socket, "Receive transport not found", cb);
      const consumer = await recvTransport.consume({
        producerId,
        rtpCapabilities,
        paused: true
      });
      room.addConsumer(socket.id, consumer);
      callbackOrEmit(
        socket,
        "consumer-created",
        {
          id: consumer.id,
          producerId,
          kind: consumer.kind,
          rtpParameters: consumer.rtpParameters
        },
        cb
      );
    } catch (error) {
      socketError(socket, error.message, cb);
    }
  });

  socket.on("consumer-resume", async ({ consumerId }, cb) => {
    try {
      const peer = (await getOrCreateRoom(joined.sessionId)).getPeer(socket.id);
      const consumer = peer?.consumers.get(consumerId);
      if (!consumer) return socketError(socket, "Consumer not found", cb);
      await consumer.resume();
      callbackOrEmit(socket, "consumer-resumed", { consumerId }, cb);
    } catch (error) {
      socketError(socket, error.message, cb);
    }
  });

  socket.on("toggle-media", ({ kind, enabled }, cb) => {
    const roomPromise = getOrCreateRoom(joined.sessionId);
    roomPromise.then((room) => {
      const peer = room.getPeer(socket.id);
      if (peer) peer.media[kind] = enabled;
      socket.to(joined.sessionId).emit("peer-media-toggled", { peerId: socket.id, kind, enabled });
      callbackOrEmit(socket, "media-toggled", { kind, enabled }, cb);
    });
  });

  socket.on("end-call", (_payload, cb) => {
    if (!joined) return socketError(socket, "Join a room first", cb);
    if (joined.role !== "agent") return socketError(socket, "Only the agent can end the session", cb);
    clearCustomerReturnTimer(joined.sessionId);
    endSession(joined.sessionId, "agent");
    io.to(joined.sessionId).emit("call-ended", { by: "agent" });
    closeRoom(joined.sessionId);
    callbackOrEmit(socket, "ended", { ok: true }, cb);
  });

  const leave = (payload = {}) => {
    if (!joined) return;
    const snapshot = joined;
    const key = `${snapshot.sessionId}:${snapshot.role}:${snapshot.clientId}`;
    if (payload.reason === "intentional") {
      getOrCreateRoom(snapshot.sessionId).then((room) => {
        room.removePeer(socket.id);
        markParticipantLeft(snapshot.participantId, snapshot.role, snapshot.sessionId);
        socket.to(snapshot.sessionId).emit("peer-left", { peerId: socket.id, role: snapshot.role });
        if (snapshot.role === "customer") scheduleCustomerReturnWindow(snapshot.sessionId);
      });
      pendingDisconnects.delete(key);
      joined = null;
      return;
    }
    const timer = setTimeout(async () => {
      const room = await getOrCreateRoom(snapshot.sessionId);
      room.removePeer(socket.id);
      markParticipantLeft(snapshot.participantId, snapshot.role, snapshot.sessionId);
      socket.to(snapshot.sessionId).emit("peer-left", { peerId: socket.id });
      if (snapshot.role === "customer") scheduleCustomerReturnWindow(snapshot.sessionId);
      pendingDisconnects.delete(key);
    }, config.reconnectGraceMs);
    pendingDisconnects.set(key, { timer, socketId: socket.id });
    joined = null;
  };

  socket.on("leave", leave);
  socket.on("disconnect", leave);
}
