import os
from functools import wraps

from flask import Flask, request, jsonify
from flask_cors import CORS
from scipy.sparse import hstack
import joblib

from preprocess import clean_text
import database

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

model = joblib.load(os.path.join(BASE_DIR, "svm_model.pkl"))
word_vectorizer = joblib.load(os.path.join(BASE_DIR, "tfidf_word.pkl"))
char_vectorizer = joblib.load(os.path.join(BASE_DIR, "tfidf_char.pkl"))
thresholds = joblib.load(os.path.join(BASE_DIR, "thresholds.pkl"))

database.init_db()

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
THRESHOLD_VALUES = [thresholds.get(label, 0.0) for label in LABELS]

# Simple shared-secret admin auth. Fine for a portfolio deployment; swap for
# real user accounts/JWT if this ever needs to serve more than one admin.
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
    scores = model.decision_function(features)[0]
    return {label: int(scores[i] > THRESHOLD_VALUES[i]) for i, label in enumerate(LABELS)}


@app.route("/")
def home():
    return {"message": "CyberGuard API running", "version": "2.0"}


# --- Core moderation -------------------------------------------------------

@app.route("/api/moderate", methods=["POST"])
def moderate():
    data = request.get_json(silent=True) or {}
    text = data.get("text", "")

    if not text or not text.strip():
        return jsonify({"error": "text is required"}), 400

    labels = classify(text)
    log_id = database.log_moderation(text, labels)

    return jsonify({"id": log_id, "labels": labels})


# Kept for backward compatibility with the old frontend build.
@app.route("/predict", methods=["POST"])
def predict_legacy():
    return moderate()


# --- History -----------------------------------------------------------

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


# --- Analytics -----------------------------------------------------------

@app.route("/api/stats", methods=["GET"])
def stats():
    return jsonify(database.get_stats())


# --- Admin -----------------------------------------------------------------

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


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
