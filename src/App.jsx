import { Routes, Route, useLocation } from "react-router-dom";
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
  const location = useLocation();

  return (
    <div className="min-h-screen text-paper">
      <Navbar />
      <div key={location.pathname} className="cg-page-fade">
        <Routes location={location}>
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
    </div>
  );
}

export default App;
