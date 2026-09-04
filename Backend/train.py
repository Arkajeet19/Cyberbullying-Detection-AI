import numpy as np
import pandas as pd
import joblib

from scipy.sparse import hstack
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.multiclass import OneVsRestClassifier
from sklearn.svm import LinearSVC
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import precision_recall_curve, classification_report

from preprocess import clean_text

LABEL_COLS = [
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

print("Loading dataset...")

df = pd.read_csv("cyberbullying.csv")
df = df[df["text"].notnull()]
df = df.reset_index(drop=True)

print("Cleaning text...")
X_text = df["text"].apply(clean_text)
y = df[LABEL_COLS].values

X_train, X_val, y_train, y_val = train_test_split(
    X_text, y, test_size=0.15, random_state=42
)

print("Creating TF-IDF features (word + char n-grams)...")

word_vectorizer = TfidfVectorizer(
    max_features=20000,
    ngram_range=(1, 2),
    min_df=3,
    sublinear_tf=True
)

# No max_features cap here previously -- character 3-5-grams over 684K rows
# produces an enormous vocabulary, which is a large part of what blew up
# memory during calibration. Capping it keeps the matrix a manageable size
# without meaningfully hurting the misspelling/leetspeak robustness this
# vectorizer exists for.
char_vectorizer = TfidfVectorizer(
    analyzer="char_wb",
    ngram_range=(3, 5),
    min_df=3,
    max_features=30000,
    sublinear_tf=True
)

X_train_word = word_vectorizer.fit_transform(X_train)
X_train_char = char_vectorizer.fit_transform(X_train)
X_train_vec = hstack([X_train_word, X_train_char]).tocsr()

X_val_word = word_vectorizer.transform(X_val)
X_val_char = char_vectorizer.transform(X_val)
X_val_vec = hstack([X_val_word, X_val_char]).tocsr()

print("Training calibrated SVM (this takes longer than before -- each label's SVM is now fit 3x for calibration)...")

# CalibratedClassifierCV fits the base LinearSVC on cv-1 folds and fits a
# sigmoid (Platt scaling) mapping decision_function() scores -> P(label=1)
# on the held-out fold. Without this, LinearSVC has no predict_proba at all --
# decision_function() is an unbounded score, not a probability, and treating
# it as one (e.g. showing raw scores as "confidence") would be dishonest.
base_svm = LinearSVC(C=0.5, class_weight="balanced")
calibrated_svm = CalibratedClassifierCV(estimator=base_svm, method="sigmoid", cv=3)

# n_jobs=-1 previously tried to fit all 13 labels x 3 CV folds in parallel
# at once, each holding its own copy of the ~684K-row sparse matrix in RAM --
# that's what caused the ArrayMemoryError. n_jobs=2 keeps some parallelism
# without exhausting memory on a typical machine. Drop to n_jobs=1
# (fully sequential, slower but safest) if this still runs out of memory.
model = OneVsRestClassifier(calibrated_svm, n_jobs=2)
model.fit(X_train_vec, y_train)

print("Tuning per-label decision thresholds on validation set (using calibrated probabilities)...")

val_probs = model.predict_proba(X_val_vec)
thresholds = {}

for i, label in enumerate(LABEL_COLS):
    precisions, recalls, thresh_vals = precision_recall_curve(
        y_val[:, i], val_probs[:, i]
    )
    f1_scores = np.divide(
        2 * precisions * recalls,
        precisions + recalls,
        out=np.zeros_like(precisions),
        where=(precisions + recalls) != 0
    )
    best_idx = np.argmax(f1_scores[:-1]) if len(thresh_vals) > 0 else None
    # Thresholds are now probabilities (0-1), not raw decision_function scores.
    thresholds[label] = float(thresh_vals[best_idx]) if best_idx is not None else 0.5

print("Chosen thresholds (probability cutoffs):", thresholds)

print("Validation report at tuned thresholds:")
val_pred = (val_probs > np.array([thresholds[l] for l in LABEL_COLS])).astype(int)
print(classification_report(y_val, val_pred, target_names=LABEL_COLS, zero_division=0))

print("Saving model, vectorizers, and thresholds...")

joblib.dump(model, "svm_model.pkl")
joblib.dump(word_vectorizer, "tfidf_word.pkl")
joblib.dump(char_vectorizer, "tfidf_char.pkl")
joblib.dump(thresholds, "thresholds.pkl")

print("Done!")