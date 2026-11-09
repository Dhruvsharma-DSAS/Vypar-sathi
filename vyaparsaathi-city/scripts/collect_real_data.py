"""Download public source records. No fabricated rows, prices, sales or labels."""
import argparse
import csv
import hashlib
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'data' / 'real'
CITIES = {'bengaluru': (12.9716, 77.5946, '12.75,77.35,13.20,77.85'),
          'pune': (18.5204, 73.8567, '18.35,73.65,18.75,74.05')}
SESSION = requests.Session()
SESSION.headers['User-Agent'] = 'VyaparSaathi-Hackathon/1.0 (public research data collection)'

def fetch(url, **kwargs):
    r = SESSION.get(url, timeout=180, **kwargs)
    r.raise_for_status()
    value = r.json()
    if 'error' in value or 'remark' in value:
        raise RuntimeError(str(value.get('reason', value.get('remark', value))))
    return value, r.url

def write_csv(name, rows):
    if not rows:
        raise RuntimeError('No rows received for ' + name)
    path = OUT / name
    temp = path.with_suffix('.tmp')
    with temp.open('w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)
    temp.replace(path)
    return {'file': name, 'rows': len(rows), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
            'columns': list(rows[0]), 'missing_values': {k: sum(r[k] in ('', None) for r in rows) for k in rows[0]}}

def collect_pois():
    rows, sources, seen = [], [], set()
    retrieved = datetime.now(timezone.utc).isoformat()
    for city, (_, _, bbox) in CITIES.items():
        query = f'[out:json][timeout:150];(nwr["shop"]({bbox});nwr["amenity"~"restaurant|cafe|fast_food|marketplace|bank|school|college|hospital|pharmacy"]({bbox}););out center meta;'
        errors = []
        for endpoint in ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']:
            try:
                data, url = fetch(endpoint, params={'data': query})
                break
            except (requests.RequestException, RuntimeError) as exc:
                errors.append(str(exc))
        else:
            raise RuntimeError('; '.join(errors))
        (OUT / f'{city}_osm_raw.json').write_text(json.dumps(data), encoding='utf-8')
        sources.append({'city': city, 'url': url, 'bbox': bbox, 'source_timestamp': data.get('osm3s', {}).get('timestamp_osm_base'), 'query': query})
        for e in data.get('elements', []):
            uid = f"{e['type']}/{e['id']}"
            if uid in seen:
                continue
            seen.add(uid)
            tags = e.get('tags', {})
            center = e.get('center', e)
            if 'lat' not in center or 'lon' not in center:
                continue
            rows.append({'record_id': uid, 'city': city, 'name': tags.get('name', ''),
                         'category': tags.get('shop') or tags.get('amenity', ''),
                         'category_kind': 'shop' if tags.get('shop') else 'amenity',
                         'latitude': center['lat'], 'longitude': center['lon'],
                         'opening_hours': tags.get('opening_hours', ''), 'cuisine': tags.get('cuisine', ''),
                         'wheelchair': tags.get('wheelchair', ''), 'osm_version': e.get('version', ''),
                         'source_updated_at': e.get('timestamp', ''), 'retrieved_at_utc': retrieved,
                         'source_url': f'https://www.openstreetmap.org/{uid}', 'license': 'ODbL-1.0',
                         'data_kind': 'mapped_poi_snapshot'})
        print(city, 'POIs so far:', len(rows), flush=True)
    if len(rows) <= 10000:
        raise RuntimeError(f'Only {len(rows)} unique POIs; refusing to claim >10000.')
    result = write_csv('business_pois.csv', rows)
    result.update({'sources': sources, 'unique_key': 'record_id', 'data_kind': 'mapped_poi_snapshot',
                   'limitations': 'OSM coverage is incomplete. Bounding boxes include suburbs. Object edit time is not field verification. Nodes and polygons may describe the same business.'})
    return result

def collect_weather():
    rows, sources = [], []
    retrieved = datetime.now(timezone.utc)
    # Reanalysis has publication latency. Stop at seven days before collection.
    end = (retrieved - timedelta(days=7)).date()
    start = end - timedelta(days=364)
    for city, (lat, lon, _) in CITIES.items():
        data, url = fetch('https://archive-api.open-meteo.com/v1/archive', params={
            'latitude': lat, 'longitude': lon, 'start_date': str(start), 'end_date': str(end),
            'hourly': 'temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m',
            'timezone': 'Asia/Kolkata', 'models': 'era5'})
        (OUT / f'{city}_weather_raw.json').write_text(json.dumps(data), encoding='utf-8')
        sources.append({'city': city, 'url': url, 'start_date': str(start), 'end_date': str(end), 'units': data['hourly_units']})
        hourly = data['hourly']
        for i, timestamp in enumerate(hourly['time']):
            values = [hourly[k][i] for k in ['temperature_2m', 'relative_humidity_2m', 'precipitation', 'wind_speed_10m']]
            if any(v is None for v in values):
                continue
            rows.append(dict(zip(['record_id', 'city', 'timestamp_local', 'timezone', 'latitude', 'longitude',
                                  'temperature_c', 'relative_humidity_pct', 'precipitation_mm', 'wind_speed_kmh',
                                  'retrieved_at_utc', 'source_url', 'license', 'data_kind'],
                                 [f'{city}/{timestamp}', city, timestamp, 'Asia/Kolkata', data['latitude'], data['longitude'],
                                  *values, retrieved.isoformat(), url, 'CC-BY-4.0', 'ERA5_reanalysis'])))
        print(city, 'weather rows so far:', len(rows), flush=True)
    result = write_csv('weather_hourly.csv', rows)
    result.update({'sources': sources, 'unique_key': 'record_id', 'data_kind': 'historical_reanalysis',
                   'limitations': 'ERA5 model reanalysis, not a street sensor or live sales observation. Weather grid coordinates differ from the requested city center.'})
    return result

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--allow-network', action='store_true', help='Explicitly allow public-source downloads')
    parser.add_argument('--only', choices=['pois', 'weather', 'all'], default='all')
    args = parser.parse_args()
    if not args.allow_network:
        parser.error("External downloads disabled. Review the sources and pass --allow-network only when you choose to refresh them.")
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / 'manifest.json'
    manifest = json.loads(path.read_text()) if path.exists() else {'datasets': {}}
    for name, collector in [('pois', collect_pois), ('weather', collect_weather)]:
        if args.only in ('all', name):
            manifest['datasets'][name] = collector()
            manifest['generated_at_utc'] = datetime.now(timezone.utc).isoformat()
            temp = path.with_suffix('.tmp')
            temp.write_text(json.dumps(manifest, indent=2), encoding='utf-8')
            temp.replace(path)
    print(json.dumps({k: v['rows'] for k, v in manifest['datasets'].items()}))

if __name__ == '__main__':
    main()
