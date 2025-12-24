# CareConnect Python Backend

This backend exposes HTTP endpoints for Omnidimension voice agent dispatch calls (patient, doctor, etc.).

- Uses the same Omnidimension API key as the main project.
- Deployable to Render, Railway, Heroku, or any Python-friendly host.
- Next.js (Vercel) frontend calls this backend via HTTP for all voice agent actions.

## Endpoints
- `/call-patient` — Dispatches a call to a patient using the Appointments Agent.
- `/call-doctor` — Dispatches a call to a doctor using the Doctor Approval Agent.

## How to run locally
```bash
cd backend
pip install -r requirements.txt
python app.py
```

## How to deploy
- Deploy to [Render](https://render.com/), [Railway](https://railway.app/), [Heroku](https://heroku.com/), etc.
- Set your Omnidimension API key as an environment variable or in code. 