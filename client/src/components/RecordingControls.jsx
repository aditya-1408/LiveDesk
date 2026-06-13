import { useEffect, useRef, useState } from "react";
import { api, downloadBlob } from "../api.js";

export default function RecordingControls({ sessionId, token, localStream, remoteStreams }) {
  const [status, setStatus] = useState("idle");
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [error, setError] = useState("");
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);

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
      const tracks = [
        ...(localStream?.getTracks() || []),
        ...remoteStreams.flatMap((item) => item.stream.getTracks())
      ];
      if (!tracks.length) throw new Error("No media tracks available to record");
      const mixedStream = new MediaStream(tracks);
      chunksRef.current = [];
      const preferredType = "video/webm;codecs=vp8,opus";
      const recorder = MediaRecorder.isTypeSupported(preferredType)
        ? new MediaRecorder(mixedStream, { mimeType: preferredType })
        : new MediaRecorder(mixedStream);
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
