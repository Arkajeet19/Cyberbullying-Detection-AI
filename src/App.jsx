import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Landing from "./pages/Landing";
import Moderate from "./pages/Moderate";
import History from "./pages/History";
import Analytics from "./pages/Analytics";
import Admin from "./pages/Admin";
import Forum from "./pages/Forum";
import PostDetail from "./pages/PostDetail";
import ChatRoom from "./pages/ChatRoom";
import Login from "./pages/Login";
import Register from "./pages/Register";

function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Navbar />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/moderate" element={<Moderate />} />
        <Route path="/history" element={<History />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/forum" element={<Forum />} />
        <Route path="/forum/:postId" element={<PostDetail />} />
        <Route path="/chat" element={<ChatRoom />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    </div>
  );
}

export default App;
