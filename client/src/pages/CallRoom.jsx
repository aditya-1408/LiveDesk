import { useLocation, useNavigate, useParams } from "react-router-dom";
import { getStoredToken } from "../api.js";
import ChatPanel from "../components/ChatPanel.jsx";
import ConnectionStatus from "../components/ConnectionStatus.jsx";
import Controls from "../components/Controls.jsx";
import RecordingControls from "../components/RecordingControls.jsx";
import VideoTile from "../components/VideoTile.jsx";
import { useMediasoup } from "../hooks/useMediasoup.js";

export default function CallRoom() {
  const { sessionId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const role = location.state?.role || "agent";
  const token = location.state?.token || getStoredToken();
  const call = useMediasoup({ sessionId, role, token });

  return (
    <main className="call-room">
      <section className="call-stage">
        <header className="call-header">
          <div>
            <h1>Support session</h1>
            <p>{role} · {sessionId}</p>
          </div>
          <ConnectionStatus status={call.status} error={call.error} callEnded={call.callEnded} />
        </header>
        <div className="video-grid">
          {call.localStream && <VideoTile stream={call.localStream} label={role} muted isLocal />}
          {call.remoteStreams.map((remote) => <VideoTile key={remote.peerId} stream={remote.stream} label="remote participant" />)}
          {!call.localStream && <div className="empty-video">Waiting for camera permission...</div>}
        </div>
        <Controls
          role={role}
          mediaState={call.mediaState}
          onAudio={call.toggleAudio}
          onVideo={call.toggleVideo}
          onEnd={() => {
            call.endCall();
            setTimeout(() => navigate(role === "agent" ? "/dashboard" : "/"), 800);
          }}
        />
        {role === "agent" && (
          <RecordingControls
            sessionId={sessionId}
            token={token}
            localStream={call.localStream}
            remoteStreams={call.remoteStreams}
          />
        )}
      </section>
      <ChatPanel socket={call.socket} sessionId={sessionId} token={token} role={role} />
    </main>
  );
}
