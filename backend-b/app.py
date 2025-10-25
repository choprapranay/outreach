import openai
import os
import wave
import base64
import uvicorn
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

BOSON_API_KEY = os.getenv("BOSON_API_KEY")

client = openai.Client(api_key=BOSON_API_KEY, base_url="https://hackathon.boson.ai/v1")

class TTSRequest(BaseModel):
    text: str
    voice: Optional[str] = "en_woman_1"

class BusinessInput(BaseModel):
    business_name: str
    phone: str
    location: str
    role: str
    employment_type: str
    notes: Optional[str] = ""

"""
def generate_call_script(business_name: str, location: str, role: str, employment_type: str, notes: str = "") -> str:
    base_script = f"Hello, this is an automated inquiry call, I'm calling to ask if {business_name} is currently hiring for the role of {employment_type} {role} in {location}"

    if notes:
        base_script += f" {notes}."
    
    base_script += " Please respond with whether you are currently hiring or not at the end of this message, thank you for your time!"
    
    return base_script
"""

def encode_audio_to_base64(file_path: str) -> str: 
    with open(file_path, "rb") as audio_file:
        return base64.b64encode(audio_file.read()).decode("utf-8")


def generate_tts_audio(text: str, voice: str = "en_woman_1", output_filename: str = "output_audio.wav") -> str:

    try:
        print(f"Generating TTS for text: {text[:50]}...")
        
        response = client.audio.speech.create(
            model="higgs-audio-generation-Hackathon",
            voice=voice,
            input=text,
            response_format="pcm"
        )
        
        audio_data = response.content
        
        with wave.open(output_filename, "wb") as wav_file:
            wav_file.setnchannels(1)  
            wav_file.setsampwidth(2)  
            wav_file.setframerate(24000)  
            wav_file.writeframes(audio_data)
        
        print(f"✓ Audio saved to: {output_filename}")
        return output_filename
    
    except Exception as e:
        print(f"✗ TTS Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"TTS generation error: {str(e)}")


def transcribe_audio(audio_path: str) -> str:
  
    try:
        print(f"Transcribing audio: {audio_path}")
        
        # Encode audio to base64
        audio_base64 = encode_audio_to_base64(audio_path)
        file_format = audio_path.split(".")[-1]
        
        # Call Higgs Audio Understanding API
        response = client.chat.completions.create(
            model="higgs-audio-understanding-Hackathon",
            messages=[
                {"role": "system", "content": "Transcribe this audio accurately."},
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "input_audio",
                            "input_audio": {
                                "data": audio_base64,
                                "format": file_format,
                            },
                        },
                    ],
                },
            ],
            max_completion_tokens=256,
            temperature=0.0,
        )
        
        transcription = response.choices[0].message.content
        print(f"Transcription: {transcription}")
        return transcription
    
    except Exception as e:
        print(f"✗ ASR Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"ASR transcription error: {str(e)}")

def generate_adaptive_greeting(greeting: str, business_info: BusinessInput) -> str: 
    try: 
        system_prompt = """You are making an automated call to ask about hiring.
The business just answered the phone. Respond naturally to their greeting, then immediately ask if they're hiring.

Keep it SHORT and NATURAL - maximum 2 sentences.

Examples:
- If they say "Hello?" → "Hello! I'm calling to ask if you're currently hiring for [position]."
- If they say "How can I help you?" → "I'm calling to ask if you're currently hiring for [position]."
- If they say "Who is this?" → "This is an automated inquiry. I'm calling to ask if you're currently hiring for [position]."

Just respond with the message - no labels or formatting."""

        user_prompt = f"""Business: {business_info.business_name}
Position: {business_info.employment_type} {business_info.role}
Location: {business_info.location}
Additional notes: {business_info.notes if business_info.notes else "None"}

They answered the phone with: "{greeting}"

What should I say?"""
        response = client.chat.completions.create(
            model ="Qwen3-32B-non-thinking-Hackathon",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            max_tokens=150,
            temperature=0.7
            )
        
        adaptive_response = response.choices[0].message.content.strip()
        print(f"\n🤖 Generated response: {adaptive_response}")
        return adaptive_response

    except Exception as e:
        print(f"✗ LLM Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Response generation error: {str(e)}")
    
def parse_hiring_status (response: str) -> dict: 
    """
    Parse their answer to determine hiring status
    """
    try:
        system_prompt = """Analyze this business response to determine their hiring status.

Respond in this EXACT format:
STATUS: [HIRING/NOT_HIRING/UNCERTAIN]
CONFIDENCE: [HIGH/MEDIUM/LOW]
DETAILS: [brief one-line summary]

Examples:
- "Yes we're hiring" → STATUS: HIRING, CONFIDENCE: HIGH, DETAILS: Currently hiring
- "No" → STATUS: NOT_HIRING, CONFIDENCE: HIGH, DETAILS: Not hiring
- "What position?" → STATUS: UNCERTAIN, CONFIDENCE: LOW, DETAILS: Asked for clarification"""

        response_text = client.chat.completions.create(
            model="Qwen3-32B-non-thinking-Hackathon",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Business said: \"{response}\""}
            ],
            max_tokens=100,
            temperature=0.3
        )
        
        analysis = response_text.choices[0].message.content
        print(f"\n📊 Raw LLM Response:\n{analysis}\n")
        
        # Parse response
        result = {
            "status": "UNCERTAIN",
            "confidence": "LOW",
            "details": ""
        }
        
        for line in analysis.strip().split('\n'):
            line = line.strip()
            if line.startswith("STATUS:"):
                result["status"] = line.split(":", 1)[1].strip()
            elif line.startswith("CONFIDENCE:"):
                result["confidence"] = line.split(":", 1)[1].strip()
            elif line.startswith("DETAILS:"):
                result["details"] = line.split(":", 1)[1].strip()
        
        print(f"📊 Parsed result: {result}\n")
        return result
    
    except Exception as e:
        print(f"✗ Parsing Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Status parsing error: {str(e)}")


@app.get("/")
async def root():
    return {
        "message": "Simple Hiring Call System",
        "status": "running",
        "flow": {
            "step_1": "POST /handle_initial_greeting - Business greets, system asks about hiring",
            "step_2": "POST /parse_hiring_response - Business answers, system extracts status"
        }
    }

@app.post("/generate_audio")
async def generate_audio_endpoint(request: TTSRequest):
    """
    Test TTS: Generate audio from text
    
    Example:
    {
        "text": "Hello, are you currently hiring?",
        "voice": "en_woman_1"
    }
    
    Available voices: en_woman_1, en_man, belinda, mabel, chadwick, vex, zh_man_sichuan
    """
    try:
        audio_path = generate_tts_audio(request.text, request.voice)
        return {
            "success": True,
            "message": "Audio generated successfully",
            "audio_path": audio_path,
            "text": request.text,
            "voice": request.voice
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate_adaptive_greeting")
async def generate_adaptive_greeting_endpoint(
    greeting: str = Form(...),
    business_name: str = Form(...),
    role: str = Form(...),
    employment_type: str = Form(...),
    location: str = Form(...)
):
    """
    Generate adaptive greeting based on what the business says
    """
    try:
        business_info = BusinessInput(
            business_name=business_name,
            phone="",
            location=location,
            role=role,
            employment_type=employment_type,
            notes=""
        )
        adaptive_response = generate_adaptive_greeting(greeting, business_info)
        return {
            "success": True,
            "response": adaptive_response
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate_conversation_response")
async def generate_conversation_response_endpoint(
    their_message: str = Form(...),
    business_name: str = Form(...),
    role: str = Form(...),
    employment_type: str = Form(...),
    location: str = Form(...),
    is_first_message: str = Form("true")
):
    """
    Generate natural conversational response - works for initial greeting and follow-ups
    """
    try:
        is_first = is_first_message.lower() == "true"
        
        system_prompt = """You are a friendly professional recruiter making a phone call.

Your goal: Have a natural conversation and find out if they're hiring for the position.

CRITICAL RULES:
1. ALWAYS answer their questions directly and naturally first
2. Be warm, human, and conversational
3. Keep responses SHORT (1-2 sentences max)
4. After answering, smoothly transition to asking about hiring
5. Sound like a real person having a conversation, not a robot

Examples:
- They say "Hello?" → "Hi! I'm calling to see if you're hiring for Software Engineers."
- They say "Who is this?" → "Oh hi! I'm a recruiter reaching out. Are you folks currently hiring for any Software Engineer positions?"
- They say "Can I ask who this is?" → "Of course! I'm calling to ask about job openings. Are you hiring for Software Engineers right now?"
- They say "What company are you from?" → "I'm reaching out on behalf of candidates. Are you currently looking for Software Engineers?"
- They say "What position?" → "Full-time Software Engineer in Toronto. Is that something you have open?"
- They say "How's your day?" → "Pretty good, thanks for asking! I'm calling to see if you're hiring for Software Engineers."
- They say "We might be" → "Oh great! Do you have an open Software Engineer position right now?"
- They say "Send an email" → "Sure thing! Just to confirm, are you currently hiring for Software Engineers?"
- They say "I'm busy" → "No problem, quick question - are you hiring for Software Engineers? Just yes or no."

Be natural, friendly, and human. Actually answer what they ask, then bring it back to hiring.

Just respond with the message - no labels or formatting."""

        user_prompt = f"""Position: {employment_type} {role}
Location: {location}
Business: {business_name}

They just said: "{their_message}"

How do I respond naturally?"""

        response = client.chat.completions.create(
            model="Qwen3-32B-non-thinking-Hackathon",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            max_tokens=100,
            temperature=0.8
        )
        
        conversation_response = response.choices[0].message.content.strip()
        print(f"\n💬 Conversational response: {conversation_response}")
        
        return {
            "success": True,
            "response": conversation_response
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze_hiring_status")
async def analyze_hiring_status_endpoint(response_text: str = Form(...)):
    """
    Analyze hiring status from text response
    """
    try:
        result = parse_hiring_status(response_text)
        return {
            "success": True,
            "status": result["status"],
            "confidence": result["confidence"],
            "details": result["details"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/transcribe_audio")
async def transcribe_audio_endpoint(file: UploadFile = File(...)):
    """
    Test ASR: Transcribe uploaded audio file
    
    Upload a WAV or MP3 audio file to get transcription
    """
    temp_audio_path = None
    try:
        # Save uploaded file temporarily
        temp_audio_path = f"temp_{file.filename}"
        with open(temp_audio_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        # Transcribe the audio
        transcription = transcribe_audio(temp_audio_path)
        
        # Clean up temp file
        os.remove(temp_audio_path)
        
        return {
            "success": True,
            "transcription": transcription,
            "filename": file.filename
        }
    
    except Exception as e:
        # Clean up temp file if it exists
        if temp_audio_path and os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/handle_initial_greeting")
async def handle_initial_greeting(
    greeting_audio: UploadFile = File(...),
    business_name: str = "",
    phone: str = "",
    location: str = "",
    role: str = "",
    employment_type: str = "",
    notes: str = ""
):
    """
    STEP 1: Handle business greeting and ask about hiring
    
    Flow:
    1. Business answers phone (upload their greeting audio)
    2. System transcribes it (ASR)
    3. System generates adaptive response + hiring question (LLM)
    4. System converts to audio (TTS)
    5. Returns audio to play to business
    
    Example:
    - Upload audio of them saying "Hello, Joe's Diner"
    - Get back audio saying "Hello! I'm calling to ask if you're hiring for servers"
    """
    temp_audio_path = None
    try:
        print("\n" + "="*50)
        print("📞 STEP 1: HANDLING INITIAL GREETING")
        print("="*50)
        
        business_info = BusinessInput(
            business_name=business_name,
            phone=phone,
            location=location,
            role=role,
            employment_type=employment_type,
            notes=notes
        )
        
        # Step 1: Transcribe their greeting (ASR)
        temp_audio_path = f"temp_greeting_{greeting_audio.filename}"
        with open(temp_audio_path, "wb") as f:
            content = await greeting_audio.read()
            f.write(content)
        
        greeting_text = transcribe_audio(temp_audio_path)
        os.remove(temp_audio_path)
        
        print(f"\n🎤 Business greeting: {greeting_text}")
        
        # Step 2: Generate adaptive response with hiring question (LLM)
        response_text = generate_adaptive_greeting(greeting_text, business_info)
        
        # Step 3: Convert to audio (TTS)
        response_audio_filename = f"question_{business_name.replace(' ', '_')}.wav"
        response_audio_path = generate_tts_audio(
            text=response_text,
            output_filename=response_audio_filename
        )
        
        return {
            "success": True,
            "greeting_transcription": greeting_text,
            "system_response_text": response_text,
            "system_response_audio": response_audio_path,
            "next_step": "Play this audio to business, then send their answer to /parse_hiring_response"
        }
    
    except Exception as e:
        if temp_audio_path and os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)
        print(f"\n✗ Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/parse_hiring_response")
async def parse_hiring_response(
    response_audio: UploadFile = File(...),
    business_name: str = ""
):
    """
    
    Flow:
    1. Business responds to hiring question (upload their audio)
    2. System transcribes it (ASR)
    3. System analyzes hiring status (LLM)
    4. System generates thank you message (TTS)
    5. Returns status + closing audio
    
    Example:
    - Upload audio of them saying "Yes, we're hiring"
    - Get back: status=HIRING, audio saying "Thank you!"
    """
    temp_audio_path = None
    try:
        print("\n" + "="*50)
        print("📞 STEP 2: PARSING HIRING RESPONSE")
        print("="*50)
        
        # Step 1: Transcribe their response (ASR)
        temp_audio_path = f"temp_response_{response_audio.filename}"
        with open(temp_audio_path, "wb") as f:
            content = await response_audio.read()
            f.write(content)
        
        response_text = transcribe_audio(temp_audio_path)
        os.remove(temp_audio_path)
        
        print(f"\n🎤 Business response: {response_text}")
        
        hiring_analysis = parse_hiring_status(response_text)
    
        closing_text = "Thank you so much for your time. Have a great day!"
        closing_audio_filename = f"closing_{business_name.replace(' ', '_')}.wav"
        closing_audio_path = generate_tts_audio(
            text=closing_text,
            output_filename=closing_audio_filename
        )
        
        print(f"\n✅ Hiring Status: {hiring_analysis['status']}")
        print(f"📊 Confidence: {hiring_analysis['confidence']}")
        
        return {
            "success": True,
            "response_transcription": response_text,
            "hiring_status": hiring_analysis['status'],
            "confidence": hiring_analysis['confidence'],
            "details": hiring_analysis['details'],
            "closing_message_text": closing_text,
            "closing_message_audio": closing_audio_path,
            "call_complete": True
        }
    
    except Exception as e:
        if temp_audio_path and os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)
        print(f"\n✗ Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


"""
@app.post("/generate_business_call")
async def generate_business_call(business: BusinessInput):

    try:
        # Generate call script
        call_script = generate_call_script(business.business_name, business.location, business.role, business.employment_type, business.notes)
    
        
        print(f"\n=== Processing Business Call ===")
        print(f"Business: {business.business_name}")
        print(f"Phone: {business.phone}")
        print(f"Call Script: {call_script}")
        
        # Generate TTS audio
        audio_filename = f"call_{business.business_name.replace(' ', '_').lower()}.wav"
        audio_path = generate_tts_audio(call_script, output_filename=audio_filename)
        
        return {
            "success": True,
            "business_name": business.business_name,
            "phone": business.phone,
            "call_script": call_script,
            "audio_path": audio_path
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
"""


if __name__ == "__main__":
    print("\n🚀 Starting TTS & ASR Test System...")
    print("📝 Endpoints:")
    print("   - POST /generate_audio : Test TTS")
    print("   - POST /transcribe_audio : Test ASR")
    print("   - POST /handle_initial_greeting : Step 1 - Handle greeting")
    print("   - POST /parse_hiring_response : Step 2 - Parse hiring status")
    print("\n")
    uvicorn.run(app, host="0.0.0.0", port=8000)

