from fastapi import FastAPI, HTTPException, Request, Form
from fastapi.responses import Response, FileResponse
from fastapi.staticfiles import StaticFiles
from twilio.twiml.voice_response import VoiceResponse, Gather, Say, Play
from twilio.rest import Client
import os
import httpx
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI()

# Twilio credentials (will be loaded from .env)
TWILIO_ACCOUNT_SID = os.getenv('TWILIO_ACCOUNT_SID')
TWILIO_AUTH_TOKEN = os.getenv('TWILIO_AUTH_TOKEN')
TWILIO_PHONE_NUMBER = os.getenv('TWILIO_PHONE_NUMBER')

# Hardcoded phone number to call (replace with your actual phone number for testing)
TEST_PHONE_NUMBER = "+12897950739"  # Replace with your actual phone number

# Backend-B URL
BACKEND_B_URL = "http://localhost:8000"

# Mount static files directory to serve audio (must be before routes)
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
os.makedirs(STATIC_DIR, exist_ok=True)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.post("/make-call")
async def make_call():
    try:
        # Initialize Twilio client
        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        
        # Get the webhook base URL from environment
        base_url = os.getenv('WEBHOOK_BASE_URL', 'http://localhost:8002')
        
        # Make the call to the hardcoded phone number
        call = client.calls.create(
            url=f'{base_url}/webhook/answer',  # Use our webhook
            to=TEST_PHONE_NUMBER,
            from_=TWILIO_PHONE_NUMBER
        )
        
        return {
            'success': True,
            'call_sid': call.sid,
            'status': call.status,
            'message': f'Call initiated to {TEST_PHONE_NUMBER}'
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/webhook/answer")
async def answer_call(request: Request):
    """Webhook that Twilio calls when the call is answered"""
    print("\n📞 CALL ANSWERED - Capturing greeting...")
    
    response = VoiceResponse()
    
    # Silence - immediately capture what they say
    gather = Gather(
        input='speech',
        speech_timeout='auto',
        action='/webhook/greeting-result',
        method='POST',
        max_speech_time=5,
        timeout=10  # Wait up to 10 seconds for speech
    )
    response.append(gather)
    
    # If no speech detected, hang up
    response.hangup()
    
    print("✅ Returning TwiML to capture greeting")
    return Response(content=str(response), media_type='application/xml')

@app.post("/webhook/greeting-result")
async def handle_greeting(
    SpeechResult: str = Form(None)
):
    """Handle greeting and generate AI response"""
    greeting = SpeechResult or "Hello"
    print(f"\n🎤 Business greeting: {greeting}")
    
    response = VoiceResponse()
    
    # Business info (will be dynamic later)
    BUSINESS_NAME = "Example Business"
    ROLE = "Software Engineer"
    EMPLOYMENT_TYPE = "Full-time"
    LOCATION = "Toronto"
    
    # Generate AI response using backend-b
    try:
        async with httpx.AsyncClient(timeout=600.0) as client:
            # Step 1: Generate natural conversational response
            print(f"🤖 Generating natural response to greeting...")
            adaptive_text = None
            
            try:
                adaptive_response = await client.post(
                    f"{BACKEND_B_URL}/generate_conversation_response",
                    data={
                        "their_message": greeting,
                        "business_name": BUSINESS_NAME,
                        "role": ROLE,
                        "employment_type": EMPLOYMENT_TYPE,
                        "location": LOCATION,
                        "is_first_message": "true"
                    }
                )
                
                if adaptive_response.status_code == 200:
                    adaptive_data = adaptive_response.json()
                    adaptive_text = adaptive_data.get("response", "")
                    print(f"✅ Natural response: {adaptive_text}")
                else:
                    raise Exception(f"Conversation generation failed: {adaptive_response.status_code}")
            except Exception as e:
                print(f"⚠️ LLM unavailable, using fallback: {e}")
                # Fallback to simple greeting
                adaptive_text = f"Hi! I'm calling to ask if you're currently hiring for {EMPLOYMENT_TYPE} {ROLE}."
                print(f"⚠️ Fallback: {adaptive_text}")
            
            # Generate BosonAI audio (will wait as long as needed)
            print(f"🤖 Generating BosonAI audio (this may take 30-60 seconds)...")
            print(f"📝 Text: {adaptive_text}")
            
            tts_start = __import__('time').time()
            ai_response = await client.post(
                f"{BACKEND_B_URL}/generate_audio",
                json={
                    "text": adaptive_text,
                    "voice": "en_woman_1"
                },
                timeout=600.0
            )
            tts_elapsed = __import__('time').time() - tts_start
            print(f"⏱️ BosonAI TTS took {tts_elapsed:.2f}s")
            
            if ai_response.status_code != 200:
                error_text = ai_response.text
                print(f"❌ TTS failed: {error_text}")
                raise Exception(f"TTS generation failed: {error_text}")
            
            audio_data = ai_response.json()
            audio_filename = audio_data.get('audio_path', '')
            print(f"✅ Audio file: {audio_filename}")
            
            # Copy audio file to static directory
            import shutil
            backend_audio_path = os.path.abspath(f"../backend-b/{audio_filename}")
            static_audio_path = os.path.join(STATIC_DIR, audio_filename)
            
            if not os.path.exists(backend_audio_path):
                print(f"❌ Source not found: {backend_audio_path}")
                raise Exception(f"Audio file not found: {backend_audio_path}")
            
            shutil.copy(backend_audio_path, static_audio_path)
            print(f"✅ Copied to static")
            
            if not os.path.exists(static_audio_path):
                raise Exception(f"Copy failed: {static_audio_path}")
            
            base_url = os.getenv('WEBHOOK_BASE_URL', 'http://localhost:8002')
            audio_url = f"{base_url}/static/{audio_filename}"
            
            print(f"🔊 Playing BosonAI: {audio_url}")
            # Add a tiny pause to ensure audio is ready
            response.pause(length=1)
            response.play(audio_url)
                
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        print(f"🔍 Traceback: {traceback.format_exc()}")
        
        # Fallback to Twilio Say
        print(f"⚠️ Falling back to Twilio Say voice")
        response = VoiceResponse()  # Create new response in case it failed
        response.say(
            f"Hi! I'm calling to ask if you're currently hiring for Software Engineer positions.",
            voice='Polly.Amy'
        )
    
    # Gather their response about hiring
    gather = Gather(
        input='speech',
        speech_timeout='auto',
        action='/webhook/hiring-result',
        method='POST',
        max_speech_time=10
    )
    response.append(gather)
    
    response.hangup()
    
    return Response(content=str(response), media_type='application/xml')

@app.post("/webhook/hiring-result")
async def handle_hiring_response(
    SpeechResult: str = Form(None)
):
    """Handle the business's response - adaptive conversation until we know hiring status"""
    hiring_response = SpeechResult or ""
    
    print(f"\n🎤 Business response: {hiring_response}")
    
    response = VoiceResponse()
    hiring_status = "UNCERTAIN"
    confidence = "LOW"
    
    # Parse hiring status using backend-b
    try:
        async with httpx.AsyncClient(timeout=600.0) as client:
            print(f"🤖 Analyzing hiring status with backend-b...")
            
            # Use backend-b's AI to analyze hiring status
            try:
                analysis_response = await client.post(
                    f"{BACKEND_B_URL}/analyze_hiring_status",
                    data={"response_text": hiring_response}
                )
                
                if analysis_response.status_code == 200:
                    analysis_data = analysis_response.json()
                    hiring_status = analysis_data.get("status", "UNCERTAIN")
                    confidence = analysis_data.get("confidence", "LOW")
                    details = analysis_data.get("details", "")
                    print(f"✅ Using AI analysis")
                else:
                    raise Exception(f"Backend-b returned {analysis_response.status_code}")
            except Exception as e:
                # Fallback to simple keyword analysis when LLM is down
                print(f"⚠️ LLM unavailable, using keyword fallback: {e}")
                hiring_response_lower = hiring_response.lower()
                
                # Check for negative indicators first (more specific)
                if any(word in hiring_response_lower for word in ["no", "not", "aren't", "we're not", "we are not", "don't", "not hiring", "not currently"]):
                    hiring_status = "NOT_HIRING"
                    confidence = "HIGH"
                # Check for positive indicators
                elif any(word in hiring_response_lower for word in ["yes", "we are", "we're hiring", "currently hiring", "looking for", "positions available"]):
                    hiring_status = "HIRING"
                    confidence = "HIGH"
                else:
                    hiring_status = "UNCERTAIN"
                    confidence = "LOW"
                details = "Keyword-based fallback analysis"
            
            print(f"\n{'='*50}")
            print(f"📊 HIRING STATUS ANALYSIS")
            print(f"{'='*50}")
            print(f"Status: {hiring_status}")
            print(f"Confidence: {confidence}")
            print(f"Response: {hiring_response}")
            print(f"{'='*50}\n")
            
            # If status is UNCERTAIN, continue conversation
            if hiring_status == "UNCERTAIN":
                print(f"⚠️ Status uncertain, continuing conversation...")
                
                # Generate natural conversational follow-up
                follow_up_text = None
                try:
                    follow_up_response = await client.post(
                        f"{BACKEND_B_URL}/generate_conversation_response",
                        data={
                            "their_message": hiring_response,
                            "business_name": "Example Business",
                            "role": "Software Engineer",
                            "employment_type": "Full-time",
                            "location": "Toronto",
                            "is_first_message": "false"
                        }
                    )
                    
                    if follow_up_response.status_code == 200:
                        follow_up_data = follow_up_response.json()
                        follow_up_text = follow_up_data.get("response", "")
                        print(f"✅ Natural follow-up: {follow_up_text}")
                    else:
                        raise Exception("Follow-up generation failed")
                except Exception as e:
                    print(f"⚠️ LLM unavailable for follow-up: {e}")
                    # Fallback clarification
                    follow_up_text = "Are you currently hiring for Software Engineer positions?"
                
                # Generate BosonAI follow-up audio
                print(f"🤖 Generating BosonAI follow-up...")
                
                try:
                    tts_start = __import__('time').time()
                    follow_up_audio_response = await client.post(
                        f"{BACKEND_B_URL}/generate_audio",
                        json={
                            "text": follow_up_text,
                            "voice": "en_woman_1"
                        },
                        timeout=600.0
                    )
                    tts_elapsed = __import__('time').time() - tts_start
                    print(f"⏱️ Follow-up TTS took {tts_elapsed:.2f}s")
                    
                    if follow_up_audio_response.status_code == 200:
                        audio_data = follow_up_audio_response.json()
                        audio_filename = audio_data.get('audio_path', '')
                        
                        import shutil
                        backend_audio_path = os.path.abspath(f"../backend-b/{audio_filename}")
                        static_audio_path = os.path.join(STATIC_DIR, audio_filename)
                        
                        if os.path.exists(backend_audio_path):
                            shutil.copy(backend_audio_path, static_audio_path)
                            base_url = os.getenv('WEBHOOK_BASE_URL', 'http://localhost:8002')
                            audio_url = f"{base_url}/static/{audio_filename}"
                            
                            print(f"🔊 Playing BosonAI follow-up")
                            response.play(audio_url)
                        else:
                            raise Exception("Audio file not found")
                    else:
                        raise Exception("TTS generation failed")
                except Exception as follow_up_error:
                    print(f"❌ Follow-up error: {follow_up_error}")
                    raise
                
                # Gather their next response
                gather = Gather(
                    input='speech',
                    speech_timeout='auto',
                    action='/webhook/hiring-result',
                    method='POST',
                    max_speech_time=10
                )
                response.append(gather)
                response.hangup()
                
                return Response(content=str(response), media_type='application/xml')
            
            # If we have a clear answer (HIRING or NOT_HIRING), end the call
            print(f"✅ Clear status determined, ending call...")
            
            # Generate BosonAI thank you audio
            print(f"🤖 Generating BosonAI thank you...")
            
            try:
                tts_start = __import__('time').time()
                thank_you_response = await client.post(
                    f"{BACKEND_B_URL}/generate_audio",
                    json={
                        "text": "Thank you so much for your time. Have a great day!",
                        "voice": "en_woman_1"
                    },
                    timeout=600.0
                )
                tts_elapsed = __import__('time').time() - tts_start
                print(f"⏱️ Thank you TTS took {tts_elapsed:.2f}s")
                
                if thank_you_response.status_code == 200:
                    audio_data = thank_you_response.json()
                    audio_filename = audio_data.get('audio_path', '')
                    
                    import shutil
                    backend_audio_path = os.path.abspath(f"../backend-b/{audio_filename}")
                    static_audio_path = os.path.join(STATIC_DIR, audio_filename)
                    
                    if os.path.exists(backend_audio_path):
                        shutil.copy(backend_audio_path, static_audio_path)
                        base_url = os.getenv('WEBHOOK_BASE_URL', 'http://localhost:8002')
                        audio_url = f"{base_url}/static/{audio_filename}"
                        
                        print(f"🔊 Playing BosonAI thank you")
                        response.play(audio_url)
                    else:
                        raise Exception("Audio file not found")
                else:
                    raise Exception("TTS generation failed")
            except Exception as thank_you_error:
                print(f"❌ Thank you error: {thank_you_error}")
                raise
                
    except Exception as e:
        print(f"❌ Error: {e}")
        # Fallback to Twilio Say
        print(f"⚠️ Falling back to Twilio Say voice for thank you")
        response.say("Thank you so much for your time. Have a great day!")
    
    response.hangup()
    
    return Response(content=str(response), media_type='application/xml')

@app.get("/health")
async def health():
    return {'status': 'ok'}

@app.get("/test-static")
async def test_static():
    """Test if static files are accessible"""
    static_files = os.listdir(STATIC_DIR) if os.path.exists(STATIC_DIR) else []
    return {
        'static_dir': STATIC_DIR,
        'files': static_files,
        'example_url': f"{os.getenv('WEBHOOK_BASE_URL', 'http://localhost:8002')}/static/output_audio.wav"
    }

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
