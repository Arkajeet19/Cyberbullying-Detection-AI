"""
"Explain this flag" -- a small RAG pipeline that grounds a plain-language
explanation of why content was flagged in CyberGuard's actual policy text,
instead of just showing a bare confidence percentage.

Retrieval uses TF-IDF (scikit-learn, already a dependency) rather than a
neural embedding model. That's a deliberate tradeoff: sentence-transformers
+ torch would add a large memory footprint on top of the existing SVM
model and Flask-SocketIO, and Render's free tier caps around 512MB RAM.
For a ~13-document policy corpus, TF-IDF retrieval is more than adequate --
the corpus is small and the categories are lexically distinct enough that
a neural embedding model wouldn't meaningfully improve retrieval quality
here anyway.

Generation goes through LangChain (PromptTemplate + an LLM call) so the
explanation is actually generated and grounded in the retrieved passage,
not just the passage echoed back verbatim. If no LLM API key is
configured, this falls back to returning the retrieved policy passage
directly, clearly labeled as such -- the feature still works, just
without the paraphrasing/generation step.
"""

import os

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from policy_docs import POLICY_PASSAGES, GENERAL_PRINCIPLES

_categories = list(POLICY_PASSAGES.keys())
_passages = list(POLICY_PASSAGES.values())

_vectorizer = TfidfVectorizer(stop_words="english")
_passage_vectors = _vectorizer.fit_transform(_passages)

_llm_chain = None
_LLM_AVAILABLE = False

try:
    if os.environ.get("OPENAI_API_KEY"):
        from langchain_openai import ChatOpenAI
        from langchain_core.prompts import ChatPromptTemplate

        _prompt = ChatPromptTemplate.from_messages([
            ("system",
             "You are CyberGuard's moderation assistant. Explain in 2-3 plain "
             "sentences why a message was flagged, grounded strictly in the "
             "provided policy passage. Be factual and calm, never accusatory "
             "toward the message's author -- the model may be wrong, and a "
             "human moderator makes the final call."),
            ("human",
             "Flagged category: {category}\n"
             "Model confidence: {confidence}%\n"
             "Relevant policy passage:\n{policy_passage}\n\n"
             "General principles:\n{general_principles}\n\n"
             "Explain why a message might be flagged under this category."),
        ])
        _llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.3)
        _llm_chain = _prompt | _llm
        _LLM_AVAILABLE = True
except Exception:
    # Any import/config issue (missing package, bad key, etc.) just falls
    # back to extractive mode rather than crashing the whole app.
    _LLM_AVAILABLE = False


def retrieve_policy_passage(category):
    """Returns the policy passage for a category, or the closest match via
    TF-IDF cosine similarity if the exact category key isn't found."""
    if category in POLICY_PASSAGES:
        return POLICY_PASSAGES[category]

    query_vec = _vectorizer.transform([category])
    sims = cosine_similarity(query_vec, _passage_vectors)[0]
    best_idx = sims.argmax()
    return _passages[best_idx]


def explain_flag(category, confidence):
    """Returns {explanation, source, generated} for a flagged category."""
    passage = retrieve_policy_passage(category)
    confidence_pct = round(confidence * 100)

    if _LLM_AVAILABLE:
        try:
            result = _llm_chain.invoke({
                "category": category.replace("_", " "),
                "confidence": confidence_pct,
                "policy_passage": passage,
                "general_principles": GENERAL_PRINCIPLES,
            })
            return {
                "explanation": result.content,
                "source": passage,
                "generated": True,
            }
        except Exception as e:
            # LLM call failed at request time (rate limit, network, etc.) --
            # degrade gracefully instead of 500ing the whole request.
            return {
                "explanation": passage,
                "source": passage,
                "generated": False,
                "error": str(e),
            }

    return {
        "explanation": passage,
        "source": passage,
        "generated": False,
    }
