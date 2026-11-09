import glob
import pandas as pd
import geopandas as gpd
from config import RAW, PROCESSED, TRADE_KEYWORDS


def find_column(df, words):
    for w in words:
        for col in df.columns:
            if w in col.lower():
                return col
    return None


def to_category(text):
    low = str(text).lower()
    for cat, words in TRADE_KEYWORDS.items():
        for w in words:
            if w in low:
                return cat
    return None


def build():
    files = glob.glob(str(RAW / "bbmp_trade_licences" / "*.csv"))
    if len(files) == 0:
        print("No trade licence CSVs found in data/raw/bbmp_trade_licences - skipping")
        return
    frames = []
    for f in files:
        frames.append(pd.read_csv(f, low_memory=False))
    df = pd.concat(frames, ignore_index=True)
    trade_col = find_column(df, ["trade type", "trade_type", "minor", "major", "trade"])
    ward_col = find_column(df, ["ward name", "ward_name", "ward"])
    print("Using columns:", trade_col, "|", ward_col)
    df["category"] = df[trade_col].apply(to_category)
    df = df[df["category"].notna()]
    wards = gpd.read_file(PROCESSED / "bengaluru" / "wards.geojson")
    name_to_id = {}
    for _, w in wards.iterrows():
        name_to_id[str(w["name"]).strip().lower()] = w["ward_id"]
    ids = []
    for value in df[ward_col]:
        key = str(value).strip().lower()
        if key in name_to_id:
            ids.append(name_to_id[key])
        else:
            ids.append(None)
    df["ward_id"] = ids
    matched = df[df["ward_id"].notna()]
    print("Matched", len(matched), "of", len(df), "licences to wards")
    counts = matched.groupby(["ward_id", "category"]).size().unstack(fill_value=0)
    counts.to_csv(PROCESSED / "bengaluru" / "licence_counts.csv")


if __name__ == "__main__":
    build()
