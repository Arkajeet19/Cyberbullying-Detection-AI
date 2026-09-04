# CyberGuard

An AI-powered content moderation platform that classifies text into 13 categories of harmful content in real time, logs every moderation decision, and gives moderators the tools to review and act on flagged content.

Originally built as a standalone cyberbullying classifier, CyberGuard has since grown into a full platform: a persistent backend, a history log, an analytics dashboard, and an admin review queue sit on top of the same core ML model.

## Features

* Real-time multi-label text moderation across 13 categories
* Word- and character-level TF-IDF feature pipeline with a calibrated multi-label SVM classifier
* Per-label decision thresholds tuned to improve recall on under-detected categories
* Persistent moderation history — every submission is logged and timestamped
* Analytics dashboard with category-wise flag breakdowns and moderation-volume trends
* Key-authenticated admin review queue for human moderators to audit and override flagged content
* Multi-page React frontend (landing page, moderation tool, history, analytics, admin)

## Tech Stack

### Frontend

* React
* React Router
* Vite
* Tailwind CSS
* Recharts
* Axios

### Backend

* Flask
* Flask-CORS
* Scikit-learn
* SciPy
* SQLite

### Machine Learning

* Word-level + character-level TF-IDF vectorization
* Linear SVM (One-vs-Rest, multi-label, class-balanced)
* Per-label F1-maximizing threshold tuning

## Dataset

* 684K+ text samples
* 13 harmful-content categories

## Project Architecture

```
User Input → React Frontend → Flask API → TF-IDF Vectorizers → SVM Classifier → Thresholded Labels
                                    ↓
                              SQLite (moderation_logs)
                                    ↓
                   History / Analytics / Admin Review Queue
```

## API Endpoints

| Method | Endpoint                    | Description                                  |
|--------|------------------------------|-----------------------------------------------|
| POST   | `/api/moderate`              | Classify text, log the result, return labels |
| GET    | `/api/history`                | Paginated moderation history                 |
| GET    | `/api/stats`                  | Aggregate analytics (totals, category counts, 14-day timeline) |
| GET    | `/api/admin/queue`            | Flagged, unreviewed items (requires `X-Admin-Key` header) |
| POST   | `/api/admin/review/<id>`      | Mark an item reviewed, with an optional note (requires `X-Admin-Key` header) |

`POST /predict` is kept as a backward-compatible alias for `/api/moderate`.

## Installation

### Backend

```bash
cd Backend
pip install -r requirements.txt
python train.py    # generates svm_model.pkl, tfidf_word.pkl, tfidf_char.pkl, thresholds.pkl
python app.py
```

Set the `ADMIN_API_KEY` environment variable before deploying — it protects the `/api/admin/*` endpoints.

### Frontend

```bash
npm install
npm run dev
```

## Screenshots

### Home Page

(![Home Page](./screenshots/Screenshot%202026-06-06%20155246.png))

### Prediction Example

![Prediction Result](./screenshots/Screenshot%202026-06-06%20155334.png)

## Author

Arkajeet
