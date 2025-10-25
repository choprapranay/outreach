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
    url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"

    # Comprehensive list of ALL specific business types (excluding malls/shopping centers)
    all_business_types = [
        "accounting", "airport", "amusement_park", "aquarium", "art_gallery",
        "atm", "bakery", "bank", "bar", "beauty_salon", "bicycle_store",
        "book_store", "bowling_alley", "bus_station", "cafe", "campground",
        "car_dealer", "car_rental", "car_repair", "car_wash", "casino",
        "cemetery", "church", "city_hall", "clothing_store", "convenience_store",
        "courthouse", "dentist", "department_store", "doctor", "drugstore",
        "electrician", "electronics_store", "embassy", "fire_station",
        "florist", "funeral_home", "furniture_store", "gas_station", "gym",
        "hair_care", "hardware_store", "hindu_temple", "home_goods_store",
        "hospital", "insurance_agency", "jewelry_store", "laundry", "lawyer",
        "library", "light_rail_station", "liquor_store", "local_government_office",
        "locksmith", "lodging", "meal_delivery", "meal_takeaway", "mosque",
        "movie_rental", "movie_theater", "moving_company", "museum",
        "night_club", "painter", "park", "parking", "pet_store", "pharmacy",
        "physiotherapist", "plumber", "police", "post_office", "primary_school",
        "real_estate_agency", "restaurant", "roofing_contractor", "rv_park",
        "school", "secondary_school", "shoe_store", "spa", "stadium", "storage",
        "store", "subway_station", "supermarket", "synagogue", "taxi_stand",
        "tourist_attraction", "train_station", "transit_station", "travel_agency",
        "university", "veterinary_care", "zoo"
    ]

    # Map keywords to most relevant types (can return multiple)
    business_type = None
    if keyword:
        keyword_lower = keyword.lower()
        # Food & Dining
        if any(x in keyword_lower for x in ["restaurant", "food", "dining", "eat"]):
            business_type = "restaurant"
        elif any(x in keyword_lower for x in ["cafe", "coffee", "tea"]):
            business_type = "cafe"
        elif any(x in keyword_lower for x in ["bar", "pub", "drink"]):
            business_type = "bar"
        elif any(x in keyword_lower for x in ["bakery", "bread", "pastry"]):
            business_type = "bakery"
        elif any(x in keyword_lower for x in ["nightclub", "club"]):
            business_type = "night_club"
        # Retail
        elif any(x in keyword_lower for x in ["retail", "store", "shop", "shopping"]):
            business_type = "store"
        elif any(x in keyword_lower for x in ["clothing", "clothes", "apparel", "fashion"]):
            business_type = "clothing_store"
        elif any(x in keyword_lower for x in ["shoe", "footwear"]):
            business_type = "shoe_store"
        elif any(x in keyword_lower for x in ["book", "bookstore"]):
            business_type = "book_store"
        elif any(x in keyword_lower for x in ["electronics", "phone", "computer", "technology", "tech"]):
            business_type = "electronics_store"
        elif any(x in keyword_lower for x in ["jewelry", "jewellery"]):
            business_type = "jewelry_store"
        elif any(x in keyword_lower for x in ["furniture"]):
            business_type = "furniture_store"
        elif any(x in keyword_lower for x in ["pet", "animal"]):
            business_type = "pet_store"
        elif any(x in keyword_lower for x in ["hardware", "tools"]):
            business_type = "hardware_store"
        elif any(x in keyword_lower for x in ["supermarket", "grocery"]):
            business_type = "supermarket"
        elif any(x in keyword_lower for x in ["convenience"]):
            business_type = "convenience_store"
        elif any(x in keyword_lower for x in ["department"]):
            business_type = "department_store"
        # Health & Beauty
        elif any(x in keyword_lower for x in ["salon", "hair", "barber"]):
            business_type = "beauty_salon"
        elif any(x in keyword_lower for x in ["spa", "massage"]):
            business_type = "spa"
        elif any(x in keyword_lower for x in ["gym", "fitness", "workout"]):
            business_type = "gym"
        elif any(x in keyword_lower for x in ["pharmacy", "drug"]):
            business_type = "pharmacy"
        elif any(x in keyword_lower for x in ["doctor", "medical", "clinic"]):
            business_type = "doctor"
        elif any(x in keyword_lower for x in ["dentist", "dental"]):
            business_type = "dentist"
        # Automotive
        elif any(x in keyword_lower for x in ["gas", "fuel", "station", "petrol"]):
            business_type = "gas_station"
        elif any(x in keyword_lower for x in ["car wash", "auto wash"]):
            business_type = "car_wash"
        elif any(x in keyword_lower for x in ["car repair", "auto repair", "mechanic"]):
            business_type = "car_repair"
        # Services
        elif any(x in keyword_lower for x in ["bank", "banking"]):
            business_type = "bank"
        elif any(x in keyword_lower for x in ["laundry", "dry clean"]):
            business_type = "laundry"
        elif any(x in keyword_lower for x in ["real estate", "realtor"]):
            business_type = "real_estate_agency"

    # If no specific type matched, use "store" as default
    if not business_type:
        business_type = "store"

    # Single type search with keyword
    params = {
        "location": f"{lat},{lng}",
        "radius": radius,
        "type": business_type,
        "key": GDC_API_KEY,
    }
    if keyword:
        params["keyword"] = keyword

    response = requests.get(url, params=params)
    data = response.json()

    if "results" not in data:
        print("No results found or invalid response:", data)
        return []
    
    results = data["results"]

    # Filter out shopping centers/malls
    filtered_results = []
    exclude_types = {"shopping_mall"}
    exclude_keywords = ["mall", "plaza", "crossroads", "common", "shopping center", 
                       "shopping centre", "square shopping", "outlet center"]
    
    for place in results:
        # Check if place has mall-related types
        place_types = set(place.get("types", []))
        if place_types.intersection(exclude_types):
            continue
            
        # Check if name contains mall/plaza keywords
        name = place.get("name", "").lower()
        if any(keyword in name for keyword in exclude_keywords):
            continue
            
        filtered_results.append(place)
    
    return filtered_results


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
