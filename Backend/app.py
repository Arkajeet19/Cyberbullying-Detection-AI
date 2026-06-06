from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib

app = Flask(__name__)

CORS(app)

model = joblib.load("svm_model.pkl")
vectorizer = joblib.load("tfidf.pkl")

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

    app.run(debug=True)