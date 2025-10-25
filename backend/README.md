# Backend API Server

This is the backend server for the Outreach app that fetches business data using Google Places API.

## Setup

1. **Add your Google API Key**:
   - Open `backend/.env`
   - Replace `your_google_api_key_here` with your actual Google Places API key
   - You need to enable the following APIs in your Google Cloud Console:
     - Geocoding API
     - Places API (Nearby Search)
     - Place Details API

2. **Start the server**:
   ```bash
   cd backend
   source venv/bin/activate
   python app.py
   ```

3. The server will run on `http://127.0.0.1:8001`

## API Endpoints

- `GET /health` - Health check endpoint
- `GET /places?location={address}&radius={meters}&keyword={optional}` - Search for businesses

## Example

```bash
curl "http://127.0.0.1:8001/places?location=Toronto%2C%20ON&radius=3000&keyword=restaurant"
```

