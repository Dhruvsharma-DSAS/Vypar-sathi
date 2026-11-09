import json
import numpy as np
import pandas as pd
import geopandas as gpd
from config import PROCESSED, ROOT, CITIES, CATEGORIES

BASE_PER10K = {
    "fast_food": 6.0, "tea_stall": 5.0, "restaurant": 4.0, "pharmacy": 2.0, "grocery": 7.0,
    "tailor": 2.5, "phone_repair": 2.0, "salon": 3.0, "bakery": 1.5, "fruit_veg": 2.5,
    "stationery": 1.2, "laundry": 1.0,
}

BLR_STATIONS = [
    ["Indiranagar", 12.9783, 77.6385, "office"],
    ["MG Road", 12.9755, 77.6067, "office"],
    ["Majestic (Kempegowda)", 12.9757, 77.5729, "transit"],
    ["Central Silk Board", 12.9177, 77.6238, "office"],
    ["Baiyappanahalli", 12.9907, 77.6525, "residential"],
    ["Yeshwanthpur", 13.0237, 77.5530, "market"],
]

PUNE_SPOTS = [
    ["Phoenix Mall / Viman Nagar", 18.5622, 73.9167, "mall"],
    ["Ramwadi metro, Nagar Road", 18.5530, 73.9110, "office"],
    ["Kalyani Nagar", 18.5463, 73.9033, "residential"],
    ["Yerawada market", 18.5560, 73.8930, "market"],
    ["Kharadi bypass", 18.5520, 73.9400, "office"],
]

SHAPES = {
    "office": [1, 0, 0, 0, 0, 3, 18, 62, 100, 85, 45, 30, 32, 38, 30, 28, 40, 70, 96, 88, 55, 30, 15, 4],
    "transit": [2, 0, 0, 0, 0, 6, 25, 60, 88, 80, 60, 50, 52, 55, 52, 55, 66, 85, 100, 90, 62, 38, 18, 5],
    "residential": [1, 0, 0, 0, 0, 5, 30, 70, 85, 55, 30, 25, 25, 28, 26, 30, 45, 75, 100, 80, 50, 28, 12, 3],
    "market": [1, 0, 0, 0, 2, 12, 35, 55, 70, 75, 72, 68, 65, 60, 58, 62, 72, 88, 100, 82, 50, 25, 10, 2],
    "mall": [0, 0, 0, 0, 0, 0, 4, 10, 18, 22, 35, 50, 62, 65, 60, 58, 66, 82, 100, 98, 80, 45, 15, 2],
}


def weekend_from(weekday):
    out = []
    for i, v in enumerate(weekday):
        if 7 <= i <= 10:
            out.append(round(v * 0.45))
        elif 11 <= i <= 21:
            out.append(min(100, round(v * 1.15)))
        else:
            out.append(v)
    return out


def counts(city, seed):
    rng = np.random.default_rng(seed)
    wards = gpd.read_file(PROCESSED / city / "wards.geojson")
    rows = []
    for _, w in wards.iterrows():
        row = {"ward_id": w["ward_id"]}
        for cat in CATEGORIES:
            lam = BASE_PER10K[cat] * w["population"] / 10000 * rng.uniform(0.25, 1.6)
            row[cat] = int(rng.poisson(max(lam, 0.1)))
        rows.append(row)
    pd.DataFrame(rows).set_index("ward_id").to_csv(PROCESSED / city / "osm_counts.csv")


def rush(city, spots, label):
    out = {}
    for name, lat, lng, kind in spots:
        wd = SHAPES[kind]
        out[name] = {"name": name, "lat": lat, "lng": lng, "kind": kind,
                     "weekday": wd, "weekend": weekend_from(wd), "source": label}
    (PROCESSED / city / "rush_clock.json").write_text(json.dumps(out, indent=1))


def daily():
    folder = ROOT / "data" / "daily"
    folder.mkdir(parents=True, exist_ok=True)
    mandi = {
        "date": "2026-10-19", "sample": True,
        "bengaluru": {"Onion": 31.5, "Tomato": 24.0, "Cabbage": 14.0, "Potato": 26.0, "Green Chilli": 42.0, "Coriander(Leaves)": 55.0, "Lemon": 60.0, "Carrot": 34.0},
        "pune": {"Onion": 28.0, "Tomato": 22.0, "Cabbage": 12.5, "Potato": 24.0, "Green Chilli": 38.0, "Coriander(Leaves)": 48.0, "Lemon": 55.0, "Carrot": 30.0},
        "last_month": {"Onion": 26.0, "Tomato": 30.0, "Cabbage": 13.0, "Potato": 25.0},
    }
    (folder / "mandi_today.json").write_text(json.dumps(mandi, indent=1))
    news = {
        "date": "2026-10-19", "sample": True,
        "bengaluru": {
            "summary": "Sample: office footfall strong around Koramangala and Indiranagar this week; road work near Silk Board slows evening traffic; Deepavali shopping expected to raise evening demand.",
            "items": [
                {"title": "Sample: New co-working block opens near Koramangala 80 Feet Road", "tag": "demand_up"},
                {"title": "Sample: Road widening near Silk Board junction for 3 weeks", "tag": "risk"},
                {"title": "Sample: Deepavali markets expected to draw heavy crowds", "tag": "festival"},
            ],
        },
        "pune": {
            "summary": "Sample: Nagar Road metro stretch busy at peak hours; drive against encroachment near Yerawada market; Diwali shopping rush expected.",
            "items": [
                {"title": "Sample: Metro ridership rises on Ramwadi stretch", "tag": "demand_up"},
                {"title": "Sample: Encroachment drive near Yerawada market this weekend", "tag": "risk"},
                {"title": "Sample: Diwali shopping rush expected in Viman Nagar malls", "tag": "festival"},
            ],
        },
    }
    (folder / "news_today.json").write_text(json.dumps(news, indent=1))


if __name__ == "__main__":
    counts("bengaluru", 3)
    counts("pune", 5)
    rush("bengaluru", BLR_STATIONS, "sample shape - replace with BMRCL data (05_metro_hourly.py)")
    rush("pune", PUNE_SPOTS, "sample - replace with Ground Truth 10-minute counts")
    daily()
    print("Sample data written. Everything is marked sample.")
