"""
Forum data layer -- users, posts, comments (with replies via
parent_comment_id), and reports. Shares the same SQLite file and get_conn()
pattern as database.py, but kept in its own module since it's a distinct
subject area (moderation logging vs. forum content).
"""

import sqlite3
import json
from datetime import datetime, timezone

from database import get_conn


def init_forum_db():
    with get_conn() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'active',
                warnings INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS posts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                content TEXT NOT NULL,
                labels TEXT NOT NULL,
                flagged INTEGER NOT NULL DEFAULT 0,
                status TEXT NOT NULL DEFAULT 'visible',
                reviewed INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS comments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                post_id INTEGER NOT NULL,
                parent_comment_id INTEGER,
                user_id INTEGER NOT NULL,
                content TEXT NOT NULL,
                labels TEXT NOT NULL,
                flagged INTEGER NOT NULL DEFAULT 0,
                status TEXT NOT NULL DEFAULT 'visible',
                reviewed INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                FOREIGN KEY (post_id) REFERENCES posts (id),
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                target_type TEXT NOT NULL,
                target_id INTEGER NOT NULL,
                reporter_id INTEGER NOT NULL,
                reason TEXT,
                status TEXT NOT NULL DEFAULT 'pending',
                created_at TEXT NOT NULL,
                FOREIGN KEY (reporter_id) REFERENCES users (id)
            )
            """
        )
        conn.commit()


def _now():
    return datetime.now(timezone.utc).isoformat()


# --- Users -------------------------------------------------------------

def create_user(username, password_hash):
    with get_conn() as conn:
        try:
            cur = conn.execute(
                "INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)",
                (username, password_hash, _now()),
            )
            conn.commit()
            return cur.lastrowid
        except sqlite3.IntegrityError:
            return None  # username already taken


def get_user_by_username(username):
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
    return dict(row) if row else None


def get_user_by_id(user_id):
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    return dict(row) if row else None


def set_user_status(user_id, status):
    with get_conn() as conn:
        conn.execute("UPDATE users SET status = ? WHERE id = ?", (status, user_id))
        conn.commit()


def warn_user(user_id):
    with get_conn() as conn:
        conn.execute("UPDATE users SET warnings = warnings + 1 WHERE id = ?", (user_id,))
        conn.commit()


# --- Posts -------------------------------------------------------------

def create_post(user_id, content, labels):
    flagged = int(any(
        v["flagged"] == 1 for k, v in labels.items() if k != "not_cyberbullying"
    ))
    with get_conn() as conn:
        cur = conn.execute(
            "INSERT INTO posts (user_id, content, labels, flagged, created_at) "
            "VALUES (?, ?, ?, ?, ?)",
            (user_id, content, json.dumps(labels), flagged, _now()),
        )
        conn.commit()
        return cur.lastrowid


def get_posts(page=1, per_page=20):
    per_page = min(max(1, per_page), 100)
    offset = (max(1, page) - 1) * per_page
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT posts.*, users.username, users.status AS author_status,
                   (SELECT COUNT(*) FROM comments WHERE comments.post_id = posts.id) AS comment_count
            FROM posts
            JOIN users ON users.id = posts.user_id
            WHERE posts.status != 'removed'
            ORDER BY posts.id DESC
            LIMIT ? OFFSET ?
            """,
            (per_page, offset),
        ).fetchall()
        total = conn.execute(
            "SELECT COUNT(*) AS c FROM posts WHERE status != 'removed'"
        ).fetchone()["c"]

    items = []
    for r in rows:
        item = dict(r)
        item["labels"] = json.loads(item["labels"])
        items.append(item)
    return items, total


def get_post(post_id):
    with get_conn() as conn:
        row = conn.execute(
            """
            SELECT posts.*, users.username, users.status AS author_status
            FROM posts JOIN users ON users.id = posts.user_id
            WHERE posts.id = ?
            """,
            (post_id,),
        ).fetchone()
    if not row:
        return None
    item = dict(row)
    item["labels"] = json.loads(item["labels"])
    return item


def set_post_status(post_id, status, reviewed=True):
    with get_conn() as conn:
        conn.execute(
            "UPDATE posts SET status = ?, reviewed = ? WHERE id = ?",
            (status, int(reviewed), post_id),
        )
        conn.commit()


# --- Comments (replies use parent_comment_id) ---------------------------

def create_comment(post_id, user_id, content, labels, parent_comment_id=None):
    flagged = int(any(
        v["flagged"] == 1 for k, v in labels.items() if k != "not_cyberbullying"
    ))
    with get_conn() as conn:
        cur = conn.execute(
            "INSERT INTO comments (post_id, parent_comment_id, user_id, content, "
            "labels, flagged, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (post_id, parent_comment_id, user_id, content, json.dumps(labels), flagged, _now()),
        )
        conn.commit()
        return cur.lastrowid


def get_comments_for_post(post_id):
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT comments.*, users.username, users.status AS author_status
            FROM comments JOIN users ON users.id = comments.user_id
            WHERE comments.post_id = ? AND comments.status != 'removed'
            ORDER BY comments.id ASC
            """,
            (post_id,),
        ).fetchall()

    items = []
    for r in rows:
        item = dict(r)
        item["labels"] = json.loads(item["labels"])
        items.append(item)
    return items


def set_comment_status(comment_id, status, reviewed=True):
    with get_conn() as conn:
        conn.execute(
            "UPDATE comments SET status = ?, reviewed = ? WHERE id = ?",
            (status, int(reviewed), comment_id),
        )
        conn.commit()


def get_comment(comment_id):
    with get_conn() as conn:
        row = conn.execute(
            """
            SELECT comments.*, users.username, users.status AS author_status
            FROM comments JOIN users ON users.id = comments.user_id
            WHERE comments.id = ?
            """,
            (comment_id,),
        ).fetchone()
    if not row:
        return None
    item = dict(row)
    item["labels"] = json.loads(item["labels"])
    return item


# --- Reports -------------------------------------------------------------

def create_report(target_type, target_id, reporter_id, reason):
    with get_conn() as conn:
        cur = conn.execute(
            "INSERT INTO reports (target_type, target_id, reporter_id, reason, created_at) "
            "VALUES (?, ?, ?, ?, ?)",
            (target_type, target_id, reporter_id, reason, _now()),
        )
        conn.commit()
        return cur.lastrowid


def get_pending_reports():
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM reports WHERE status = 'pending' ORDER BY id DESC"
        ).fetchall()
    return [dict(r) for r in rows]


def resolve_report(report_id):
    with get_conn() as conn:
        conn.execute("UPDATE reports SET status = 'resolved' WHERE id = ?", (report_id,))
        conn.commit()


# --- Moderation queue (flagged posts + comments awaiting review) --------

def get_forum_review_queue(limit=50):
    with get_conn() as conn:
        post_rows = conn.execute(
            """
            SELECT posts.id, 'post' AS type, posts.content, posts.labels,
                   posts.created_at, users.username, posts.user_id
            FROM posts JOIN users ON users.id = posts.user_id
            WHERE posts.flagged = 1 AND posts.reviewed = 0
            ORDER BY posts.id DESC LIMIT ?
            """,
            (limit,),
        ).fetchall()
        comment_rows = conn.execute(
            """
            SELECT comments.id, 'comment' AS type, comments.content, comments.labels,
                   comments.created_at, users.username, comments.user_id
            FROM comments JOIN users ON users.id = comments.user_id
            WHERE comments.flagged = 1 AND comments.reviewed = 0
            ORDER BY comments.id DESC LIMIT ?
            """,
            (limit,),
        ).fetchall()

    items = []
    for r in list(post_rows) + list(comment_rows):
        item = dict(r)
        item["labels"] = json.loads(item["labels"])
        items.append(item)
    items.sort(key=lambda x: x["created_at"], reverse=True)
    return items[:limit]
