import { useEffect, useRef, useState } from "react";

export default function VideoTile({ stream, label, muted = false, isLocal = false, mediaState = { audio: true, video: true } }) {
  const videoRef = useRef(null);
  const [playbackBlocked, setPlaybackBlocked] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return undefined;

    video.srcObject = stream;
    video.muted = muted;
    video.volume = muted ? 0 : 1;
    setPlaybackBlocked(false);

    const tryPlay = () => {
      const playPromise = video.play();
      if (playPromise?.catch) {
        playPromise.catch(() => {
          if (!muted && stream.getAudioTracks().length > 0) setPlaybackBlocked(true);
        });
      }
    };

    tryPlay();
    stream.getTracks().forEach((track) => {
      track.onunmute = tryPlay;
    });

    return () => {
      stream.getTracks().forEach((track) => {
        if (track.onunmute === tryPlay) track.onunmute = null;
      });
    };
  }, [muted, stream]);

  function enablePlayback() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    video.volume = 1;
    video.play().then(() => setPlaybackBlocked(false)).catch(() => setPlaybackBlocked(true));
  }

  return (
    <div className="video-tile">
      <video ref={videoRef} autoPlay playsInline muted={muted} />
      <div className="video-label">{label}{isLocal ? " (you)" : ""}</div>
      <div className="media-badges">
        {!mediaState.audio && <span>Muted</span>}
        {!mediaState.video && <span>Camera off</span>}
      </div>
      {playbackBlocked && (
        <button type="button" className="audio-unlock" onClick={enablePlayback}>
          Tap to enable audio
        </button>
      )}
    </div>
  );
}
