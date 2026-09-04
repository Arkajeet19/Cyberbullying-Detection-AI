import numpy as np
import pandas as pd
import joblib

from scipy.sparse import hstack
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.multiclass import OneVsRestClassifier
from sklearn.svm import LinearSVC
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

# Word-level: captures vocabulary/phrasing.
word_vectorizer = TfidfVectorizer(
    max_features=20000,
    ngram_range=(1, 2),
    min_df=3,
    sublinear_tf=True
)

# Char-level: robust to leetspeak, misspellings, slur variants that
# word-level TF-IDF can't see because it never encountered that exact token.
char_vectorizer = TfidfVectorizer(
    analyzer="char_wb",
    ngram_range=(3, 5),
    min_df=3,
    sublinear_tf=True
)

X_train_word = word_vectorizer.fit_transform(X_train)
X_train_char = char_vectorizer.fit_transform(X_train)
X_train_vec = hstack([X_train_word, X_train_char]).tocsr()

X_val_word = word_vectorizer.transform(X_val)
X_val_char = char_vectorizer.transform(X_val)
X_val_vec = hstack([X_val_word, X_val_char]).tocsr()

print("Training SVM...")

# class_weight='balanced' reweights the loss inversely to class frequency,
# so common labels (e.g. not_cyberbullying) stop dominating the boundary.
model = OneVsRestClassifier(
    LinearSVC(C=0.5, class_weight="balanced")
)

model.fit(X_train_vec, y_train)

print("Tuning per-label decision thresholds on validation set...")

val_scores = model.decision_function(X_val_vec)
thresholds = {}

for i, label in enumerate(LABEL_COLS):
    precisions, recalls, thresh_vals = precision_recall_curve(
        y_val[:, i], val_scores[:, i]
    )
    # Maximize F1 per label instead of using the default 0.0 cutoff.
    f1_scores = np.divide(
        2 * precisions * recalls,
        precisions + recalls,
        out=np.zeros_like(precisions),
        where=(precisions + recalls) != 0
    )
    best_idx = np.argmax(f1_scores[:-1]) if len(thresh_vals) > 0 else None
    thresholds[label] = float(thresh_vals[best_idx]) if best_idx is not None else 0.0

print("Chosen thresholds:", thresholds)

print("Validation report at tuned thresholds:")
val_pred = (val_scores > np.array([thresholds[l] for l in LABEL_COLS])).astype(int)
print(classification_report(y_val, val_pred, target_names=LABEL_COLS, zero_division=0))

print("Saving model, vectorizers, and thresholds...")

joblib.dump(model, "svm_model.pkl")
joblib.dump(word_vectorizer, "tfidf_word.pkl")
joblib.dump(char_vectorizer, "tfidf_char.pkl")
joblib.dump(thresholds, "thresholds.pkl")

print("Done!")