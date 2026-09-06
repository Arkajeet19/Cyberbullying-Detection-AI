import os
from functools import wraps
from datetime import datetime, timezone

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit, disconnect
from scipy.sparse import hstack
import joblib

from preprocess import clean_text
import database
import forum
import auth
import chat

app = Flask(__name__)

CORS(app)

# threading mode needs no extra dependency (eventlet/gevent) and is fine
# for a portfolio-scale demo; a production deployment handling real
# concurrent load would want eventlet/gevent + a proper WSGI server
# instead of Flask's dev server, same caveat as the rest of this API.
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

model = joblib.load(os.path.join(BASE_DIR, "svm_model.pkl"))
word_vectorizer = joblib.load(os.path.join(BASE_DIR, "tfidf_word.pkl"))
char_vectorizer = joblib.load(os.path.join(BASE_DIR, "tfidf_char.pkl"))
thresholds = joblib.load(os.path.join(BASE_DIR, "thresholds.pkl"))

database.init_db()
forum.init_forum_db()
chat.init_chat_db()

LABELS = [
    'religious_hate',
    'ethnic_hate',
    'age_discrimination',
    'gender_hate',
    'sexual_harassment',
    'threats',
    'body_shaming',
    'political_hate',
    'trolling',
    'mental_hate',
    'discrimination',
    'other_cyberbullying_types',
    'not_cyberbullying'
]
THRESHOLD_VALUES = [thresholds.get(label, 0.5) for label in LABELS]

ADMIN_API_KEY = os.environ.get("ADMIN_API_KEY", "changeme")


def require_admin(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        key = request.headers.get("X-Admin-Key", "")
        if key != ADMIN_API_KEY:
            return jsonify({"error": "unauthorized"}), 401
        return fn(*args, **kwargs)
    return wrapper


def classify(raw_text):
    text = clean_text(raw_text)
    word_features = word_vectorizer.transform([text])
    char_features = char_vectorizer.transform([text])
    features = hstack([word_features, char_features]).tocsr()

    # predict_proba works now because train.py wraps the SVM in
    # CalibratedClassifierCV -- these are real Platt-scaled probabilities,
    # not raw decision_function scores.
    probs = model.predict_proba(features)[0]

    result = {}
    for i, label in enumerate(LABELS):
        confidence = float(probs[i])
        result[label] = {
            "flagged": int(confidence > THRESHOLD_VALUES[i]),
            "confidence": round(confidence, 4),
        }
    return result


@app.route("/")
def home():
    return {"message": "CyberGuard API running", "version": "2.1"}


@app.route("/api/moderate", methods=["POST"])
def moderate():
    data = request.get_json(silent=True) or {}
    text = data.get("text", "")

    if not text or not text.strip():
        return jsonify({"error": "text is required"}), 400

    labels = classify(text)
    log_id = database.log_moderation(text, labels)

    return jsonify({"id": log_id, "labels": labels})


@app.route("/predict", methods=["POST"])
def predict_legacy():
    return moderate()


@app.route("/api/history", methods=["GET"])
def history():
    page = request.args.get("page", default=1, type=int)
    per_page = request.args.get("per_page", default=20, type=int)
    items, total = database.get_history(page=page, per_page=per_page)
    return jsonify({
        "items": items,
        "total": total,
        "page": page,
        "per_page": per_page,
    })


@app.route("/api/stats", methods=["GET"])
def stats():
    return jsonify(database.get_stats())


@app.route("/api/admin/queue", methods=["GET"])
@require_admin
def admin_queue():
    return jsonify({"items": database.get_review_queue()})


@app.route("/api/admin/review/<int:log_id>", methods=["POST"])
@require_admin
def admin_review(log_id):
    data = request.get_json(silent=True) or {}
    note = data.get("note", "")
    ok = database.review_log(log_id, admin_note=note)
    if not ok:
        return jsonify({"error": "not found"}), 404
    return jsonify({"success": True})


# --- Auth ------------------------------------------------------------------

@app.route("/api/auth/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""

    if not username or not password:
        return jsonify({"error": "username and password are required"}), 400
    if len(password) < 6:
        return jsonify({"error": "password must be at least 6 characters"}), 400

    user_id = forum.create_user(username, auth.hash_password(password))
    if user_id is None:
        return jsonify({"error": "username already taken"}), 409

    token = auth.generate_token(user_id)
    return jsonify({"token": token, "id": user_id, "username": username, "status": "active"})


@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""

    user = forum.get_user_by_username(username)
    if not user or not auth.verify_password(password, user["password_hash"]):
        return jsonify({"error": "invalid username or password"}), 401
    if user["status"] == "banned":
        return jsonify({"error": "this account has been banned"}), 403

    token = auth.generate_token(user["id"])
    return jsonify({
        "token": token, "id": user["id"], "username": user["username"], "status": user["status"]
    })


@app.route("/api/auth/logout", methods=["POST"])
def logout():
    # Tokens are stateless (signed, not stored server-side), so there's
    # nothing to invalidate here -- the frontend just deletes its copy.
    # A production system wanting real revocation would need a token
    # blacklist or short-lived tokens with refresh; not needed for this scope.
    return jsonify({"success": True})


@app.route("/api/auth/me", methods=["GET"])
def me():
    user = auth.current_user()
    if not user:
        return jsonify({"user": None})
    return jsonify({"user": {
        "id": user["id"], "username": user["username"],
        "status": user["status"], "warnings": user["warnings"],
    }})


# --- Forum: posts ------------------------------------------------------

@app.route("/api/posts", methods=["GET"])
def list_posts():
    page = request.args.get("page", default=1, type=int)
    per_page = request.args.get("per_page", default=20, type=int)
    items, total = forum.get_posts(page=page, per_page=per_page)
    return jsonify({"items": items, "total": total, "page": page, "per_page": per_page})


@app.route("/api/posts", methods=["POST"])
@auth.login_required
def create_post():
    user = auth.current_user()
    if user["status"] == "banned":
        return jsonify({"error": "banned users cannot post"}), 403

    data = request.get_json(silent=True) or {}
    content = (data.get("content") or "").strip()
    if not content:
        return jsonify({"error": "content is required"}), 400

    labels = classify(content)
    database.log_moderation(content, labels)  # keeps it in shared history/analytics too
    post_id = forum.create_post(user["id"], content, labels)
    return jsonify(forum.get_post(post_id))


@app.route("/api/posts/<int:post_id>", methods=["GET"])
def get_post(post_id):
    post = forum.get_post(post_id)
    if not post:
        return jsonify({"error": "not found"}), 404
    comments = forum.get_comments_for_post(post_id)
    return jsonify({"post": post, "comments": comments})


# --- Forum: comments & replies -------------------------------------------

@app.route("/api/posts/<int:post_id>/comments", methods=["POST"])
@auth.login_required
def create_comment(post_id):
    user = auth.current_user()
    if user["status"] == "banned":
        return jsonify({"error": "banned users cannot comment"}), 403

    if not forum.get_post(post_id):
        return jsonify({"error": "post not found"}), 404

    data = request.get_json(silent=True) or {}
    content = (data.get("content") or "").strip()
    parent_comment_id = data.get("parent_comment_id")
    if not content:
        return jsonify({"error": "content is required"}), 400

    labels = classify(content)
    database.log_moderation(content, labels)
    comment_id = forum.create_comment(post_id, user["id"], content, labels, parent_comment_id)
    return jsonify(forum.get_comment(comment_id))


# --- Reports ---------------------------------------------------------------

@app.route("/api/report", methods=["POST"])
@auth.login_required
def report_content():
    user = auth.current_user()
    data = request.get_json(silent=True) or {}
    target_type = data.get("target_type")
    target_id = data.get("target_id")
    reason = data.get("reason", "")

    if target_type not in ("post", "comment") or not target_id:
        return jsonify({"error": "target_type ('post' or 'comment') and target_id are required"}), 400

    report_id = forum.create_report(target_type, target_id, user["id"], reason)
    return jsonify({"id": report_id, "success": True})


# --- Admin: forum moderation queue & actions -----------------------------

@app.route("/api/admin/forum-queue", methods=["GET"])
@require_admin
def admin_forum_queue():
    return jsonify({
        "items": forum.get_forum_review_queue(),
        "reports": forum.get_pending_reports(),
    })


@app.route("/api/admin/forum/<content_type>/<int:content_id>/<action>", methods=["POST"])
@require_admin
def admin_forum_action(content_type, content_id, action):
    """action: approve | remove | warn | ban -- applied to a post or comment."""
    if content_type not in ("post", "comment"):
        return jsonify({"error": "content_type must be 'post' or 'comment'"}), 400
    if action not in ("approve", "remove", "warn", "ban"):
        return jsonify({"error": "invalid action"}), 400

    if content_type == "post":
        content = forum.get_post(content_id)
    else:
        content = forum.get_comment(content_id)
    if not content:
        return jsonify({"error": "not found"}), 404

    if action == "approve":
        if content_type == "post":
            forum.set_post_status(content_id, "visible")
        else:
            forum.set_comment_status(content_id, "visible")
    elif action == "remove":
        if content_type == "post":
            forum.set_post_status(content_id, "removed")
        else:
            forum.set_comment_status(content_id, "removed")
    elif action == "warn":
        forum.warn_user(content["user_id"])
        if content_type == "post":
            forum.set_post_status(content_id, content["status"])
        else:
            forum.set_comment_status(content_id, content["status"])
    elif action == "ban":
        forum.set_user_status(content["user_id"], "banned")
        if content_type == "post":
            forum.set_post_status(content_id, content["status"])
        else:
            forum.set_comment_status(content_id, content["status"])

    return jsonify({"success": True})


# --- Chat: history + admin queue (REST) ------------------------------------

@app.route("/api/chat/history", methods=["GET"])
def chat_history():
    return jsonify({"items": chat.get_recent_messages()})


@app.route("/api/admin/chat-queue", methods=["GET"])
@require_admin
def admin_chat_queue():
    return jsonify({"items": chat.get_chat_review_queue()})


@app.route("/api/admin/chat/<int:message_id>/<action>", methods=["POST"])
@require_admin
def admin_chat_action(message_id, action):
    if action not in ("approve", "remove"):
        return jsonify({"error": "invalid action"}), 400

    message = chat.get_message(message_id)
    if not message:
        return jsonify({"error": "not found"}), 404

    if action == "approve":
        chat.set_message_status(message_id, "visible")
        # Now that a moderator has cleared it, push the real content to
        # everyone currently in the room.
        socketio.emit("message_approved", {
            "id": message["id"],
            "content": message["content"],
            "username": message["username"],
            "severity": message["severity"],
            "created_at": message["created_at"],
        }, room="chat")
    else:
        chat.set_message_status(message_id, "removed")
        socketio.emit("message_removed", {"id": message_id}, room="chat")

    return jsonify({"success": True})


# --- Chat: real-time (Socket.IO) --------------------------------------------

@socketio.on("connect")
def on_connect(auth_data):
    token = (auth_data or {}).get("token")
    user_id = auth.verify_token(token) if token else None
    if user_id is None:
        return False  # reject the connection

    from flask_socketio import join_room
    join_room("chat")


@socketio.on("send_message")
def on_send_message(data):
    token = (data or {}).get("token")
    user_id = auth.verify_token(token) if token else None
    if user_id is None:
        disconnect()
        return

    user = forum.get_user_by_id(user_id)
    if not user or user["status"] == "banned":
        return

    content = (data.get("content") or "").strip()
    if not content:
        return

    labels = classify(content)
    severity, top_confidence = chat.severity_for(labels)
    message_id = chat.create_message(user_id, content, labels, severity)
    database.log_moderation(content, labels)  # keeps chat in shared analytics too

    base_payload = {
        "id": message_id,
        "username": user["username"],
        "severity": severity,
        "confidence": round(top_confidence, 4),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    if severity == "flag":
        # Withhold the actual text from everyone except the sender; it
        # goes to the moderation queue instead. This is the chat
        # equivalent of a flagged forum post staying invisible until
        # a moderator approves it.
        emit("new_message", {**base_payload, "content": None, "pending": True}, room="chat")
        emit("message_sent_pending", {**base_payload, "content": content}, room=request.sid)
    else:
        # allow / warn / blur all broadcast the real content -- "blur"
        # is a client-side visual treatment, not server-side withholding.
        emit("new_message", {**base_payload, "content": content, "pending": False}, room="chat")


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    # allow_unsafe_werkzeug=True: same "don't use in production" caveat as
    # Flask's own dev server already carries -- fine for this portfolio
    # deployment's traffic level, not fine for real concurrent load.
    socketio.run(app, host="0.0.0.0", port=port, allow_unsafe_werkzeug=True)
