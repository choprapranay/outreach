# Setup Instructions

## Step 1: Setup ngrok
1. Go to: https://dashboard.ngrok.com/signup
2. Sign up for free account
3. Get your authtoken from: https://dashboard.ngrok.com/get-started/your-authtoken
4. Run this command (replace with your token):
```bash
~/ngrok config add-authtoken YOUR_AUTHTOKEN_HERE
```

## Step 2: Run the Services

**Terminal 1 - Backend-B:**
```bash
cd backend-b
source venv/bin/activate
python app.py
```

**Terminal 2 - Call Service:**
```bash
cd call
source venv/bin/activate
python app.py
```

**Terminal 3 - ngrok:**
```bash
~/ngrok http 8000
```

Copy the HTTPS URL from ngrok (e.g., `https://abc123.ngrok-free.app`)

## Step 3: Update .env

Edit `call/.env` and add:
```
WEBHOOK_BASE_URL=https://your-ngrok-url.ngrok-free.app
```

## Step 4: Test

Open in browser:
```
http://localhost:8000/make-call
```

Or use curl:
```bash
curl -X POST http://localhost:8000/make-call
```
