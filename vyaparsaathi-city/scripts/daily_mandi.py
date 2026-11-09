import json
import os
import urllib.parse
import urllib.request
from datetime import date
from config import DAILY, CITIES

RESOURCE_ID = os.environ.get("MANDI_RESOURCE_ID", "9ef84268-d588-465a-a308-a864a43d0070")
API_KEY = os.environ.get("DATA_GOV_API_KEY", "")
COMMODITIES = ["Onion", "Tomato", "Cabbage", "Potato", "Green Chilli", "Coriander(Leaves)", "Lemon", "Carrot"]


def fetch(state, district):
    for suffix in ["", ".keyword"]:
        params = {"api-key": API_KEY, "format": "json", "limit": "1000",
                  "filters[state" + suffix + "]": state, "filters[district" + suffix + "]": district}
        url = f"https://api.data.gov.in/resource/{RESOURCE_ID}?" + urllib.parse.urlencode(params)
        with urllib.request.urlopen(url, timeout=60) as r:
            records = json.loads(r.read()).get("records", [])
        if len(records) > 0:
            return records
    return []


def to_rs_per_kg(records):
    result = {}
    for c in COMMODITIES:
        prices = []
        for rec in records:
            if rec.get("commodity") == c:
                try:
                    value = float(rec.get("modal_price", 0)) / 100
                    if value > 0:
                        prices.append(value)
                except ValueError:
                    pass
        if len(prices) > 0:
            prices.sort()
            result[c] = round(prices[len(prices) // 2], 2)
    return result


def main():
    if API_KEY == "":
        print("Set DATA_GOV_API_KEY first")
        return
    out_path = DAILY / "mandi_today.json"
    old = {}
    if out_path.exists():
        old = json.loads(out_path.read_text())
    # A failed or empty refresh must never relabel a sample snapshot as live.
    out = {"date": old.get("date", str(date.today())), "sample": False, "city_meta": {}}
    fresh_all = True
    for city, cfg in CITIES.items():
        try:
            records = fetch(cfg["state"], cfg["district"])
        except Exception as exc:
            print("Market refresh failed:", city, type(exc).__name__)
            records = []
        prices = to_rs_per_kg(records)
        complete = all(c in prices for c in COMMODITIES)
        if not complete:
            fresh_all = False
            prices = {**old.get(city, {}), **prices}
            out[city + "_note"] = "incomplete refresh - retained last known prices and snapshot date"
            if old.get("sample", True):
                out["sample"] = True
        out["city_meta"][city] = {"fresh": complete, "retrieved_on": str(date.today()), "arrival_dates": sorted({r.get("arrival_date", "unknown") for r in records})}
        out[city] = prices
    if fresh_all:
        out["date"] = str(date.today())
    if "bengaluru" in old:
        out["last_month"] = old.get("last_month", old["bengaluru"])
    out_path.write_text(json.dumps(out, indent=1))
    print("mandi_today.json updated")


if __name__ == "__main__":
    main()
