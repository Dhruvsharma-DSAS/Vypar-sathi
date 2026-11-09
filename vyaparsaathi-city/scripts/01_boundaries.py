import json
import geopandas as gpd
from config import RAW, PROCESSED, CITIES


def build(city, cfg):
    gdf = gpd.read_file(RAW / cfg["wards_file"]).to_crs(4326)
    gdf = gdf[gdf.geometry.notna()].reset_index(drop=True)
    names = []
    ids = []
    for i, row in gdf.iterrows():
        name = str(row[cfg["name_field"]]).strip()
        if city == "pune":
            name = name.split(" ", 3)[-1] if name.startswith("Admin Ward") else name
        names.append(name)
        if cfg["number_field"]:
            number = int(str(row[cfg["number_field"]]).strip())
        else:
            number = i + 1
        ids.append(f"{cfg['prefix']}-{number:03d}")
    gdf["ward_id"] = ids
    gdf["name"] = names
    metric = gdf.to_crs(32643)
    gdf["area_km2"] = (metric.geometry.area / 1e6).round(3)
    cent = metric.geometry.centroid.to_crs(4326)
    gdf["lat"] = cent.y.round(5)
    gdf["lng"] = cent.x.round(5)
    gdf["geometry"] = gdf.geometry.simplify(0.0004, preserve_topology=True)
    out = gdf[["ward_id", "name", "area_km2", "lat", "lng", "geometry"]]
    folder = PROCESSED / city
    folder.mkdir(parents=True, exist_ok=True)
    out.to_file(folder / "wards.geojson", driver="GeoJSON", COORDINATE_PRECISION=5)
    print(city, len(out), "wards saved")


if __name__ == "__main__":
    for city, cfg in CITIES.items():
        build(city, cfg)
