"""
Real-time chat -- a single shared room all logged-in users join.

Severity is a presentation-layer bucket derived from the model's own
calibrated confidence (the max confidence across harmful categories in
a message), NOT a separately-tuned threshold. It exists to answer
"what should the UI do with this message", not "is this cyberbullying" --
that judgment still comes entirely from the per-label thresholds already
tuned in train.py.
"""

import json
from datetime import datetime, timezone

from database import get_conn

# Tuned by feel for a demo, not validated against labeled severity data --
# worth saying so if asked. A real system would want these calibrated
# against actual moderator agreement, the same way the per-label
# thresholds were tuned against precision/recall.
WARN_THRESHOLD = 0.40
BLUR_THRESHOLD = 0.70
FLAG_THRESHOLD = 0.85


def init_chat_db():
    with get_conn() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS chat_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                content TEXT NOT NULL,
                labels TEXT NOT NULL,
                severity TEXT NOT NULL,
                reviewed INTEGER NOT NULL DEFAULT 0,
                status TEXT NOT NULL DEFAULT 'visible',
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
            """
        )
        conn.commit()


def severity_for(labels):
    """labels: {category: {"flagged": 0/1, "confidence": float}}."""
    harmful_scores = [
        v["confidence"] for k, v in labels.items() if k != "not_cyberbullying"
    ]
    top = max(harmful_scores) if harmful_scores else 0.0

    if top >= FLAG_THRESHOLD:
        return "flag", top
    if top >= BLUR_THRESHOLD:
        return "blur", top
    if top >= WARN_THRESHOLD:
        return "warn", top
    return "allow", top


def create_message(user_id, content, labels, severity):
    with get_conn() as conn:
        cur = conn.execute(
            "INSERT INTO chat_messages (user_id, content, labels, severity, created_at) "
            "VALUES (?, ?, ?, ?, ?)",
            (user_id, content, json.dumps(labels), severity, datetime.now(timezone.utc).isoformat()),
        )
        conn.commit()
        return cur.lastrowid


def get_recent_messages(limit=50):
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT chat_messages.*, users.username
            FROM chat_messages JOIN users ON users.id = chat_messages.user_id
            WHERE chat_messages.status != 'removed'
            ORDER BY chat_messages.id DESC LIMIT ?
            """,
            (limit,),
        ).fetchall()

    items = []
    for r in reversed(rows):
        item = dict(r)
        item["labels"] = json.loads(item["labels"])
        items.append(item)
    return items


def get_message(message_id):
    with get_conn() as conn:
        row = conn.execute(
            """
            SELECT chat_messages.*, users.username
            FROM chat_messages JOIN users ON users.id = chat_messages.user_id
            WHERE chat_messages.id = ?
            """,
            (message_id,),
        ).fetchone()
    if not row:
        return None
    item = dict(row)
    item["labels"] = json.loads(item["labels"])
    return item


def get_chat_review_queue(limit=50):
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT chat_messages.*, users.username
            FROM chat_messages JOIN users ON users.id = chat_messages.user_id
            WHERE chat_messages.severity = 'flag' AND chat_messages.reviewed = 0
            ORDER BY chat_messages.id DESC LIMIT ?
            """,
            (limit,),
        ).fetchall()

    items = []
    for r in rows:
        item = dict(r)
        item["labels"] = json.loads(item["labels"])
        items.append(item)
    return items


def set_message_status(message_id, status, reviewed=True):
    with get_conn() as conn:
        conn.execute(
            "UPDATE chat_messages SET status = ?, reviewed = ? WHERE id = ?",
            (status, int(reviewed), message_id),
        )
        conn.commit()
