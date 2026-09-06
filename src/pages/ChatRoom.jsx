import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { fetchChatHistory } from "../api";
import { useAuth } from "../context/AuthContext";

const SOCKET_URL = "https://cyberbullying-detection-ai.onrender.com";

function formatLabel(label) {
  return label.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function SeverityTag({ severity, confidence }) {
  if (severity === "allow") return null;
  const text =
    severity === "warn"
      ? `Possible violation \u2014 ${(confidence * 100).toFixed(0)}%`
      : severity === "blur"
      ? `Likely harmful \u2014 ${(confidence * 100).toFixed(0)}%`
      : "Flagged \u2014 pending moderator review";
  const cls = severity === "flag" ? "cg-badge-alarm" : "cg-badge-signal";
  return <span className={`cg-badge ${cls}`}>{text}</span>;
}

function Message({ msg, isOwn }) {
  const [revealed, setRevealed] = useState(false);
  const isBlurred = msg.severity === "blur" && !isOwn && !revealed;

  if (msg.pending && !isOwn) {
    return (
      <div className="cg-panel p-3 opacity-60">
        <div className="flex items-center justify-between mb-1">
          <span className="cg-mono text-xs text-paper-dim">@{msg.username}</span>
          <SeverityTag severity="flag" />
        </div>
        <p className="text-paper-dim text-sm italic">Message pending moderator review.</p>
      </div>
    );
  }

  return (
    <div className="cg-panel p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="cg-mono text-xs text-paper-dim">
          @{msg.username} {isOwn && <span className="text-signal">(you)</span>}
        </span>
        <SeverityTag severity={msg.severity} confidence={msg.confidence} />
      </div>
      {isBlurred ? (
        <button
          onClick={() => setRevealed(true)}
          className="text-sm text-paper-dim italic hover:text-paper transition-colors"
          style={{ filter: "blur(4px)" }}
          onMouseEnter={(e) => (e.currentTarget.style.filter = "none")}
          onMouseLeave={(e) => (e.currentTarget.style.filter = "blur(4px)")}
        >
          {msg.content}
        </button>
      ) : (
        <p className="text-paper text-sm">{msg.content}</p>
      )}
      {msg.pending && isOwn && (
        <p className="text-paper-dim text-xs mt-1 italic">
          Only you can see this — it's pending moderator review.
        </p>
      )}
    </div>
  );
}

function ChatRoom() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    fetchChatHistory().then((data) => {
      setMessages(data.items.map((m) => ({ ...m, pending: m.severity === "flag" && m.status !== "visible" })));
    }).catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem("cg_auth_token");
    const socket = io(SOCKET_URL, { auth: { token } });
    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("new_message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on("message_sent_pending", (msg) => {
      setMessages((prev) => [...prev, { ...msg, pending: true }]);
    });

    socket.on("message_approved", (msg) => {
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...msg, pending: false } : m)));
    });

    socket.on("message_removed", ({ id }) => {
      setMessages((prev) => prev.filter((m) => m.id !== id));
    });

    return () => socket.disconnect();
  }, [user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = (e) => {
    e.preventDefault();
    if (!input.trim() || !socketRef.current) return;
    const token = localStorage.getItem("cg_auth_token");
    socketRef.current.emit("send_message", { token, content: input });
    setInput("");
  };

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-24 text-center">
        <h1 className="font-display text-3xl mb-4">Live chat</h1>
        <p className="text-paper-dim">You need an account to join the room.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-12 flex flex-col" style={{ height: "calc(100vh - 4rem)" }}>
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-3xl">Live chat</h1>
        <span className={`cg-mono text-xs ${connected ? "text-clear" : "text-paper-dim"}`}>
          {connected ? "\u25cf connected" : "\u25cb connecting..."}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 mb-4 pr-1">
        {messages.map((msg, i) => (
          <Message key={msg.id ?? i} msg={msg} isOwn={msg.username === user.username} />
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Say something..."
          className="cg-input flex-1 px-4 py-2.5 text-sm"
        />
        <button type="submit" disabled={!input.trim()} className="cg-btn cg-btn-signal px-5 py-2.5 text-sm">
          Send
        </button>
      </form>
    </div>
  );
}

export default ChatRoom;
