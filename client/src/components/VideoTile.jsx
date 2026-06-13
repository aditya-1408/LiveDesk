import { useEffect, useRef } from "react";

export default function VideoTile({ stream, label, muted = false, isLocal = false, mediaState = { audio: true, video: true } }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) videoRef.current.srcObject = stream;
  }, [stream]);

  return (
    <div className="video-tile">
      <video ref={videoRef} autoPlay playsInline muted={muted} />
      <div className="video-label">{label}{isLocal ? " (you)" : ""}</div>
      <div className="media-badges">
        {!mediaState.audio && <span>Muted</span>}
        {!mediaState.video && <span>Camera off</span>}
      </div>
    </div>
  );
}
