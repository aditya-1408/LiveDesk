import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import AgentDashboard from "./pages/AgentDashboard.jsx";
import AgentLogin from "./pages/AgentLogin.jsx";
import JoinSession from "./pages/JoinSession.jsx";
import CallRoom from "./pages/CallRoom.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";

function RequireAgent({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<AgentLogin />} />
      <Route path="/dashboard" element={<RequireAgent><AgentDashboard /></RequireAgent>} />
      <Route path="/admin" element={<RequireAgent><AdminDashboard /></RequireAgent>} />
      <Route path="/join/:token" element={<JoinSession />} />
      <Route path="/room/:sessionId" element={<CallRoom />} />
    </Routes>
  );
}
