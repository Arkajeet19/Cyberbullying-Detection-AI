import os
from functools import wraps

from flask import Flask, request, jsonify, session
from flask_cors import CORS
from scipy.sparse import hstack
import joblib

from preprocess import clean_text
import database
import forum
import auth

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "dev-secret-change-in-production")

# Vercel (frontend) and Render (backend) are different domains, so session
# cookies need SameSite=None + Secure to be sent cross-origin at all.
# Secure=True requires HTTPS, which breaks local http:// dev, so only
# enable it when actually running on Render (which sets RENDER=true).
IS_PRODUCTION = os.environ.get("RENDER") is not None
app.config.update(
    SESSION_COOKIE_SAMESITE="None" if IS_PRODUCTION else "Lax",
    SESSION_COOKIE_SECURE=IS_PRODUCTION,
)

CORS(app, supports_credentials=True)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

model = joblib.load(os.path.join(BASE_DIR, "svm_model.pkl"))
word_vectorizer = joblib.load(os.path.join(BASE_DIR, "tfidf_word.pkl"))
char_vectorizer = joblib.load(os.path.join(BASE_DIR, "tfidf_char.pkl"))
thresholds = joblib.load(os.path.join(BASE_DIR, "thresholds.pkl"))

database.init_db()
forum.init_forum_db()

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

    session["user_id"] = user_id
    return jsonify({"id": user_id, "username": username})


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

    session["user_id"] = user["id"]
    return jsonify({
        "id": user["id"], "username": user["username"], "status": user["status"]
    })


@app.route("/api/auth/logout", methods=["POST"])
def logout():
    session.pop("user_id", None)
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


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
