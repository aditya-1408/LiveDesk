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

function createClientId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  const randomPart = Math.random().toString(36).slice(2);
  return `client-${Date.now().toString(36)}-${randomPart}`;
}

function createDemoMediaStream(role) {
  const canvas = document.createElement("canvas");
  canvas.width = 960;
  canvas.height = 540;
  const ctx = canvas.getContext("2d");
  let frame = 0;

  function draw() {
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, role === "agent" ? "#123c69" : "#14532d");
    gradient.addColorStop(1, "#0f172a");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.beginPath();
    ctx.arc(160 + Math.sin(frame / 20) * 60, 140, 90, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "white";
    ctx.font = "700 46px system-ui, sans-serif";
    ctx.fillText(`${role} demo camera`, 80, 270);
    ctx.font = "28px system-ui, sans-serif";
    ctx.fillText("Physical camera is busy on this device", 80, 320);
    ctx.fillText(new Date().toLocaleTimeString(), 80, 370);
    frame += 1;
    requestAnimationFrame(draw);
  }

  draw();
  const stream = canvas.captureStream(24);

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (AudioContextClass) {
    const audioContext = new AudioContextClass();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const destination = audioContext.createMediaStreamDestination();
    gain.gain.value = 0;
    oscillator.connect(gain).connect(destination);
    oscillator.start();
    destination.stream.getAudioTracks().forEach((track) => stream.addTrack(track));
  }

  return stream;
}

export function useMediasoup({ sessionId, role, token }) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState([]);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [callEnded, setCallEnded] = useState(false);
  const [mediaState, setMediaState] = useState({ audio: true, video: true });
  const socketRef = useRef(null);
  const localStreamRef = useRef(null);
  const deviceRef = useRef(null);
  const sendTransportRef = useRef(null);
  const recvTransportRef = useRef(null);
  const producersRef = useRef(new Map());
  const consumersRef = useRef(new Map());
  const clientIdRef = useRef(localStorage.getItem("aq_client_id") || createClientId());

  function stopAllMedia() {
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    for (const consumer of consumersRef.current.values()) consumer.close();
    for (const producer of producersRef.current.values()) producer.close();
    sendTransportRef.current?.close();
    recvTransportRef.current?.close();
    setRemoteStreams((current) => {
      current.forEach((item) => item.stream.getTracks().forEach((track) => track.stop()));
      return [];
    });
    setLocalStream(null);
  }

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

      socket.on("connect_error", (err) => {
        setError(err.message || "Could not connect to signaling server");
        setStatus("error");
      });
      socket.on("disconnect", (reason) => {
        setStatus(reason === "io client disconnect" ? "left" : "reconnecting");
      });
      socket.io.on("reconnect", () => setStatus("connecting"));
      socket.on("error", ({ message }) => {
        setError(message);
        setStatus("error");
      });
      socket.on("call-ended", () => {
        stopAllMedia();
        setCallEnded(true);
        setStatus("ended");
        socket.disconnect();
      });
      socket.on("peer-left", ({ peerId }) => {
        setRemoteStreams((current) => {
          const leaving = current.find((item) => item.peerId === peerId);
          leaving?.stream.getTracks().forEach((track) => track.stop());
          return current.filter((item) => item.peerId !== peerId);
        });
      });
      socket.on("customer-return-window", ({ timeoutMs }) => {
        const minutes = Math.max(1, Math.round(timeoutMs / 60000));
        setNotice(`Customer left. Session stays open for ${minutes} minute${minutes === 1 ? "" : "s"}.`);
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

      if (!navigator.mediaDevices?.getUserMedia) {
        const isLanHttp = window.location.protocol === "http:" && !["localhost", "127.0.0.1"].includes(window.location.hostname);
        throw new Error(
          isLanHttp
            ? "Camera/microphone requires HTTPS on phone browsers. Use Chrome secure-origin flag for this LAN URL or run the HTTPS demo mode."
            : "This browser does not support camera/microphone access."
        );
      }

      setStatus("requesting-media");
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      } catch (mediaError) {
        if (["NotReadableError", "TrackStartError", "AbortError"].includes(mediaError.name)) {
          stream = createDemoMediaStream(role);
          setNotice("Camera or microphone is busy, so this participant joined with demo media.");
        } else {
          throw mediaError;
        }
      }
      localStreamRef.current = stream;
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
      const message =
        err.name === "NotAllowedError"
          ? "Camera or microphone permission was blocked. Allow access in the browser address bar, then rejoin from the invite link."
          : err.name === "NotFoundError"
            ? "No camera or microphone was found on this device."
            : err.message;
      setError(message);
      setStatus("error");
      socketRef.current?.disconnect();
    }
  }, [consumeProducer, role, sessionId, token]);

  useEffect(() => {
    join();
    return () => {
      socketRef.current?.emit("leave");
      socketRef.current?.disconnect();
      stopAllMedia();
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
    const socket = socketRef.current;
    if (socket?.connected) {
      socket.timeout(500).emit("end-call", {}, () => {
        socket.disconnect();
      });
    } else {
      socket?.disconnect();
    }
    stopAllMedia();
    setCallEnded(true);
    setStatus("ended");
  }

  return {
    socket: socketRef.current,
    localStream,
    remoteStreams,
    status,
    error,
    notice,
    callEnded,
    mediaState,
    toggleAudio: () => toggle("audio"),
    toggleVideo: () => toggle("video"),
    endCall
  };
}
