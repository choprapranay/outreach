# 🚀 Start Here - Run Everything

## Quick Start (5 Terminals)

### Terminal 1: Frontend
```bash
cd frontend
npm run dev
```
**Opens at**: http://localhost:3000

---

### Terminal 2: Backend (Places API)
```bash
cd backend
source venv/bin/activate
python app.py
```
**Runs on**: Port 8001

---

### Terminal 3: Backend-B (AI/TTS)
```bash
cd backend-b
source venv/bin/activate
python app.py
```
**Runs on**: Port 8000

---

### Terminal 4: Call Service (Twilio)
```bash
cd call
source venv/bin/activate
python app.py
```
**Runs on**: Port 8002

---

### Terminal 5: Ngrok (For Twilio Webhooks)
```bash
ngrok http 8002
```
**Copy the ngrok URL** (looks like `https://xxxx.ngrok.io`)

Then update `call/.env`:
```
WEBHOOK_BASE_URL=https://xxxx.ngrok.io
```

---

## Test It Out

1. **Open**: http://localhost:3000
2. **Click Settings** → Set your location and search radius
3. **Set Keyword** (e.g., "Technology") 
4. **Click "Start search"** → See businesses appear
5. **Click "Call" on BosonAI** → AI makes a call with:
   - Business name: "BosonAI"
   - Role: "Technology"
   - Phone: +12897950739

6. **Watch the table update automatically** with hiring status!

---

## What Each Service Does

- **Frontend**: The UI you see
- **Backend**: Finds businesses using Google Places API
- **Backend-B**: AI voice generation (BosonAI TTS)
- **Call Service**: Manages Twilio calls
- **Ngrok**: Exposes call service to internet for Twilio webhooks

---

## If Something's Wrong

**Backend not starting?**
```bash
cd backend
source venv/bin/activate
lsof -ti:8001 | xargs kill -9
python app.py
```

**Call service not starting?**
```bash
cd call
source venv/bin/activate
lsof -ti:8002 | xargs kill -9
python app.py
```

That's it! 🎉

