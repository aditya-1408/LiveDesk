import { useEffect, useRef } from "react";

export default function VideoTile({ stream, label, muted = false, isLocal = false }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) videoRef.current.srcObject = stream;
  }, [stream]);

  return (
    <div className="video-tile">
      <video ref={videoRef} autoPlay playsInline muted={muted} />
      <div className="video-label">{label}{isLocal ? " (you)" : ""}</div>
    </div>
  );
}
