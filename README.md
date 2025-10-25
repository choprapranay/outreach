# Outreach

AI-powered voice agent that calls businesses to find job opportunities.

## Setup

### 1. Install ngrok

```bash
brew install ngrok
```

Or download from [ngrok.com/download](https://ngrok.com/download)

### 2. Create `.env` file

```bash
cp env.example .env
```

Then edit `.env` with your API keys:

```bash
# Google Places API
GDC_API_KEY=your_google_places_api_key_here

# BosonAI
BOSON_API_KEY=your_boson_api_key_here

# Twilio
TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_PHONE_NUMBER=your_twilio_phone_number_here
WEBHOOK_BASE_URL=https://placeholder.ngrok.io

# Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token_here
```

## Run

```bash
./start.sh
```

The script automatically:
- Installs all dependencies (first time only)
- Distributes `.env` to all services
- Starts ngrok and updates webhook URL
- Launches all services

Open http://localhost:3000

## Stop

```bash
./stop.sh
```

## Usage

1. Click Settings → Set location and keyword
2. Click "Start search" to find businesses
3. Click "Call" to initiate AI phone call
4. Table updates automatically with hiring status

## API Keys

- **Google Places API**: Geocoding, Places, Place Details
- **BosonAI API**: Text-to-speech
- **Twilio**: Voice calls (Account SID, Auth Token, Phone Number)
- **Mapbox**: Interactive maps
