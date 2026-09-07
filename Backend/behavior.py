"""
User-level behavior detection.

The classifier judges one message at a time. This module looks across a
user's history instead, to answer a different question: not "is this one
message harmful" but "does this user show a pattern of repeated,
targeted harassment". That pattern is what the original project spec
called out as missing from pure per-message classification.

Risk score is a hand-built heuristic (documented below), not something
tuned against labeled ground-truth harassment-pattern data -- same
honesty caveat as the chat severity ladder in chat.py. It's a reasonable
starting point for a demo, not a validated production scoring model.
"""

from datetime import datetime, timezone, timedelta

from database import get_conn

RECENT_WINDOW_DAYS = 7

# Weights are hand-picked to keep the score in a legible 0-100 range,
# not fit against real outcome data.
FLAGGED_RATE_WEIGHT = 40    # up to 40 points for how often this user gets flagged
RECENCY_WEIGHT = 30         # up to 30 points for a recent burst of flagged content
TARGETING_WEIGHT = 30       # up to 30 points for repeatedly targeting one person

RISK_TIERS = [
    (60, "high"),
    (30, "medium"),
    (0, "low"),
]


def _tier_for(score):
    for threshold, tier in RISK_TIERS:
        if score >= threshold:
            return tier
    return "low"


def _get_user_posts(user_id):
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT id, flagged, created_at FROM posts WHERE user_id = ?",
            (user_id,),
        ).fetchall()
    return [dict(r) for r in rows]


def _get_user_comments(user_id):
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT id, post_id, parent_comment_id, flagged, created_at
            FROM comments WHERE user_id = ?
            """,
            (user_id,),
        ).fetchall()
    return [dict(r) for r in rows]


def _resolve_target(comment):
    """Who is this comment directed at? A reply targets the parent
    comment's author; a top-level comment targets the post's author."""
    with get_conn() as conn:
        if comment["parent_comment_id"]:
            row = conn.execute(
                "SELECT user_id, username FROM comments "
                "JOIN users ON users.id = comments.user_id WHERE comments.id = ?",
                (comment["parent_comment_id"],),
            ).fetchone()
        else:
            row = conn.execute(
                "SELECT user_id, username FROM posts "
                "JOIN users ON users.id = posts.user_id WHERE posts.id = ?",
                (comment["post_id"],),
            ).fetchone()
    return dict(row) if row else None


def compute_risk(user_id):
    posts = _get_user_posts(user_id)
    comments = _get_user_comments(user_id)
    all_content = posts + comments

    total = len(all_content)
    if total == 0:
        return {
            "total_content": 0, "flagged_count": 0, "flagged_rate": 0.0,
            "recent_flagged": 0, "targets": [], "risk_score": 0, "risk_tier": "low",
        }

    flagged = [c for c in all_content if c["flagged"] == 1]
    flagged_rate = len(flagged) / total

    cutoff = datetime.now(timezone.utc) - timedelta(days=RECENT_WINDOW_DAYS)
    recent_flagged = [
        c for c in flagged
        if datetime.fromisoformat(c["created_at"]) > cutoff
    ]

    # Targeting: only comments have a resolvable target (posts don't target
    # anyone specifically). Count flagged comments per target user.
    target_counts = {}
    for c in comments:
        if c["flagged"] != 1:
            continue
        target = _resolve_target(c)
        if not target:
            continue
        key = target["user_id"]
        if key not in target_counts:
            target_counts[key] = {"username": target["username"], "count": 0}
        target_counts[key]["count"] += 1

    targets = sorted(target_counts.values(), key=lambda t: t["count"], reverse=True)
    max_single_target = targets[0]["count"] if targets else 0

    flagged_rate_score = min(flagged_rate, 1.0) * FLAGGED_RATE_WEIGHT
    # Dampen by sample size: a single flagged post out of one total isn't
    # meaningful evidence of a pattern the way 4 flagged out of 5 is.
    # Without this, a brand-new user with one borderline post could score
    # the same as someone with a real sustained pattern.
    sample_confidence = min(total / 5, 1.0)
    flagged_rate_score *= sample_confidence

    recency_score = min(len(recent_flagged) / 5, 1.0) * RECENCY_WEIGHT
    targeting_score = min(max_single_target / 5, 1.0) * TARGETING_WEIGHT

    risk_score = round(flagged_rate_score + recency_score + targeting_score)

    return {
        "total_content": total,
        "flagged_count": len(flagged),
        "flagged_rate": round(flagged_rate, 3),
        "recent_flagged": len(recent_flagged),
        "targets": targets[:5],
        "risk_score": risk_score,
        "risk_tier": _tier_for(risk_score),
    }


def get_all_users_risk(min_flagged=1):
    """Risk profile for every user who has at least min_flagged flagged
    content, sorted highest-risk first."""
    with get_conn() as conn:
        rows = conn.execute("SELECT id, username FROM users").fetchall()

    profiles = []
    for row in rows:
        user_id, username = row["id"], row["username"]
        risk = compute_risk(user_id)
        if risk["flagged_count"] >= min_flagged:
            profiles.append({"user_id": user_id, "username": username, **risk})

    profiles.sort(key=lambda p: p["risk_score"], reverse=True)
    return profiles
