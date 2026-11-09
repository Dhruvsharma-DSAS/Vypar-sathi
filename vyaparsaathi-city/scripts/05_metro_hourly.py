import json
import pandas as pd
from config import RAW, PROCESSED


def build():
    path = RAW / "bmrcl_hourly.xlsx"
    if not path.exists():
        print("Put the BMRCL station-wise hourly file at data/raw/bmrcl_hourly.xlsx")
        return
    df = pd.read_excel(path)
    df.columns = [str(c).strip() for c in df.columns]
    hour_cols = [c for c in df.columns if "Hrs" in c]
    df["date"] = pd.to_datetime(df["BUSINESS DATE"], dayfirst=True, errors="coerce")
    df["day_type"] = "weekday"
    df.loc[df["date"].dt.dayofweek >= 5, "day_type"] = "weekend"
    for c in hour_cols:
        df[c] = pd.to_numeric(df[c], errors="coerce").fillna(0)
    coords = {}
    station_file = RAW / "metro_stations.csv"
    if station_file.exists():
        s = pd.read_csv(station_file)
        for _, r in s.iterrows():
            coords[str(r["name"]).strip().lower()] = [r["lat"], r["lng"]]
    result = {}
    for station, group in df.groupby("STATION"):
        entry = {"name": station, "lat": None, "lng": None, "weekday": [], "weekend": []}
        key = str(station).strip().lower()
        if key in coords:
            entry["lat"] = coords[key][0]
            entry["lng"] = coords[key][1]
        peak = group[hour_cols].mean().max()
        for day_type in ["weekday", "weekend"]:
            part = group[group["day_type"] == day_type]
            if len(part) == 0:
                part = group
            avg = part[hour_cols].mean()
            values = []
            for c in hour_cols:
                if peak > 0:
                    values.append(round(float(avg[c]) / float(peak) * 100))
                else:
                    values.append(0)
            entry[day_type] = values
        entry["daily_riders"] = int(group["TOTAL"].mean())
        result[station] = entry
    out = PROCESSED / "bengaluru" / "rush_clock.json"
    out.write_text(json.dumps(result, indent=1))
    print("Saved", len(result), "stations")


if __name__ == "__main__":
    build()
