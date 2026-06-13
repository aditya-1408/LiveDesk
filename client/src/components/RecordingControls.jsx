import { useEffect, useRef, useState } from "react";
import { api, downloadBlob } from "../api.js";

function createSourceVideo(stream) {
  const video = document.createElement("video");
  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;
  video.autoplay = true;
  video.play().catch(() => {});
  return video;
}

function drawCover(ctx, video, x, y, width, height) {
  const videoWidth = video.videoWidth || 16;
  const videoHeight = video.videoHeight || 9;
  const scale = Math.max(width / videoWidth, height / videoHeight);
  const drawWidth = videoWidth * scale;
  const drawHeight = videoHeight * scale;
  const drawX = x + (width - drawWidth) / 2;
  const drawY = y + (height - drawHeight) / 2;
  ctx.drawImage(video, drawX, drawY, drawWidth, drawHeight);
}

function createSessionRecordingStream(localStream, remoteStreams) {
  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext("2d");
  const sourceStreams = [
    { label: "Agent", stream: localStream },
    ...remoteStreams.map((item, index) => ({ label: index === 0 ? "Customer" : `Remote ${index + 1}`, stream: item.stream }))
  ].filter((item) => item.stream);
  const videos = sourceStreams.map((item) => ({ ...item, video: createSourceVideo(item.stream) }));

  let frameId = null;
  function draw() {
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const columns = videos.length > 1 ? 2 : 1;
    const rows = Math.ceil(Math.max(videos.length, 1) / columns);
    const tileWidth = canvas.width / columns;
    const tileHeight = canvas.height / rows;

    videos.forEach((item, index) => {
      const x = (index % columns) * tileWidth;
      const y = Math.floor(index / columns) * tileHeight;
      ctx.fillStyle = "#111827";
      ctx.fillRect(x, y, tileWidth, tileHeight);
      if (item.stream.getVideoTracks().length && item.video.readyState >= 2) {
        drawCover(ctx, item.video, x, y, tileWidth, tileHeight);
      } else {
        ctx.fillStyle = "#1f2937";
        ctx.fillRect(x, y, tileWidth, tileHeight);
        ctx.fillStyle = "#e5e7eb";
        ctx.font = "700 34px system-ui, sans-serif";
        ctx.fillText("Camera off", x + 36, y + tileHeight / 2);
      }
      ctx.fillStyle = "rgba(15, 23, 42, 0.78)";
      ctx.fillRect(x + 24, y + tileHeight - 72, 210, 48);
      ctx.fillStyle = "#ffffff";
      ctx.font = "700 24px system-ui, sans-serif";
      ctx.fillText(item.label, x + 42, y + tileHeight - 40);
    });

    frameId = requestAnimationFrame(draw);
  }
  draw();

  const outputStream = canvas.captureStream(24);
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  let audioContext = null;
  if (AudioContextClass) {
    audioContext = new AudioContextClass();
    const destination = audioContext.createMediaStreamDestination();
    for (const item of sourceStreams) {
      const audioTracks = item.stream.getAudioTracks();
      if (!audioTracks.length) continue;
      const audioOnlyStream = new MediaStream(audioTracks);
      const source = audioContext.createMediaStreamSource(audioOnlyStream);
      source.connect(destination);
    }
    destination.stream.getAudioTracks().forEach((track) => outputStream.addTrack(track));
  }

  return {
    stream: outputStream,
    cleanup() {
      if (frameId) cancelAnimationFrame(frameId);
      videos.forEach((item) => {
        item.video.pause();
        item.video.srcObject = null;
      });
      audioContext?.close().catch(() => {});
      outputStream.getTracks().forEach((track) => track.stop());
    }
  };
}

export default function RecordingControls({ sessionId, token, localStream, remoteStreams }) {
  const [status, setStatus] = useState("idle");
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [error, setError] = useState("");
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const recordingCleanupRef = useRef(null);

  useEffect(() => {
    api(`/api/sessions/${sessionId}/recording`, { token })
      .then((recording) => {
        setStatus(recording.status || "idle");
        setDownloadUrl(recording.download_url);
      })
      .catch(() => {});
  }, [sessionId, token]);

  async function startRecording() {
    setError("");
    try {
      if (!localStream && !remoteStreams.length) throw new Error("No media tracks available to record");
      const recording = createSessionRecordingStream(localStream, remoteStreams);
      recordingCleanupRef.current = recording.cleanup;
      chunksRef.current = [];
      const preferredType = "video/webm;codecs=vp8,opus";
      const recorder = MediaRecorder.isTypeSupported(preferredType)
        ? new MediaRecorder(recording.stream, { mimeType: preferredType })
        : new MediaRecorder(recording.stream);
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorderRef.current = recorder;
      await api(`/api/sessions/${sessionId}/recording/start`, { method: "POST", token });
      recorder.start(1000);
      setStatus("recording");
      setDownloadUrl(null);
    } catch (err) {
      setError(err.message);
    }
  }

  async function stopRecording() {
    setError("");
    try {
      await api(`/api/sessions/${sessionId}/recording/stop`, { method: "POST", token });
      setStatus("processing");
      const recorder = recorderRef.current;
      if (!recorder) throw new Error("Recorder is not active");
      await new Promise((resolve) => {
        recorder.onstop = resolve;
        recorder.stop();
      });
      recordingCleanupRef.current?.();
      recordingCleanupRef.current = null;
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const form = new FormData();
      form.append("recording", blob, `session-${sessionId}.webm`);
      const uploaded = await api(`/api/sessions/${sessionId}/recording/upload`, {
        method: "POST",
        token,
        body: form
      });
      setStatus(uploaded.status || "ready");
      setDownloadUrl(uploaded.download_url);
    } catch (err) {
      recordingCleanupRef.current?.();
      recordingCleanupRef.current = null;
      setError(err.message);
    }
  }

  if (typeof MediaRecorder === "undefined") return null;

  return (
    <div className="recording-controls">
      <span className={`recording-pill ${status}`}>{status}</span>
      {status === "recording" ? (
        <button className="danger" onClick={stopRecording}>Stop recording</button>
      ) : (
        <button onClick={startRecording} disabled={!localStream}>Start recording</button>
      )}
      {downloadUrl && <button onClick={() => downloadBlob(downloadUrl, `session-${sessionId}.webm`, token)}>Download</button>}
      {error && <span className="inline-error">{error}</span>}
    </div>
  );
}
