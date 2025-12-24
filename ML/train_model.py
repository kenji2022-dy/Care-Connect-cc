
import argparse
import os
import re
from collections import Counter

import joblib
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.model_selection import train_test_split
from sklearn.neighbors import KNeighborsClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix

import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer

import warnings
warnings.filterwarnings('ignore')


def download_nltk_resources():
    resources = ['punkt', 'stopwords', 'wordnet', 'omw-1.4']
    for r in resources:
        try:
            if r == 'punkt':
                nltk.data.find('tokenizers/punkt')
            else:
                nltk.data.find(f'corpora/{r}')
        except Exception:
            nltk.download(r, quiet=True)


download_nltk_resources()

lemmatizer = WordNetLemmatizer()
stop_words = set(stopwords.words('english'))


def preprocess_text(text: str) -> str:
    if not isinstance(text, str):
        return ''
    text = text.lower()
    text = re.sub(r'[^a-z\s]', ' ', text)
    tokens = nltk.word_tokenize(text)
    tokens = [t for t in tokens if t not in stop_words and len(t) > 1]
    tokens = [lemmatizer.lemmatize(t) for t in tokens]
    return ' '.join(tokens)


def clean_text(df: pd.DataFrame, column: str = 'text') -> pd.DataFrame:
    df = df.copy()
    df['clean_text'] = df[column].fillna('').astype(str).map(preprocess_text)
    return df


def train_and_save(csv_path: str, out_dir: str, sample_frac: float = 0.5):
    os.makedirs(out_dir, exist_ok=True)

    df = pd.read_csv(csv_path)
    if 'Unnamed: 0' in df.columns:
        df = df.drop(columns=['Unnamed: 0'])

    df = df.sample(frac=sample_frac, random_state=42).reset_index(drop=True)
    df = df.drop_duplicates()

    assert 'text' in df.columns and 'label' in df.columns, "CSV must have 'text' and 'label' columns"

    preprocessed_df = clean_text(df, 'text')

    # TF-IDF
    tfidf_vectorizer = TfidfVectorizer(max_features=5000, ngram_range=(1, 2))
    X = tfidf_vectorizer.fit_transform(preprocessed_df['clean_text'])
    y = df['label']

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y)

    knn = KNeighborsClassifier(n_neighbors=5, n_jobs=-1)
    knn.fit(X_train, y_train)

    preds = knn.predict(X_test)
    acc = accuracy_score(y_test, preds)
    print(f'Validation accuracy: {acc:.4f}')
    print(classification_report(y_test, preds, zero_division=0))

    # Save model and vectorizer
    model_path = os.path.join(out_dir, 'knn_model.joblib')
    vect_path = os.path.join(out_dir, 'tfidf_vectorizer.joblib')
    joblib.dump(knn, model_path)
    joblib.dump(tfidf_vectorizer, vect_path)
    print(f'Saved model -> {model_path}')
    print(f'Saved vectorizer -> {vect_path}')

    # Optional: plot and save confusion matrix (small example)
    labels = np.unique(y_test)
    cm = confusion_matrix(y_test, preds, labels=labels)
    plt.figure(figsize=(10, 8))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', xticklabels=labels, yticklabels=labels)
    plt.xlabel('Predicted')
    plt.ylabel('Actual')
    plt.title('Confusion Matrix')
    plt.tight_layout()
    cm_path = os.path.join(out_dir, 'confusion_matrix.png')
    plt.savefig(cm_path)
    print(f'Saved confusion matrix -> {cm_path}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Train symptom->disease model')
    parser.add_argument('--csv', required=True, help='Path to Symptom2Disease.csv')
    parser.add_argument('--out_dir', default='ML/models', help='Directory to save model/vectorizer')
    parser.add_argument('--sample_frac', type=float, default=0.5, help='Fraction of data to sample')
    args = parser.parse_args()
    train_and_save(args.csv, args.out_dir, args.sample_frac)
