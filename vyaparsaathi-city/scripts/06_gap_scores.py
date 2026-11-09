import json
import shutil
import numpy as np
import pandas as pd
import geopandas as gpd
from config import PROCESSED, APP_DATA, CITIES, CATEGORIES


def load_counts(city):
    total = None
    sources = []
    for fname, label in [("osm_counts.csv", "osm"), ("licence_counts.csv", "trade_licence"), ("survey_counts.csv", "survey")]:
        path = PROCESSED / city / fname
        if not path.exists():
            continue
        df = pd.read_csv(path, index_col="ward_id")
        sources.append(label)
        if total is None:
            total = df
        else:
            total = total.combine(df, np.maximum, fill_value=0)
    return total, sources


def confidence(pop_source, sources):
    points = 0
    if pop_source in ["census2011", "worldpop"]:
        points += 1
    if "trade_licence" in sources:
        points += 1
    if "osm" in sources:
        points += 1
    if "survey" in sources:
        points += 1
    if pop_source == "sample":
        return "sample"
    if points >= 3:
        return "high"
    if points == 2:
        return "medium"
    return "low"


def build(city):
    wards = gpd.read_file(PROCESSED / city / "wards.geojson")
    counts, sources = load_counts(city)
    if counts is None:
        print(city, "no counts found - run 03/04 or make_sample_data.py first")
        return
    stats = []
    per10k_table = {}
    for cat in CATEGORIES:
        per10k_table[cat] = []
    for _, w in wards.iterrows():
        pop = max(int(w["population"]), 1)
        row = {"ward_id": w["ward_id"], "name": w["name"], "population": int(w["population"]),
               "area_km2": float(w["area_km2"]), "lat": float(w["lat"]), "lng": float(w["lng"]),
               "counts": {}, "per10k": {}, "gap": {}}
        for cat in CATEGORIES:
            n = 0
            if w["ward_id"] in counts.index and cat in counts.columns:
                n = int(counts.loc[w["ward_id"], cat])
            row["counts"][cat] = n
            value = round(n / pop * 10000, 2)
            row["per10k"][cat] = value
            per10k_table[cat].append(value)
        stats.append(row)
    medians = {}
    for cat in CATEGORIES:
        medians[cat] = float(np.median(per10k_table[cat]))
    for row in stats:
        for cat in CATEGORIES:
            m = medians[cat]
            if m <= 0:
                row["gap"][cat] = 0
            else:
                g = (m - row["per10k"][cat]) / m
                row["gap"][cat] = round(min(max(g, 0), 1), 2)
        row["confidence"] = confidence(wards["pop_source"].iloc[0], sources)
        row["sources"] = sources + [wards["pop_source"].iloc[0]]
    out = {"city": city, "medians_per10k": medians, "wards": stats}
    (PROCESSED / city / "ward_stats.json").write_text(json.dumps(out))
    print(city, "ward_stats.json written, sources:", sources)


def copy_to_app():
    APP_DATA.mkdir(parents=True, exist_ok=True)
    for city in CITIES:
        target = APP_DATA / city
        target.mkdir(exist_ok=True)
        for f in (PROCESSED / city).glob("*.json"):
            shutil.copy(f, target / f.name)
        shutil.copy(PROCESSED / city / "wards.geojson", target / "wards.geojson")
    common = APP_DATA / "common"
    common.mkdir(exist_ok=True)
    for f in (PROCESSED / "common").glob("*.json"):
        shutil.copy(f, common / f.name)
    daily = APP_DATA / "daily"
    daily.mkdir(exist_ok=True)
    for f in (PROCESSED.parent / "daily").glob("*.json"):
        shutil.copy(f, daily / f.name)
    print("Copied data into app/public/data")


if __name__ == "__main__":
    for city in CITIES:
        build(city)
    copy_to_app()
