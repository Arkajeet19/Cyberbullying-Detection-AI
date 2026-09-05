import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MessageSquare, AlertTriangle } from "lucide-react";
import { fetchPosts, createPost } from "../api";
import { useAuth } from "../context/AuthContext";

function Forum() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");

  const loadPosts = () => {
    fetchPosts().then((data) => setPosts(data.items)).catch((err) => console.error(err));
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const handlePost = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    try {
      setPosting(true);
      setError("");
      await createPost(content);
      setContent("");
      loadPosts();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to post.");
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-4xl font-extrabold mb-8">Forum</h1>

      {user ? (
        <form onSubmit={handlePost} className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-8">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share something with the community..."
            className="w-full h-24 bg-slate-800 rounded-lg p-3 border border-slate-700 focus:outline-none focus:border-blue-500 resize-none text-sm"
          />
          {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
          <button
            type="submit"
            disabled={posting || !content.trim()}
            className="mt-3 bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
          >
            {posting ? "Posting..." : "Post"}
          </button>
        </form>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-8 text-center text-slate-400 text-sm">
          <Link to="/login" className="text-blue-400 hover:underline">Log in</Link> to post or comment.
        </div>
      )}

      <div className="space-y-4">
        {posts.length === 0 ? (
          <p className="text-slate-500 text-center py-10">No posts yet — be the first.</p>
        ) : (
          posts.map((post) => (
            <Link
              key={post.id}
              to={`/forum/${post.id}`}
              className="block bg-slate-900 border border-slate-800 hover:border-blue-600/50 rounded-xl p-5 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-300">@{post.username}</span>
                {post.flagged === 1 && (
                  <span className="flex items-center gap-1 text-amber-400 text-xs bg-amber-500/10 px-2 py-1 rounded">
                    <AlertTriangle size={12} /> Flagged for moderation
                  </span>
                )}
              </div>
              <p className="text-slate-200 mb-3">{post.content}</p>
              <div className="flex items-center gap-1 text-slate-500 text-xs">
                <MessageSquare size={14} /> {post.comment_count} comments
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

export default Forum;
