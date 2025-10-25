from fastapi import FastAPI, HTTPException
from twilio.rest import Client
import os
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

@app.post("/make-call")
async def make_call():
    try:
        # Initialize Twilio client
        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        
        # Make the call to the hardcoded phone number
        call = client.calls.create(
            url='http://demo.twilio.com/docs/voice.xml',  # Simple Twilio voice demo
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

@app.get("/health")
async def health():
    return {'status': 'ok'}

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
