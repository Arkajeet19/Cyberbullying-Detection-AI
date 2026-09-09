import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
    <div className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="font-display text-4xl mb-8">Forum</h1>

      {user ? (
        <form onSubmit={handlePost} className="cg-panel p-5 mb-8">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share something with the community..."
            className="cg-input w-full h-20 p-3 text-sm resize-none"
          />
          {error && <p className="text-alarm text-xs mt-2">{error}</p>}
          <button
            type="submit"
            disabled={posting || !content.trim()}
            className="cg-btn cg-btn-signal mt-3 px-5 py-2 text-sm"
          >
            {posting ? "Posting..." : "Post"}
          </button>
        </form>
      ) : (
        <div className="cg-panel p-5 mb-8 text-center text-paper-dim text-sm">
          <Link to="/login" className="text-signal hover:underline">Log in</Link> to post or comment.
        </div>
      )}

      <div className="space-y-3">
        {posts.length === 0 ? (
          <p className="text-paper-dim text-center py-10 text-sm">No posts yet — be the first.</p>
        ) : (
          posts.map((post, i) => (
            <Link
              key={post.id}
              to={`/forum/${post.id}`}
              className="block cg-panel p-5 hover:border-signal/40 transition-colors cg-reveal"
              style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="cg-mono text-xs text-paper-dim">@{post.username}</span>
                {post.flagged === 1 && (
                  <span className="cg-badge cg-badge-signal">Flagged for moderation</span>
                )}
              </div>
              <p className="text-paper mb-3 text-sm">{post.content}</p>
              <div className="text-paper-dim text-xs cg-mono">
                {post.comment_count} comments
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

export default Forum;
