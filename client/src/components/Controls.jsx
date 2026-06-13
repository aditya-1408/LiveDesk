export default function Controls({ role, mediaState, onAudio, onVideo, onEnd }) {
  return (
    <div className="controls">
      <button onClick={onAudio}>{mediaState.audio ? "Mute" : "Unmute"}</button>
      <button onClick={onVideo}>{mediaState.video ? "Camera off" : "Camera on"}</button>
      <button className="danger" onClick={onEnd}>{role === "agent" ? "End session" : "End call"}</button>
    </div>
  );
}
