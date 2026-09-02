import re

_WHITESPACE_RE = re.compile(r"\s+")
_URL_RE = re.compile(r"https?://\S+|www\.\S+")
_MENTION_RE = re.compile(r"@\w+")
_REPEAT_CHAR_RE = re.compile(r"(.)\1{2,}")  # e.g. "sooooo" -> "soo"


def clean_text(text: str) -> str:
    """Normalize raw text before vectorizing.

    Must be called identically at train time and inference time, or the
    vectorizer will see a different distribution than it was fit on.
    """
    if text is None:
        return ""

    text = str(text).lower()
    text = _URL_RE.sub(" ", text)
    text = _MENTION_RE.sub(" ", text)
    # collapse elongated words ("stuuupid" -> "stuupid") without destroying
    # short doubled letters ("stuff", "silly")
    text = _REPEAT_CHAR_RE.sub(r"\1\1", text)
    text = _WHITESPACE_RE.sub(" ", text).strip()
    return text