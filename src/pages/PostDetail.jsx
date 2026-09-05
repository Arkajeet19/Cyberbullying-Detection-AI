import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { AlertTriangle, Flag, CornerDownRight } from "lucide-react";
import { fetchPost, createComment, reportContent } from "../api";
import { useAuth } from "../context/AuthContext";

function ReportButton({ targetType, targetId }) {
  const [done, setDone] = useState(false);
  const handleReport = async () => {
    const reason = window.prompt("Why are you reporting this? (optional)") || "";
    try {
      await reportContent(targetType, targetId, reason);
      setDone(true);
    } catch (err) {
      console.error(err);
    }
  };
  if (done) return <span className="text-xs text-slate-500">Reported</span>;
  return (
    <button
      onClick={handleReport}
      className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-400 transition-colors"
    >
      <Flag size={12} /> Report
    </button>
  );
}

function FlaggedTag() {
  return (
    <span className="flex items-center gap-1 text-amber-400 text-xs bg-amber-500/10 px-2 py-1 rounded">
      <AlertTriangle size={12} /> Flagged for moderation
    </span>
  );
}

function CommentForm({ onSubmit, placeholder = "Write a comment..." }) {
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    try {
      setPosting(true);
      setError("");
      await onSubmit(content);
      setContent("");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to submit.");
    } finally {
      setPosting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-2">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        className="w-full h-16 bg-slate-800 rounded-lg p-2 border border-slate-700 focus:outline-none focus:border-blue-500 resize-none text-sm"
      />
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
      <button
        type="submit"
        disabled={posting || !content.trim()}
        className="mt-2 bg-blue-600 hover:bg-blue-700 px-4 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
      >
        {posting ? "Posting..." : "Reply"}
      </button>
    </form>
  );
}

function Comment({ comment, replies, onReply }) {
  const [showReplyForm, setShowReplyForm] = useState(false);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-semibold text-slate-300">@{comment.username}</span>
        {comment.flagged === 1 && <FlaggedTag />}
      </div>
      <p className="text-slate-200 text-sm mb-2">{comment.content}</p>
      <div className="flex items-center gap-4">
        <button
          onClick={() => setShowReplyForm((s) => !s)}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-blue-400"
        >
          <CornerDownRight size={12} /> Reply
        </button>
        <ReportButton targetType="comment" targetId={comment.id} />
      </div>
      {showReplyForm && (
        <CommentForm
          placeholder={`Reply to @${comment.username}...`}
          onSubmit={async (content) => {
            await onReply(content, comment.id);
            setShowReplyForm(false);
          }}
        />
      )}

      {replies.length > 0 && (
        <div className="mt-3 ml-6 space-y-3 border-l-2 border-slate-800 pl-4">
          {replies.map((reply) => (
            <div key={reply.id}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-slate-300">@{reply.username}</span>
                {reply.flagged === 1 && <FlaggedTag />}
              </div>
              <p className="text-slate-200 text-sm mb-1">{reply.content}</p>
              <ReportButton targetType="comment" targetId={reply.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PostDetail() {
  const { postId } = useParams();
  const { user } = useAuth();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);

  const load = () => {
    fetchPost(postId).then((data) => {
      setPost(data.post);
      setComments(data.comments);
    }).catch((err) => console.error(err));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const handleTopLevelComment = async (content) => {
    await createComment(postId, content);
    load();
  };

  const handleReply = async (content, parentCommentId) => {
    await createComment(postId, content, parentCommentId);
    load();
  };

  if (!post) {
    return <div className="max-w-3xl mx-auto px-6 py-20 text-center text-slate-500">Loading...</div>;
  }

  const topLevel = comments.filter((c) => !c.parent_comment_id);
  const repliesByParent = comments.reduce((acc, c) => {
    if (c.parent_comment_id) {
      acc[c.parent_comment_id] = acc[c.parent_comment_id] || [];
      acc[c.parent_comment_id].push(c);
    }
    return acc;
  }, {});

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <Link to="/forum" className="text-blue-400 text-sm hover:underline mb-6 inline-block">
        ← Back to forum
      </Link>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-slate-300">@{post.username}</span>
          {post.flagged === 1 && <FlaggedTag />}
        </div>
        <p className="text-slate-200 mb-3">{post.content}</p>
        <ReportButton targetType="post" targetId={post.id} />
      </div>

      <h2 className="text-lg font-semibold mb-4">Comments</h2>

      {user ? (
        <div className="mb-6">
          <CommentForm onSubmit={handleTopLevelComment} />
        </div>
      ) : (
        <p className="text-slate-500 text-sm mb-6">
          <Link to="/login" className="text-blue-400 hover:underline">Log in</Link> to comment.
        </p>
      )}

      <div className="space-y-3">
        {topLevel.length === 0 ? (
          <p className="text-slate-500 text-sm">No comments yet.</p>
        ) : (
          topLevel.map((comment) => (
            <Comment
              key={comment.id}
              comment={comment}
              replies={repliesByParent[comment.id] || []}
              onReply={handleReply}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default PostDetail;
