import json
import numpy as np
import pandas as pd
import geopandas as gpd
from config import RAW, PROCESSED, CITIES


def from_worldpop(wards, tif):
    from rasterstats import zonal_stats
    stats = zonal_stats(wards.geometry, str(tif), stats=["sum"], nodata=-99999)
    values = []
    for s in stats:
        if s["sum"] is None:
            values.append(0)
        else:
            values.append(int(round(s["sum"])))
    return values


def from_census(wards, csv_path, ward_col, pop_col):
    df = pd.read_csv(csv_path)
    df["ward_key"] = df[ward_col].astype(str).str.strip().str.lower()
    lookup = dict(zip(df["ward_key"], df[pop_col]))
    values = []
    for name in wards["name"]:
        key = str(name).strip().lower()
        if key in lookup:
            values.append(int(lookup[key]))
        else:
            values.append(None)
    return values


def sample_population(wards, seed):
    rng = np.random.default_rng(seed)
    metric = wards.to_crs(32643)
    cx = metric.geometry.centroid.x
    cy = metric.geometry.centroid.y
    dist_km = np.sqrt((cx - cx.mean()) ** 2 + (cy - cy.mean()) ** 2) / 1000
    density = 28000 * np.exp(-dist_km / 9) + rng.normal(0, 1500, len(wards))
    density = np.clip(density, 2500, None)
    return [int(v) for v in density * wards["area_km2"].values]


def build(city, cfg):
    path = PROCESSED / city / "wards.geojson"
    wards = gpd.read_file(path)
    tif = RAW / f"{city}_worldpop.tif"
    census = RAW / f"{city}_census_2011.csv"
    if tif.exists():
        wards["population"] = from_worldpop(wards, tif)
        wards["pop_source"] = "worldpop"
    elif census.exists():
        wards["population"] = from_census(wards, census, "Ward Name", "Total Population")
        wards["pop_source"] = "census2011"
    else:
        wards["population"] = sample_population(wards, 11)
        wards["pop_source"] = "sample"
    wards.to_file(path, driver="GeoJSON", COORDINATE_PRECISION=5)
    print(city, "population source:", wards["pop_source"].iloc[0], "total:", int(wards["population"].sum()))


if __name__ == "__main__":
    for city, cfg in CITIES.items():
        build(city, cfg)
