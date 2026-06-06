import pandas as pd
import joblib

from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.multiclass import OneVsRestClassifier
from sklearn.svm import LinearSVC

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

X = df["text"]

y = df[LABEL_COLS]

print("Creating TF-IDF features...")

vectorizer = TfidfVectorizer(
    max_features=20000,
    ngram_range=(1,2),
    min_df=3,
    sublinear_tf=True
)

X_vec = vectorizer.fit_transform(X)

print("Training SVM...")

model = OneVsRestClassifier(
    LinearSVC(C=0.5)
)

model.fit(X_vec, y)

print("Saving model...")

joblib.dump(model, "svm_model.pkl")
joblib.dump(vectorizer, "tfidf.pkl")

print("Done!")