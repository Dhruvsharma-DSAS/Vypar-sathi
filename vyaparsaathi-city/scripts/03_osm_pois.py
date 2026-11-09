import json
import time
import urllib.parse
import urllib.request
import geopandas as gpd
import pandas as pd
from shapely.geometry import Point
from config import RAW, PROCESSED, CITIES, CATEGORIES, OSM_TAG_TO_CATEGORY

OVERPASS = "https://overpass-api.de/api/interpreter"

QUERY = """
[out:json][timeout:180];
(
  node["shop"]({s},{w},{n},{e});
  node["amenity"~"fast_food|cafe|restaurant|pharmacy|school|college|university|bank"]({s},{w},{n},{e});
  node["office"]({s},{w},{n},{e});
  node["railway"="station"]({s},{w},{n},{e});
  node["highway"="bus_stop"]({s},{w},{n},{e});
);
out body;
"""


def download(city, wards):
    cache = RAW / f"{city}_osm.json"
    if cache.exists():
        return json.loads(cache.read_text())
    w, s, e, n = wards.total_bounds
    q = QUERY.format(s=round(s, 4), w=round(w, 4), n=round(n, 4), e=round(e, 4))
    body = urllib.parse.urlencode({"data": q}).encode()
    req = urllib.request.Request(OVERPASS, data=body, headers={"User-Agent": "VyaparSaathiCity/1.0 (student project)"})
    with urllib.request.urlopen(req, timeout=300) as r:
        data = json.loads(r.read())
    cache.write_text(json.dumps(data))
    time.sleep(5)
    return data


def classify(tags):
    for (key, value), cat in OSM_TAG_TO_CATEGORY.items():
        if tags.get(key) == value:
            return cat
    if tags.get("amenity") in ["school", "college", "university"]:
        return "education"
    if "office" in tags:
        return "office"
    if tags.get("railway") == "station":
        return "station"
    if tags.get("highway") == "bus_stop":
        return "bus_stop"
    return None


def build(city, cfg):
    wards = gpd.read_file(PROCESSED / city / "wards.geojson")
    data = download(city, wards)
    rows = []
    for el in data.get("elements", []):
        cat = classify(el.get("tags", {}))
        if cat is None:
            continue
        rows.append({"osm_id": el["id"], "category": cat, "name": el.get("tags", {}).get("name", ""),
                     "geometry": Point(el["lon"], el["lat"])})
    pois = gpd.GeoDataFrame(rows, crs=4326)
    joined = gpd.sjoin(pois, wards[["ward_id", "geometry"]], predicate="within", how="inner")
    counts = joined.groupby(["ward_id", "category"]).size().unstack(fill_value=0)
    counts.to_csv(PROCESSED / city / "osm_counts.csv")
    hubs = joined[joined.category.isin(["station", "bus_stop", "education", "office"])]
    hubs = hubs[["osm_id", "category", "name", "ward_id", "geometry"]]
    hubs.to_file(PROCESSED / city / "hubs.geojson", driver="GeoJSON", COORDINATE_PRECISION=5)
    print(city, len(pois), "OSM points,", len(hubs), "hubs")


if __name__ == "__main__":
    for city, cfg in CITIES.items():
        build(city, cfg)
