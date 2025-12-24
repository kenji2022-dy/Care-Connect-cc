# ML folder

This folder contains a small training script and an inference FastAPI stub for
the symptom -> disease model used in the project.

Files
- `train_model.py` — trains a TF-IDF + KNN baseline, evaluates and saves artifacts to `ML/models`.
- `predict_api.py` — FastAPI app that loads saved artifacts and exposes `/predict`.
- `requirements.txt` — Python packages used by the scripts.

Quick usage

1. Create a virtual environment and install dependencies (PowerShell):

```powershell
python -m venv .venv; .\.venv\Scripts\Activate.ps1
pip install -r ML/requirements.txt
```

2. Train and save model (adjust CSV path):

```powershell
# Example; replace with your CSV path
python ML/train_model.py --csv C:\path\to\Symptom2Disease.csv --out_dir ML/models --sample_frac 0.5
```

3. Run the API (after training):

```powershell
uvicorn ML.predict_api:app --reload --port 8001
```

4. Example request body (POST /predict):

```json
{
  "symptom": "fever and cough",
  "use_gemini": false
}
```

Gemini integration
- `predict_api.py` builds a prompt containing the ML predicted disease and the user's symptom.
- The `call_gemini` function is a stub — implement the actual Gemini (or other LLM) call there and keep
  API keys out of the repository (use env vars).

Next steps you might want me to implement
- Hook this API into the patient-side form in the Next.js app (I can add a new endpoint under `app/api/` that proxies or calls this service).
- Implement the real Gemini call (requires credentials and knowing which Gemini API/client you want to use).
- Improve the model (LogisticRegression, BERT-based model) and add unit tests.