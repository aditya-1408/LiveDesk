import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import AgentDashboard from "./pages/AgentDashboard.jsx";
import AgentLogin from "./pages/AgentLogin.jsx";
import JoinSession from "./pages/JoinSession.jsx";
import CallRoom from "./pages/CallRoom.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import Signup from "./pages/Signup.jsx";
import CallEnded from "./pages/CallEnded.jsx";

function RequireRole({ roles, children }) {
  const { user } = useAuth();
  return roles.includes(user?.role) ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<AgentLogin />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/ended" element={<CallEnded />} />
      <Route path="/dashboard" element={<RequireRole roles={["agent", "admin"]}><AgentDashboard /></RequireRole>} />
      <Route path="/admin" element={<RequireRole roles={["admin"]}><AdminDashboard /></RequireRole>} />
      <Route path="/join/:token" element={<JoinSession />} />
      <Route path="/room/:sessionId" element={<CallRoom />} />
    </Routes>
  );
}
