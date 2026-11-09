from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"
PROCESSED = ROOT / "data" / "processed"
DAILY = ROOT / "data" / "daily"
APP_DATA = ROOT / "app" / "public" / "data"

CITIES = {
    "bengaluru": {
        "prefix": "BLR",
        "wards_file": "blr.geojson",
        "name_field": "KGISWardName",
        "number_field": "KGISWardNo",
        "state": "Karnataka",
        "district": "Bangalore",
        "osm_area": "Bengaluru",
    },
    "pune": {
        "prefix": "PUN",
        "wards_file": "pune_admin.geojson",
        "name_field": "name",
        "number_field": None,
        "state": "Maharashtra",
        "district": "Pune",
        "osm_area": "Pune",
    },
}

CATEGORIES = [
    "fast_food", "tea_stall", "restaurant", "pharmacy", "grocery", "tailor",
    "phone_repair", "salon", "bakery", "fruit_veg", "stationery", "laundry",
]

OSM_TAG_TO_CATEGORY = {
    ("amenity", "fast_food"): "fast_food",
    ("amenity", "cafe"): "tea_stall",
    ("amenity", "restaurant"): "restaurant",
    ("amenity", "pharmacy"): "pharmacy",
    ("shop", "chemist"): "pharmacy",
    ("shop", "convenience"): "grocery",
    ("shop", "supermarket"): "grocery",
    ("shop", "general"): "grocery",
    ("shop", "tailor"): "tailor",
    ("shop", "clothes"): "tailor",
    ("shop", "mobile_phone"): "phone_repair",
    ("shop", "electronics"): "phone_repair",
    ("shop", "hairdresser"): "salon",
    ("shop", "beauty"): "salon",
    ("shop", "bakery"): "bakery",
    ("shop", "greengrocer"): "fruit_veg",
    ("shop", "stationery"): "stationery",
    ("shop", "laundry"): "laundry",
    ("shop", "dry_cleaning"): "laundry",
}

TRADE_KEYWORDS = {
    "fast_food": ["fast food", "chats", "chaat", "snack", "darshini"],
    "tea_stall": ["tea", "coffee", "juice", "condiment"],
    "restaurant": ["restaurant", "hotel", "mess", "eatery"],
    "pharmacy": ["medical", "pharma", "chemist", "drug"],
    "grocery": ["provision", "grocery", "kirana", "general store", "super market", "supermarket"],
    "tailor": ["tailor", "garment", "readymade"],
    "phone_repair": ["mobile", "cell phone", "electronic"],
    "salon": ["saloon", "salon", "beauty", "barber", "hair"],
    "bakery": ["bakery", "sweet", "confection"],
    "fruit_veg": ["fruit", "vegetable"],
    "stationery": ["stationery", "xerox", "book"],
    "laundry": ["laundry", "dry clean", "dhobi"],
}
