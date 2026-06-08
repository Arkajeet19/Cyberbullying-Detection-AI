from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import os

app = Flask(__name__)

CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

model = joblib.load(
    os.path.join(BASE_DIR, "svm_model.pkl")
)

vectorizer = joblib.load(
    os.path.join(BASE_DIR, "tfidf.pkl")
)
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


@app.route("/")
def home():

    return {
        "message": "Cyberbullying Detection API Running"
    }


@app.route("/predict", methods=["POST"])
def predict():

    data = request.get_json()

    text = data["text"]

    transformed = vectorizer.transform([text])

    prediction = model.predict(transformed)

    result = {}

    for i, label in enumerate(LABELS):

        result[label] = int(prediction[0][i])

    return jsonify(result)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)