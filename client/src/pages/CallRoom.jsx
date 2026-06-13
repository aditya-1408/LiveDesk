import { useLocation, useNavigate, useParams } from "react-router-dom";
import { decodeToken, getStoredToken } from "../api.js";
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
  const token = location.state?.token || getStoredToken();
  const tokenPayload = decodeToken(token);
  const role = location.state?.role || tokenPayload?.role || null;
  const invalidRoomAccess =
    !token ||
    !role ||
    (role === "customer" && tokenPayload?.sessionId !== sessionId);
  const call = useMediasoup({ sessionId, role, token });

  if (invalidRoomAccess) {
    return (
      <main className="auth-page">
        <section className="panel auth-form">
          <h1>Join from invite</h1>
          <p>This room link needs a valid agent login or a customer invite token. Open the customer share link that starts with `/join/`, or sign in as the agent first.</p>
          <button onClick={() => navigate("/login")}>Agent login</button>
        </section>
      </main>
    );
  }

  return (
    <main className="call-room">
      <section className="call-stage">
        <header className="call-header">
          <div>
            <h1>Support session</h1>
            <p>{role} · {sessionId}</p>
          </div>
          <ConnectionStatus status={call.status} error={call.error} notice={call.notice} callEnded={call.callEnded} />
        </header>
        <div className="video-grid">
          {call.localStream && <VideoTile stream={call.localStream} label={role} muted isLocal />}
          {call.remoteStreams.map((remote) => <VideoTile key={remote.peerId} stream={remote.stream} label="remote participant" />)}
          {!call.localStream && (
            <div className="empty-video">
              {call.error || (call.status === "requesting-media" ? "Allow camera and microphone access..." : "Connecting to the support session...")}
            </div>
          )}
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
