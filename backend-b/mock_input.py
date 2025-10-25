import requests
import os

BASE_URL = "http://localhost:8000"

mock_input = {
    "business_name": "Joe's Diner",
    "phone": "+1234567890",
    "location": "New York",
    "role": "Line cook",
    "employment_type": "Full-time",
}

def test_health_check():
    """Test if the server is running"""
    print("\n=== Testing Health Check ===")
    try:
        response = requests.get(f"{BASE_URL}/")
        print(f"✓ Server Status: {response.json()}")
        return True
    except Exception as e:
        print(f"Server not running: {e}")
        return False

def test_simple_tts():
    print("\n=== Testing Simple TTS ===")
    try:
        payload = {
            "text": "Hello, are you currently hiring?",
            "voice": "en_woman_1"
        }
        response = requests.post(f"{BASE_URL}/generate_audio", json=payload)
        result = response.json()
        
        if result.get("success"):
            print(f"✓ TTS Success!")
            print(f"   Audio saved to: {result['audio_path']}")
            print(f"   Text: {result['text']}")
            return True
        else:
            print(f"✗ TTS Failed: {result}")
            return False
    except Exception as e:
        print(f"✗ TTS Error: {e}")
        return False

def test_business_call_tts():
    """Test TTS with mock business data"""
    print("\n=== Testing Business Call TTS (Mock Data) ===")
    try:
        response = requests.post(f"{BASE_URL}/generate_business_call", json=mock_input)
        result = response.json()
        
        if result.get("success"):
            print(f"✓ Business Call TTS Success!")
            print(f"   Business: {result['business_name']}")
            print(f"   Phone: {result['phone']}")
            print(f"   Call Script: {result['call_script'][:100]}...")  # Print part of the call script
            print(f"   Audio saved to: {result['audio_path']}")
            return result['audio_path']
        else:
            print(f"Business Call TTS Failed: {result}")
            return None
    except Exception as e:
        print(f"✗ Business Call TTS Error: {e}")
        return None

def test_asr(audio_file_path):
    """Test ASR transcription"""
    print("\n=== Testing ASR Transcription ===")
    
    if not audio_file_path or not os.path.exists(audio_file_path):
        print(f"✗ Audio file not found: {audio_file_path}")
        print("   Skipping ASR test (you can test manually with your own audio file)")
        return False
    
    try:
        with open(audio_file_path, 'rb') as f:
            files = {'file': (audio_file_path, f, 'audio/wav')}
            response = requests.post(f"{BASE_URL}/transcribe_audio", files=files)
        
        result = response.json()
        
        if result.get("success"):
            print(f"✓ ASR Success!")
            print(f"   Transcription: {result['transcription']}")
            return True
        else:
            print(f"✗ ASR Failed: {result}")
            return False
    except Exception as e:
        print(f"✗ ASR Error: {e}")
        return False

def main():
    """Run all tests"""
    print("\n" + "="*50)
    print("🧪 TESTING TTS & ASR APIS")
    print("="*50)
    
    if not test_health_check():
        print("\n❌ Server is not running. Start it with: python app.py")
        return
    
    test_simple_tts()
    
    audio_path = test_business_call_tts()
    
    if audio_path:
        print("\n📝 Note: Testing ASR with the generated TTS audio...")
        print("   (For real testing, you should record your own response audio)")
        test_asr(audio_path)
    

if __name__ == "__main__":
    main()