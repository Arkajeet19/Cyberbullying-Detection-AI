import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
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
  if (done) return <span className="text-xs text-paper-dim cg-mono">reported</span>;
  return (
    <button onClick={handleReport} className="text-xs text-paper-dim hover:text-alarm transition-colors cg-mono">
      report
    </button>
  );
}

function FlaggedTag() {
  return <span className="cg-badge cg-badge-signal">Flagged for moderation</span>;
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
        className="cg-input w-full h-16 p-2 text-sm resize-none"
      />
      {error && <p className="text-alarm text-xs mt-1">{error}</p>}
      <button
        type="submit"
        disabled={posting || !content.trim()}
        className="cg-btn cg-btn-quiet mt-2 px-4 py-1.5 text-xs"
      >
        {posting ? "Posting..." : "Reply"}
      </button>
    </form>
  );
}

function Comment({ comment, replies, onReply }) {
  const [showReplyForm, setShowReplyForm] = useState(false);

  return (
    <div className="cg-panel p-4">
      <div className="flex items-center justify-between mb-1.5">
        <span className="cg-mono text-xs text-paper-dim">@{comment.username}</span>
        {comment.flagged === 1 && <FlaggedTag />}
      </div>
      <p className="text-paper text-sm mb-2">{comment.content}</p>
      <div className="flex items-center gap-4">
        <button
          onClick={() => setShowReplyForm((s) => !s)}
          className="text-xs text-paper-dim hover:text-signal transition-colors cg-mono"
        >
          reply
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
        <div className="mt-3 ml-5 space-y-3 border-l border-panel-line pl-4">
          {replies.map((reply) => (
            <div key={reply.id}>
              <div className="flex items-center justify-between mb-1">
                <span className="cg-mono text-xs text-paper-dim">@{reply.username}</span>
                {reply.flagged === 1 && <FlaggedTag />}
              </div>
              <p className="text-paper text-sm mb-1">{reply.content}</p>
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
    return <div className="max-w-2xl mx-auto px-6 py-20 text-center text-paper-dim">Loading...</div>;
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
    <div className="max-w-2xl mx-auto px-6 py-16">
      <Link to="/forum" className="text-signal text-sm hover:underline mb-6 inline-block cg-mono">
        ← back to forum
      </Link>

      <div className="cg-panel p-5 mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="cg-mono text-xs text-paper-dim">@{post.username}</span>
          {post.flagged === 1 && <FlaggedTag />}
        </div>
        <p className="text-paper mb-3 text-sm">{post.content}</p>
        <ReportButton targetType="post" targetId={post.id} />
      </div>

      <h2 className="text-sm text-paper-dim mb-4 cg-mono">comments</h2>

      {user ? (
        <div className="mb-6">
          <CommentForm onSubmit={handleTopLevelComment} />
        </div>
      ) : (
        <p className="text-paper-dim text-sm mb-6">
          <Link to="/login" className="text-signal hover:underline">Log in</Link> to comment.
        </p>
      )}

      <div className="space-y-3">
        {topLevel.length === 0 ? (
          <p className="text-paper-dim text-sm">No comments yet.</p>
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
