from flask import Flask, request, jsonify
from omnidimension import Client
import os
import requests
import base64
from dotenv import load_dotenv
from PIL import Image as PILImage
from agno.agent import Agent
from agno.models.google import Gemini
from agno.tools.duckduckgo import DuckDuckGoTools
from agno.media import Image as AgnoImage
import json
import re
# import hashlib
# import redis

load_dotenv()

app = Flask(__name__)

# Use the API key from your existing code
api_key = "iDTcVTo146wQ29fK99cHdkg-J-_JPLL-yDF5V99czdY"
client = Client(api_key)

# Agent IDs
AGENT_IDS = {
    'symptom_screener': 3256,
    'med_reminder': 3257,
    'postop_followup': 3258,
    'healthbot': 3259,
    'appointments': 3261,
    'doctor_approval': 3262
}

# ✅ Optional: Redis for Caching
# r = redis.Redis(
#     host='localhost',  # or Redis Cloud host
#     port=6379,
#     decode_responses=True
# )
# def get_cache_key(image_bytes):
#     return "gemini:xray:" + hashlib.sha256(image_bytes).hexdigest()

# Set your API Key (from env)
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("⚠️ Please set your Google API Key in GEMINI_API_KEY")
os.environ["GEMINI_API_KEY"] = GEMINI_API_KEY

medical_agent = Agent(
    model=Gemini(id="gemini-2.0-flash-exp"),
    tools=[DuckDuckGoTools()],
    markdown=True
)

query = """
You are a highly skilled medical imaging expert with extensive knowledge in radiology and diagnostic imaging. Analyze the medical image and structure your response as follows:

**Make sure to check if the provided image is X-Ray/MRI/CT scan or not, if the provided image is other than these three categories say so, don't do any analysis**

### 1. Image Type & Region
- Identify imaging modality (X-ray/MRI/CT/Ultrasound/etc.).
- Specify anatomical region and positioning.
- Evaluate image quality and technical adequacy.

### 2. Key Findings
- Highlight primary observations systematically.
- Identify potential abnormalities with detailed descriptions.
- Include measurements and densities where relevant.

### 3. Diagnostic Assessment
- Provide primary diagnosis with confidence level.
- List differential diagnoses ranked by likelihood.
- Support each diagnosis with observed evidence.
- Highlight critical/urgent findings.

### 4. Patient-Friendly Explanation
- Simplify findings in clear, non-technical language.
- Avoid medical jargon or provide easy definitions.
- Include relatable visual analogies.
- **Use a kind, empathetic, and supportive tone. Reassure the patient and offer encouragement, especially if findings may be concerning.**

### 5. Research Context
- Use DuckDuckGo search to find recent medical literature.
- Search for standard treatment protocols.
- Provide 2-3 key references supporting the analysis.

**Always include all sections above, even if you are unsure. If you cannot provide a section, write a short, supportive message for the patient in that section.**

Ensure a structured and medically accurate response using clear markdown formatting. Do not include any text outside these sections.
"""

@app.route('/call-patient', methods=['POST'])
def call_patient():
    data = request.json
    phone = data['phoneNumber']
    agent_id = data.get('agent_id', AGENT_IDS['appointments'])
    context = {"role": "patient"}
    response = client.call.dispatch_call(agent_id, phone, context)
    return jsonify(response)

@app.route('/call-doctor', methods=['POST'])
def call_doctor():
    data = request.json
    phone = data['phoneNumber']
    agent_id = data.get('agent_id', AGENT_IDS['doctor_approval'])
    context = {
        "role": "doctor",
        "condition": data.get('condition', 'serious fever'),
        "booking_date": data.get('booking_date'),
        "booking_time": data.get('booking_time')
    }
    response = client.call.dispatch_call(agent_id, phone, context)
    return jsonify(response)

@app.route('/call-symptom-screener', methods=['POST'])
def call_symptom_screener():
    data = request.json
    phone = data['phoneNumber']
    patient_name = data.get('patientName', 'Demo Patient')
    context = {
        "customer_name": patient_name,
        "account_id": f"PAT-{phone.replace('+', '')}",
        "priority": "high"
    }
    response = client.call.dispatch_call(AGENT_IDS['symptom_screener'], phone, context)
    return jsonify(response)

@app.route('/call-med-reminder', methods=['POST'])
def call_med_reminder():
    data = request.json
    phone = data['phoneNumber']
    patient_name = data.get('patientName', 'Demo Patient')
    medicine_name = data.get('medicineName', 'Paracetamol')
    dosage = data.get('dosage', '1 tablet')
    reminder_time = data.get('reminderTime', '20:00')
    context = {
        "customer_name": patient_name,
        "account_id": f"PAT-{phone.replace('+', '')}",
        "medicine_name": medicine_name,
        "dosage": dosage,
        "reminder_time": reminder_time,
        "priority": "high"
    }
    response = client.call.dispatch_call(AGENT_IDS['med_reminder'], phone, context)
    return jsonify(response)

@app.route('/call-postop-followup', methods=['POST'])
def call_postop_followup():
    data = request.json
    phone = data['phoneNumber']
    patient_name = data.get('patientName', 'Demo Patient')
    surgery_type = data.get('surgeryType', 'General Surgery')
    days_post_op = data.get('daysPostOp', '3')
    context = {
        "customer_name": patient_name,
        "account_id": f"PAT-{phone.replace('+', '')}",
        "surgery_type": surgery_type,
        "days_post_op": days_post_op,
        "priority": "high"
    }
    response = client.call.dispatch_call(AGENT_IDS['postop_followup'], phone, context)
    return jsonify(response)

@app.route('/chat-healthbot', methods=['POST'])
def chat_healthbot():
    data = request.json
    agent_id = AGENT_IDS['healthbot']
    user_message = data.get('message', '')
    patient_name = data.get('patientName', 'Demo Patient')
    if not user_message:
        return jsonify({"error": "No user message provided"}), 400
    try:
        response = client.agent.chat(
            agent_id=agent_id,
            message=user_message,
            context={"customer_name": patient_name}
        )
        if isinstance(response, dict) and 'json' in response:
            return jsonify(response['json'])
        else:
            return jsonify(response)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/get-call-status', methods=['POST'])
def get_call_status():
    data = request.json
    call_id = data.get('call_id')
    if not call_id:
        return jsonify({"error": "No call_id provided"}), 400
    try:
        response = client.call.get(call_id)
        if isinstance(response, dict) and 'json' in response:
            return jsonify(response['json'])
        else:
            return jsonify(response)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/list-agents', methods=['GET'])
def list_agents():
    try:
        page = int(request.args.get('page', 1))
        page_size = int(request.args.get('page_size', 10))
        response = client.agent.list(page=page, page_size=page_size)
        if isinstance(response, dict) and 'json' in response:
            return jsonify(response['json'])
        else:
            return jsonify(response)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/get-call-logs', methods=['GET'])
def get_call_logs():
    try:
        page = int(request.args.get('page', 1))
        page_size = int(request.args.get('page_size', 10))
        response = client.call.get_call_logs(page=page, page_size=page_size, agent_id="3015")
        if isinstance(response, dict) and 'json' in response:
            return jsonify(response['json'])
        else:
            return jsonify(response)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/analyze-xray', methods=['POST'])
def analyze_xray():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    # Save and resize image
    temp_path = "temp_image.png"
    file.save(temp_path)
    image = PILImage.open(temp_path)
    width, height = image.size
    aspect_ratio = width / height
    new_width = 500
    new_height = int(new_width / aspect_ratio)
    resized_image = image.resize((new_width, new_height))
    resized_path = "temp_resized_image.png"
    resized_image.save(resized_path)

    agno_image = AgnoImage(filepath=resized_path)
    try:
        response = medical_agent.run(query, images=[agno_image])
        result = response.content
    except Exception as e:
        result = f"⚠️ Analysis error: {e}"
    finally:
        os.remove(temp_path)
        os.remove(resized_path)

    return jsonify({'gemini': result})


@app.route('/transcribe-prescription', methods=['POST'])
def transcribe_prescription():
    """
    Accepts an uploaded prescription image and returns a strict JSON transcription
    according to the schema specified in the project's feature request.
    """
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    # Save and resize image similar to xray flow
    temp_path = "temp_prescription.png"
    file.save(temp_path)
    image = PILImage.open(temp_path)
    width, height = image.size
    aspect_ratio = width / height if height != 0 else 1
    new_width = 1000
    new_height = int(new_width / aspect_ratio)
    resized_image = image.resize((new_width, new_height))
    resized_path = "temp_prescription_resized.png"
    resized_image.save(resized_path)

    agno_image = AgnoImage(filepath=resized_path)

    # Prompt that enforces strict JSON output following the schema
    prompt = r'''
You are a specialized AI assistant for medical prescription transcription. Your task is to analyze the provided image of a prescription and extract all information into a structured JSON format.

**JSON Output Schema:**
The JSON response MUST strictly follow this schema. Do not add any explanatory text outside of the JSON object.

{
  "patientInfo": {
    "name": "Patient's Name",
    "details": "Patient's age/gender (e.g., 28/m)"
  },
  "prescriptionDate": "DD/MM/YY",
  "clinicInfo": {
    "name": "Clinic or Hospital Name"
  },
  "medications": [
    {
      "name": "Medication Name (e.g., Tab Augmentin 625mg)",
      "dosage": "Dosage string (e.g., 1-0-1)",
      "duration": "Duration (e.g., 5 days)",
      "instructions": "Instructions (e.g., After meals)"
    }
  ],
  "additionalAdvice": [
    {
      "item": "Item name (e.g., Hexigel gum paint)",
      "dosage": "Dosage string (e.g., 1-0-1)",
      "duration": "Duration (e.g., 1 week)",
      "instructions": "Instructions (e.g., Massage)"
    }
  ],
  "disclaimer": "This is an AI-generated transcription. Please verify with a medical professional."
}

**Rules:**
1.  Transcribe the text *exactly* as seen.
2.  For "dosage," use the `1-0-1` (Morning-Afternoon-Night) format if present.
3.  If any information (like patient name or clinic) is not visible, return `null` for that specific field.
4.  If a whole section (like `additionalAdvice`) is missing, return an empty array `[]`.
5.  The disclaimer must be included in the response.
Your Task: Return ONLY a valid JSON object that follows the schema above. Do not include any other commentary or markdown.
'''

    try:
        # Use a focused agent for prescription transcription
        prescription_agent = Agent(
            model=Gemini(id="gemini-2.0-flash-exp"),
            description="Transcribes handwritten prescriptions into strict JSON",
            markdown=False
        )
        response = prescription_agent.run(prompt, images=[agno_image])
        result_text = response.content
    except Exception as e:
        # Clean up temporary files
        try:
            os.remove(temp_path)
        except Exception:
            pass
        try:
            os.remove(resized_path)
        except Exception:
            pass
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        # remove temp files if still present
        try:
            if os.path.exists(temp_path):
                os.remove(temp_path)
        except Exception:
            pass
        try:
            if os.path.exists(resized_path):
                os.remove(resized_path)
        except Exception:
            pass

    # Attempt to extract JSON from the agent's textual output
    parsed = None
    try:
        parsed = json.loads(result_text)
    except Exception:
        # try to extract the first JSON object substring
        m = re.search(r"\{[\s\S]*\}", result_text)
        if m:
            try:
                parsed = json.loads(m.group(0))
            except Exception:
                parsed = None

    if parsed is None:
        # Return raw output with an error hint so frontend can show it for debugging
        return jsonify({
            'success': False,
            'error': 'Failed to parse JSON from AI response',
            'raw': result_text
        }), 502

    # Ensure disclaimer presence per rules
    if 'disclaimer' not in parsed:
        parsed['disclaimer'] = "This is an AI-generated transcription. Please verify with a medical professional."

    return jsonify({'success': True, 'transcription': parsed})

@app.route('/patient/health-plan', methods=['POST'])
def patient_health_plan():
    data = request.json
    # Extract parameters with defaults for safety
    name = data.get('name', 'Patient')
    age = data.get('age', None)
    weight = data.get('weight', None)
    height = data.get('height', None)
    gender = data.get('gender', None)
    activity_level = data.get('activity_level', None)
    dietary_preference = data.get('dietary_preference', None)
    fitness_goal = data.get('fitness_goal', None)
    medical_conditions = data.get('medical_conditions', [])
    allergies = data.get('allergies', [])
    medications = data.get('medications', [])

    # Refined, healthcare-aligned prompt
    prompt = f'''
You are a compassionate, evidence-based digital health coach. Create a comprehensive, safe, and actionable health plan for the following patient:

- Name: {name}
- Age: {age}
- Weight: {weight} kg
- Height: {height} cm
- Gender: {gender}
- Activity Level: {activity_level}
- Dietary Preference: {dietary_preference}
- Fitness Goal: {fitness_goal}
- Medical Conditions: {', '.join(medical_conditions) if medical_conditions else 'None'}
- Allergies: {', '.join(allergies) if allergies else 'None'}
- Medications: {', '.join(medications) if medications else 'None'}

**Instructions:**
- Always structure your response in exactly 5 sections, each starting with the following H2 markdown headings (##):
  - ## 1. Personalized Nutrition Plan
  - ## 2. Personalized Fitness Plan
  - ## 3. Lifestyle & Wellness Tips
  - ## 4. Patient-Friendly Explanation
  - ## 5. References & Research
- Use these exact headings and order so the response can be split and paginated in the frontend.
- Personalize all advice to the above profile.
- Ensure all recommendations are safe for the listed medical conditions, allergies, and medications.
- In the Nutrition Plan, provide a daily meal plan (breakfast, lunch, dinner, snacks) with nutritional breakdown (macros, vitamins) using markdown tables where possible.
- In the Fitness Plan, provide a workout plan (warm-up, main exercises, cool-down) tailored to the goal and ability, using lists or tables.
- In Lifestyle & Wellness Tips, suggest healthy habits (hydration, sleep, stress, etc.) in a clear, actionable way.
- In Patient-Friendly Explanation, summarize the plan in simple, supportive language.
- In References & Research, cite reputable sources or guidelines.
- Use supportive, inclusive, and motivating language throughout.
- If unsure, say so and suggest consulting a healthcare professional.
'''
    try:
        # Use the Gemini agent (with DuckDuckGo tools for up-to-date info)
        health_agent = Agent(
            model=Gemini(id="gemini-2.0-flash-exp"),
            description="Creates holistic, safe, and actionable health plans for patients.",
            instructions=[],
            tools=[DuckDuckGoTools()],
            show_tool_calls=True,
            markdown=True
        )
        response = health_agent.run(prompt)
        return jsonify({
            "success": True,
            "plan": response.content
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/analyze-vitals', methods=['POST'])
def analyze_vitals():
    """Accept vitals entries (list) and optional location, call Gemini to give a structured analysis.
    Returns JSON with fields: success, gemini (text), emergency (bool), and optionally locations (client-side links can be built).
    """
    data = request.json or {}
    entries = data.get('entries', [])
    location = data.get('location')  # {lat, lon}

    if not entries:
        return jsonify({'success': False, 'error': 'No vitals provided'}), 400

    # Build a prompt describing the recent vitals
    summary_lines = []
    for e in entries[:7]:
        summary_lines.append(f"Date: {e.get('date')}, Temp: {e.get('temperature')}, HR: {e.get('heartRate')}, SpO2: {e.get('spo2')}, RR: {e.get('respiratoryRate')}, Glucose: {e.get('glucose')}, Pain: {e.get('pain')}, Notes: {e.get('notes')}")

    prompt = f"""
You are a helpful, evidence-based medical assistant. The user provided recent vitals (up to 7 entries):\n\n{chr(10).join(summary_lines)}\n\nPlease provide a structured analysis with these sections (in plain text):
1) Brief summary of the current status (one paragraph).
2) Any concerning or urgent findings (list). If any finding indicates immediate/emergency care is recommended, write the word EMERGENCY: followed by reasons.
3) Actionable suggestions for the patient (triage, home care, when to see a clinician).
4) If emergency is identified, recommend the patient to seek immediate care and include what to look for (red flags). Do NOT include location links here; the server will supply nearby hospital suggestions if location is provided.

Be concise and patient-friendly.
"""

    # NOTE: analyze_vitals moved to Next.js app/api route. Keep this endpoint removed here.
    return jsonify({'success': False, 'error': 'analyze_vitals removed from this service; use the Next.js API endpoint'}), 410

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000) 