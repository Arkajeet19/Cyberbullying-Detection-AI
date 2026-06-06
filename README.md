# Cyberbullying Detection AI

A full-stack machine learning web application that detects cyberbullying content from user-provided text using Natural Language Processing and Multi-Label Classification.

## Features

* Multi-label cyberbullying detection
* Real-time text analysis
* React frontend
* Flask backend
* TF-IDF feature extraction
* Linear SVM classifier
* Interactive dashboard UI

## Tech Stack

### Frontend

* React
* Vite
* Tailwind CSS
* Axios

### Backend

* Flask
* Flask-CORS
* Scikit-learn
* Pandas
* NumPy

### Machine Learning

* TF-IDF Vectorization
* Linear SVM
* Multi-label Classification

## Dataset

* 684K+ text samples
* 13 cyberbullying categories

## Project Architecture

User Input → React Frontend → Flask API → TF-IDF Vectorizer → Linear SVM Model → Prediction Results

## Installation

### Backend

```bash
cd Backend
pip install -r requirements.txt
py app.py
```

### Frontend

```bash
npm install
npm run dev
```

## Screenshots

### Home Page

![Home Page](screenshots/homepage.png)

### Prediction Example

![Prediction Result](screenshots/prediction.png)

## Author

Arkajeet
