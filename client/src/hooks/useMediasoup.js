import { useCallback, useEffect, useRef, useState } from "react";
import { Device } from "mediasoup-client";
import { createSocket } from "../socket.js";

function emitAck(socket, event, payload = {}) {
  return new Promise((resolve, reject) => {
    socket.emit(event, payload, (response) => {
      if (response?.error || response?.message) reject(new Error(response.error || response.message));
      else resolve(response);
    });
  });
}

export function useMediasoup({ sessionId, role, token }) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState([]);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [callEnded, setCallEnded] = useState(false);
  const [mediaState, setMediaState] = useState({ audio: true, video: true });
  const socketRef = useRef(null);
  const deviceRef = useRef(null);
  const sendTransportRef = useRef(null);
  const recvTransportRef = useRef(null);
  const producersRef = useRef(new Map());
  const consumersRef = useRef(new Map());
  const clientIdRef = useRef(localStorage.getItem("aq_client_id") || crypto.randomUUID());

  useEffect(() => {
    localStorage.setItem("aq_client_id", clientIdRef.current);
  }, []);

  const consumeProducer = useCallback(async (producerId, peerId) => {
    const socket = socketRef.current;
    const device = deviceRef.current;
    if (!socket || !device || !recvTransportRef.current) return;

    const params = await emitAck(socket, "consume", {
      producerId,
      rtpCapabilities: device.rtpCapabilities
    });
    const consumer = await recvTransportRef.current.consume(params);
    consumersRef.current.set(consumer.id, consumer);
    const stream = new MediaStream([consumer.track]);
    setRemoteStreams((current) => {
      const existing = current.find((item) => item.peerId === peerId);
      if (existing) {
        existing.stream.addTrack(consumer.track);
        return [...current];
      }
      return [...current, { peerId, stream }];
    });
    await emitAck(socket, "consumer-resume", { consumerId: consumer.id });
  }, []);

  const join = useCallback(async () => {
    if (!sessionId || !role || !token) return;
    setStatus("connecting");
    setError("");

    try {
      const socket = createSocket(token, role);
      socketRef.current = socket;

      socket.on("error", ({ message }) => setError(message));
      socket.on("call-ended", () => {
        setCallEnded(true);
        setStatus("ended");
      });
      socket.on("peer-left", ({ peerId }) => {
        setRemoteStreams((current) => current.filter((item) => item.peerId !== peerId));
      });
      socket.on("new-producer", ({ producerId, peerId }) => consumeProducer(producerId, peerId));

      await new Promise((resolve) => socket.on("connect", resolve));
      const joined = await emitAck(socket, "join-room", {
        sessionId,
        role,
        clientId: clientIdRef.current
      });

      const { rtpCapabilities } = await emitAck(socket, "get-router-rtp-capabilities");
      const device = new Device();
      await device.load({ routerRtpCapabilities: rtpCapabilities });
      deviceRef.current = device;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      setLocalStream(stream);

      const sendParams = await emitAck(socket, "create-transport", { direction: "send" });
      const sendTransport = device.createSendTransport(sendParams);
      sendTransportRef.current = sendTransport;
      sendTransport.on("connect", ({ dtlsParameters }, callback, errback) => {
        emitAck(socket, "connect-transport", { transportId: sendTransport.id, dtlsParameters }).then(callback).catch(errback);
      });
      sendTransport.on("produce", ({ kind, rtpParameters, appData }, callback, errback) => {
        emitAck(socket, "produce", { transportId: sendTransport.id, kind, rtpParameters, appData })
          .then(({ producerId }) => callback({ id: producerId }))
          .catch(errback);
      });

      const recvParams = await emitAck(socket, "create-transport", { direction: "recv" });
      const recvTransport = device.createRecvTransport(recvParams);
      recvTransportRef.current = recvTransport;
      recvTransport.on("connect", ({ dtlsParameters }, callback, errback) => {
        emitAck(socket, "connect-transport", { transportId: recvTransport.id, dtlsParameters }).then(callback).catch(errback);
      });

      for (const track of stream.getTracks()) {
        const producer = await sendTransport.produce({ track, appData: { source: track.kind } });
        producersRef.current.set(track.kind, producer);
      }

      for (const producer of joined.existingProducers || []) {
        await consumeProducer(producer.producerId, producer.peerId);
      }

      setStatus("connected");
    } catch (err) {
      setError(err.message);
      setStatus("error");
    }
  }, [consumeProducer, role, sessionId, token]);

  useEffect(() => {
    join();
    return () => {
      socketRef.current?.emit("leave");
      socketRef.current?.disconnect();
      localStream?.getTracks().forEach((track) => track.stop());
    };
  }, [join]);

  async function toggle(kind) {
    const nextEnabled = !mediaState[kind];
    const producer = producersRef.current.get(kind);
    if (producer) {
      if (nextEnabled) producer.resume();
      else producer.pause();
    }
    localStream?.getTracks().filter((track) => track.kind === kind).forEach((track) => {
      track.enabled = nextEnabled;
    });
    setMediaState((current) => ({ ...current, [kind]: nextEnabled }));
    socketRef.current?.emit("toggle-media", { kind, enabled: nextEnabled });
  }

  function endCall() {
    if (role === "agent") socketRef.current?.emit("end-call");
    else socketRef.current?.emit("leave");
    setCallEnded(true);
    setStatus("ended");
  }

  return {
    socket: socketRef.current,
    localStream,
    remoteStreams,
    status,
    error,
    callEnded,
    mediaState,
    toggleAudio: () => toggle("audio"),
    toggleVideo: () => toggle("video"),
    endCall
  };
}
