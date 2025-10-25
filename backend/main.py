from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import requests, os, time
from dotenv import load_dotenv

app = FastAPI(title="outreach")

load_dotenv()
GDC_API_KEY = os.getenv("GDC_API_KEY")

# Front end connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ------------------------------------------------------------------------------------
# HELPER FUNCTIONS
#------------------------------------------------------------------------------------

def geocode_location(location_name: str): # one api call
    """RETURN THE LONGITUDE AND LATITUDE BASED ON USER LOCATION"""
    url = "https://maps.googleapis.com/maps/api/geocode/json"
    params = {"address": location_name, "key": GDC_API_KEY}

    response = requests.get(url, params=params)
    data = response.json()

    if not data.get("results"):
        raise HTTPException(status_code=404, detail=f"Location '{location_name}' not found")

    loc = data["results"][0]["geometry"]["location"]
    return loc["lat"], loc["lng"]


def find_businesses(lat, lng, radius=5000, keyword=None): # one api call
    """Use Nearby Search API to find up to 20 nearby businesses."""
    # if needed can find up to 60 businesses
    url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"

    params = {
        "location": f"{lat},{lng}",
        "radius": radius,
        "type": "establishment",
        "key": GDC_API_KEY,
    }

    if keyword:
        params["keyword"] = keyword

    response = requests.get(url, params=params)
    data = response.json()

    if "results" not in data:
        print("No results found or invalid response:", data)
        return []

    return data["results"]


def find_businesses_number(place_id): # one api call/business
    url = "https://maps.googleapis.com/maps/api/place/details/json"
    params = {
        "place_id": place_id,
        "fields": "formatted_phone_number",
        "key": GDC_API_KEY
    }

    response = requests.get(url, params=params)
    data = response.json()

    if response.status_code == 200 and "result" in data:
        return data["result"].get("formatted_phone_number")
    return {"incorrect format"}

@app.get("/places")
def get_businesses(
    location: str = Query(..., description="Address or city name (e.g. '123 Main St Milton')"),
    radius: int = Query(2000, description="Search radius in meters"),
    keyword: str | None = Query(None, description="Optional filter like 'restaurant' or 'retail'")
):
    print(f"Geocoding location: {location}")
    lat, lng = geocode_location(location)

    print(f"Coordinates: ({lat}, {lng}) — radius={radius}m keyword={keyword or 'none'}")
    places = find_businesses(lat, lng, radius, keyword)

    # implement a filtering hiring system in the future

    results = []
    for p in places:
        place_id = p.get("place_id")
        phone = find_businesses_number(place_id) if place_id else None

        results.append({
            "name": p.get("name"),
            "address": p.get("vicinity"),
            "lat": p["geometry"]["location"]["lat"],
            "lng": p["geometry"]["location"]["lng"],
            "phone": phone or "N/A"
        })

    return {"results": results}


@app.get("/health")
def health():
    return {"status": "healthy"}
