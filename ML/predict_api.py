"""
Simple FastAPI service that loads the trained model and vectorizer and exposes
an endpoint to predict disease from a symptom string. It also prepares a
prompt containing the predicted disease + original symptom that can be sent to
an external LLM (e.g. Gemini). The Gemini call is left as a stub so you can
implement it with your credentials / client.

Run with:
  uvicorn ML.predict_api:app --reload --port 8001

Environment variables (optional):
  GEMINI_API_KEY - if you implement an actual call to Gemini you may use this.
"""
import os
import joblib
from typing import Optional

from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title='Symptom -> Disease API')


class PredictRequest(BaseModel):
    symptom: str
    use_gemini: Optional[bool] = False


class PredictResponse(BaseModel):
    predicted_disease: str
    prompt: str
    gemini_response: Optional[dict] = None


MODEL_DIR = os.path.join(os.path.dirname(__file__), 'models')
MODEL_PATH = os.path.join(MODEL_DIR, 'knn_model.joblib')
VECT_PATH = os.path.join(MODEL_DIR, 'tfidf_vectorizer.joblib')


def load_artifacts():
    if not os.path.exists(MODEL_PATH) or not os.path.exists(VECT_PATH):
        raise FileNotFoundError('Model or vectorizer not found. Run ML/train_model.py first and place artifacts in ML/models')
    model = joblib.load(MODEL_PATH)
    vectorizer = joblib.load(VECT_PATH)
    return model, vectorizer


model = None
vectorizer = None


@app.on_event('startup')
def startup_event():
    global model, vectorizer
    try:
        model, vectorizer = load_artifacts()
    except Exception as e:
        # Keep app running but endpoints will error until artifacts exist
        print(f'Warning: could not load model artifacts: {e}')


def build_prompt(symptom: str, predicted_disease: str) -> str:
    prompt = (
        f"The patient reports the following symptom(s): '{symptom}'. "
        f"The ML model predicted the likely disease/diagnosis: '{predicted_disease}'.\n"
        "Please produce a structured output (JSON) with keys: 'diagnosis', 'confidence', "
        "'next_steps' (list of immediate suggestions), and 'explanation' (short rationale). "
        "Be concise and avoid hallucination; use the ML prediction as the primary diagnosis." 
    )
    return prompt


def call_gemini(prompt: str) -> dict:
    """
    Stub to call Gemini (or other LLM). Replace this implementation with
    the actual client call. If no external LLM is available this function
    returns a simulated structured response for testing.
    """
    api_key = os.environ.get('GEMINI_API_KEY')
    if not api_key:
        # Simulated response
        return {
            'diagnosis': 'SIMULATED_DISEASE',
            'confidence': 0.65,
            'next_steps': ['Advise rest', 'Take OTC analgesic', 'Seek doctor if symptoms worsen'],
            'explanation': 'This is a simulated response because GEMINI_API_KEY is not set.'
        }

    # If you want, implement real Gemini call here using your preferred client.
    # Keep network/keys out of repository. Example pseudo-logic:
    #   from google.generativeai import client
    #   response = client.generate_text(model='gemini', prompt=prompt, api_key=api_key)
    #   return response
    # For safety we currently return a placeholder.
    return {
        'diagnosis': 'GEMINI_NOT_IMPLEMENTED',
        'confidence': None,
        'next_steps': [],
        'explanation': 'Gemini call not implemented in this stub.'
    }


@app.post('/predict', response_model=PredictResponse)
def predict(req: PredictRequest):
    if model is None or vectorizer is None:
        raise RuntimeError('Model artifacts not loaded. Run training and place artifacts in ML/models')
    cleaned = req.symptom
    # We assume the vectorizer uses the same preprocessing pipeline as training
    vec = vectorizer.transform([cleaned])
    pred = model.predict(vec)[0]
    prompt = build_prompt(req.symptom, pred)
    gemini_resp = None
    if req.use_gemini:
        gemini_resp = call_gemini(prompt)
    return PredictResponse(predicted_disease=pred, prompt=prompt, gemini_response=gemini_resp)
