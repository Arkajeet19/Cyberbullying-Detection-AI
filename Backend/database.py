"""
Lightweight SQLite persistence for CyberGuard.

Keeping this to sqlite3 (stdlib, no extra dependency) is intentional --
this is a demo/portfolio deployment on a small Render instance, not a
system that needs to survive concurrent writes at scale. If this ever
needs to handle real traffic, swap this module for Postgres + SQLAlchemy
without touching app.py's call sites.
"""

import sqlite3
import os
import json
from datetime import datetime, timezone
from contextlib import contextmanager

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cyberguard.db")


def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS moderation_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            text TEXT NOT NULL,
            labels TEXT NOT NULL,
            flagged INTEGER NOT NULL,
            reviewed INTEGER NOT NULL DEFAULT 0,
            admin_note TEXT,
            created_at TEXT NOT NULL
        )
        """
    )
    conn.commit()
    conn.close()


@contextmanager
def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def log_moderation(text, labels):
    """Stores one moderation result. labels is a dict of
    {label: {"flagged": 0/1, "confidence": float}}. Returns the new row's id."""
    flagged = int(any(
        v["flagged"] == 1 for k, v in labels.items() if k != "not_cyberbullying"
    ))
    with get_conn() as conn:
        cur = conn.execute(
            "INSERT INTO moderation_logs (text, labels, flagged, reviewed, created_at) "
            "VALUES (?, ?, ?, 0, ?)",
            (text, json.dumps(labels), flagged, datetime.now(timezone.utc).isoformat()),
        )
        conn.commit()
        return cur.lastrowid


def get_history(page=1, per_page=20):
    page = max(1, page)
    per_page = min(max(1, per_page), 100)
    offset = (page - 1) * per_page
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM moderation_logs ORDER BY id DESC LIMIT ? OFFSET ?",
            (per_page, offset),
        ).fetchall()
        total = conn.execute("SELECT COUNT(*) AS c FROM moderation_logs").fetchone()["c"]

    items = []
    for r in rows:
        item = dict(r)
        item["labels"] = json.loads(item["labels"])
        items.append(item)

    return items, total


def get_stats():
    with get_conn() as conn:
        total = conn.execute("SELECT COUNT(*) AS c FROM moderation_logs").fetchone()["c"]
        flagged = conn.execute(
            "SELECT COUNT(*) AS c FROM moderation_logs WHERE flagged = 1"
        ).fetchone()["c"]
        label_rows = conn.execute("SELECT labels FROM moderation_logs").fetchall()
        timeline_rows = conn.execute(
            """
            SELECT substr(created_at, 1, 10) AS day,
                   COUNT(*) AS total,
                   SUM(flagged) AS flagged
            FROM moderation_logs
            GROUP BY day
            ORDER BY day DESC
            LIMIT 14
            """
        ).fetchall()

    label_counts = {}
    for r in label_rows:
        labels = json.loads(r["labels"])
        for k, v in labels.items():
            if v["flagged"] == 1:
                label_counts[k] = label_counts.get(k, 0) + 1

    timeline = [
        {"day": r["day"], "total": r["total"], "flagged": r["flagged"] or 0}
        for r in reversed(timeline_rows)
    ]

    return {
        "total_moderated": total,
        "total_flagged": flagged,
        "flagged_rate": round(flagged / total, 4) if total else 0.0,
        "label_counts": label_counts,
        "timeline": timeline,
    }


def get_review_queue(limit=50):
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM moderation_logs WHERE flagged = 1 AND reviewed = 0 "
            "ORDER BY id DESC LIMIT ?",
            (limit,),
        ).fetchall()

    items = []
    for r in rows:
        item = dict(r)
        item["labels"] = json.loads(item["labels"])
        items.append(item)
    return items


def review_log(log_id, admin_note=""):
    with get_conn() as conn:
        cur = conn.execute(
            "UPDATE moderation_logs SET reviewed = 1, admin_note = ? WHERE id = ?",
            (admin_note, log_id),
        )
        conn.commit()
        return cur.rowcount > 0
