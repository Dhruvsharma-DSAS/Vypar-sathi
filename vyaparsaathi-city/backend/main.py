"""Local hackathon API. Device tokens scope observations; no identity provider required."""
import csv
import hashlib
import json
import os
import secrets
import sqlite3
import time
from collections import Counter
from contextlib import contextmanager
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path
from typing import Annotated, Literal

import requests
from fastapi import Depends, FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, ConfigDict, Field, model_validator
from .core import planner
from .core.advisor import router as advisor_router

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data' / 'real'
DB = Path(os.environ.get('VYAPAR_DB_PATH', str(ROOT / 'data' / 'observations.sqlite3')))
CITIES = {'bengaluru': (12.9716, 77.5946), 'pune': (18.5204, 73.8567)}
app = FastAPI(title='VyaparSaathi Unified API', version='2.0.0')
app.include_router(advisor_router)
app.add_middleware(CORSMiddleware, allow_origins=os.environ.get('CORS_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173').split(','), allow_methods=['GET', 'POST'], allow_headers=['Content-Type', 'Authorization'], allow_credentials=False)

@contextmanager
def db():
    DB.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(DB, timeout=10) as conn:
        conn.execute('PRAGMA foreign_keys=ON')
        conn.execute('CREATE TABLE IF NOT EXISTS devices (token_hash TEXT PRIMARY KEY, created_at TEXT NOT NULL)')
        conn.execute('CREATE TABLE IF NOT EXISTS observations (id TEXT NOT NULL, owner TEXT NOT NULL REFERENCES devices(token_hash), kind TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY(owner,id))')
        yield conn

class Strict(BaseModel):
    model_config = ConfigDict(extra='forbid', allow_inf_nan=False)

class Finance(Strict):
    selling_price: float = Field(ge=0, le=1e7)
    unit_cost: float = Field(ge=0, le=1e7)
    fixed_monthly_cost: float = Field(ge=0, le=1e9)
    startup_cost: float = Field(ge=0, le=1e9)
    available_capital: float = Field(ge=0, le=1e9)
    daily_units: float = Field(default=0, ge=0, le=1e6)
    annual_interest_rate: float = Field(default=12, ge=0, le=100)
    loan_term_months: int = Field(default=12, ge=1, le=360)
    operating_days: int = Field(default=30, ge=1, le=31)

class Score(Strict):
    demand: float = Field(ge=0, le=100)
    competition: float = Field(ge=0, le=100)
    skill: float = Field(ge=0, le=100)
    budget: float = Field(ge=0, le=100)
    supply: float = Field(ge=0, le=100)
    timing: float = Field(ge=0, le=100)

class Pilot(Strict):
    sales_by_day: list[Annotated[float, Field(ge=0, le=1e6)]] = Field(min_length=1, max_length=7)
    forecast_units_per_day: float = Field(gt=0, le=1e6)
    selling_price: float | None = Field(default=None, ge=0, le=1e7)
    unit_cost: float | None = Field(default=None, ge=0, le=1e7)
    daily_expenses: list[Annotated[float, Field(ge=0, le=1e9)]] | None = Field(default=None, max_length=7)

class ObservationData(Strict):
    city: Literal['bengaluru', 'pune']
    ward_id: str | None = Field(default=None, max_length=80)
    lat: float | None = Field(default=None, ge=-90, le=90)
    lng: float | None = Field(default=None, ge=-180, le=180)
    spot_name: str | None = Field(default=None, max_length=200)
    start_time: datetime | None = None
    duration_min: int | None = Field(default=None, ge=10, le=10)
    count: int | None = Field(default=None, ge=0, le=100000)
    day_type: Literal['weekday', 'weekend'] | None = None
    kind: Literal['shop', 'cart_spot'] | None = None
    size_sqft: float | None = Field(default=None, gt=0, le=1e7)
    rent_month: float | None = Field(default=None, gt=0, le=1e9)
    item: str | None = Field(default=None, max_length=200)
    unit: Literal['kg', 'piece', 'litre', 'batch'] | None = None
    price: float | None = Field(default=None, gt=0, le=1e9)
    supplier_type: Literal['wholesale', 'retail', 'online'] | None = None
    transport: float | None = Field(default=None, ge=0, le=1e9)

class Observation(Strict):
    id: str = Field(pattern=r'^[a-zA-Z0-9_-]{8,80}$')
    table: Literal['footfall', 'rents', 'prices']
    row: ObservationData

    @model_validator(mode='after')
    def required_fields(self):
        required = {'footfall': ['ward_id', 'spot_name', 'start_time', 'duration_min', 'count', 'day_type'],
                    'rents': ['ward_id', 'kind', 'size_sqft', 'rent_month'],
                    'prices': ['item', 'unit', 'price', 'supplier_type', 'transport']}[self.table]
        if any(getattr(self.row, key) is None or getattr(self.row, key) == '' for key in required):
            raise ValueError('Missing fields for ' + self.table)
        if (self.row.lat is None) != (self.row.lng is None):
            raise ValueError('Provide both coordinates or neither')
        return self

def owner(authorization: Annotated[str | None, Header()] = None):
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(401, 'Device token required')
    digest = hashlib.sha256(authorization[7:].encode()).hexdigest()
    with db() as conn:
        if not conn.execute('SELECT 1 FROM devices WHERE token_hash=?', (digest,)).fetchone():
            raise HTTPException(401, 'Unknown device token')
    return digest

@app.get('/api/v1/health')
def health():
    with db() as conn:
        conn.execute('SELECT 1')
    return {'status': 'ok', 'version': '2.1.0', 'storage': 'sqlite', 'datasets_ready': (DATA / 'manifest.json').exists()}

@app.post('/api/v1/sessions', status_code=201)
def session():
    if os.environ.get('VYAPAR_OBSERVATIONS_ENABLED') != 'true':
        raise HTTPException(403, 'Private observation collection is disabled')
    token = secrets.token_urlsafe(32)
    with db() as conn:
        conn.execute('INSERT INTO devices VALUES (?,?)', (hashlib.sha256(token.encode()).hexdigest(), datetime.now(timezone.utc).isoformat()))
    return {'token': token, 'scope': 'device observations only'}

@app.post('/api/v1/observations')
def save_observation(record: Observation, device: str = Depends(owner)):
    payload = record.row.model_dump_json(exclude_none=True)
    with db() as conn:
        inserted = conn.execute('INSERT OR IGNORE INTO observations VALUES (?,?,?,?,?)', (record.id, device, record.table, payload, datetime.now(timezone.utc).isoformat())).rowcount
        previous = conn.execute('SELECT kind,payload FROM observations WHERE owner=? AND id=?', (device, record.id)).fetchone()
        if not inserted:
            if previous != (record.table, payload):
                raise HTTPException(409, 'This ID already belongs to a different observation')
            return {'id': record.id, 'duplicate': True}
    return {'id': record.id, 'duplicate': False}

@app.get('/api/v1/observations')
def observations(device: str = Depends(owner), limit: int = Query(100, ge=1, le=500)):
    with db() as conn:
        rows = conn.execute('SELECT id,kind,payload,created_at FROM observations WHERE owner=? ORDER BY created_at DESC LIMIT ?', (device, limit)).fetchall()
    return {'records': [{'id': r[0], 'table': r[1], 'row': json.loads(r[2]), 'created_at': r[3]} for r in rows]}

@app.post('/api/v1/planner/finance')
def finance(req: Finance):
    return planner.calculate_financial_plan(**req.model_dump())

@app.post('/api/v1/planner/score')
def score(req: Score):
    return planner.calculate_opportunity_score(req.model_dump())

@app.post('/api/v1/planner/pilot')
def pilot(req: Pilot):
    try:
        return planner.evaluate_pilot(**req.model_dump())
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc

@app.get('/api/v1/datasets')
def datasets():
    path = DATA / 'manifest.json'
    if not path.exists():
        raise HTTPException(503, 'Run scripts/collect_real_data.py first')
    return json.loads(path.read_text())

@app.get('/api/v1/datasets/{name}/download')
def download(name: Literal['pois', 'weather']):
    filename = {'pois': 'business_pois.csv', 'weather': 'weather_hourly.csv'}[name]
    path = DATA / filename
    if not path.exists():
        raise HTTPException(404, 'Dataset not collected')
    return FileResponse(path, media_type='text/csv', filename=filename)

@lru_cache(maxsize=2)
def poi_rows(mtime):
    with (DATA / 'business_pois.csv').open(newline='', encoding='utf-8') as f:
        return list(csv.DictReader(f))

@app.get('/api/v1/market/pois')
def pois(city: Literal['bengaluru', 'pune'], category: str = Query('', max_length=80), q: str = Query('', max_length=100), limit: int = Query(30, ge=1, le=100), offset: int = Query(0, ge=0, le=1000000)):
    path = DATA / 'business_pois.csv'
    if not path.exists():
        raise HTTPException(503, 'POI data not collected')
    rows = [r for r in poi_rows(path.stat().st_mtime_ns) if r['city'] == city]
    counts = Counter(r['category'] for r in rows)
    filtered = [r for r in rows if (not category or r['category'] == category) and (not q or q.casefold() in (r['name'] + ' ' + r['category']).casefold())]
    return {'city': city, 'total': len(filtered), 'city_total': len(rows), 'categories': counts.most_common(15), 'category_options': sorted(counts.items(), key=lambda item: item[0].casefold()), 'records': filtered[offset:offset+limit], 'offset': offset, 'data_kind': 'mapped_poi_snapshot', 'warning': 'Mapped places are not sales, footfall, or a complete business census.'}

_weather_cache = {}
@app.get('/api/v1/weather')
def weather(city: Literal['bengaluru', 'pune']):
    if os.environ.get('VYAPAR_EXTERNAL_APIS_ENABLED') != 'true':
        raise HTTPException(503, 'External APIs disabled. Configure your chosen weather service before enabling it.')
    cached = _weather_cache.get(city)
    now = time.time()
    if cached and now - cached['time'] < 900:
        return {**cached['response'], 'cache_hit': True}
    lat, lon = CITIES[city]
    try:
        response = requests.get('https://api.open-meteo.com/v1/forecast', params={'latitude': lat, 'longitude': lon, 'current': 'temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m', 'hourly': 'temperature_2m,precipitation_probability', 'forecast_days': 2, 'timezone': 'Asia/Kolkata'}, timeout=12)
        response.raise_for_status()
        value = response.json()
        if not value.get('current') or not value.get('hourly'):
            raise ValueError('Incomplete weather response')
        result = {'city': city, 'data': value, 'retrieved_at_utc': datetime.now(timezone.utc).isoformat(), 'stale': False, 'data_kind': 'weather_model_forecast', 'source_url': response.url, 'license': 'CC-BY-4.0'}
        _weather_cache[city] = {'time': now, 'response': result}
        return result
    except (requests.RequestException, ValueError):
        if cached:
            return {**cached['response'], 'stale': True}
        raise HTTPException(503, 'Weather provider unavailable; no live values fabricated')

@app.get('/api/v1/ml/report')
def model_report():
    path = ROOT / 'models' / 'weather_report.json'
    if not path.exists():
        raise HTTPException(404, 'Train with python scripts/train_weather_model.py')
    return json.loads(path.read_text())

class WeatherInput(Strict):
    city: Literal['bengaluru', 'pune']
    timestamp_local: str = Field(pattern=r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$')
    temperature_c: float = Field(ge=-30, le=60)
    relative_humidity_pct: float = Field(ge=0, le=100)
    precipitation_mm: float = Field(ge=0, le=500)
    wind_speed_kmh: float = Field(ge=0, le=300)

    @model_validator(mode='after')
    def valid_time(self):
        datetime.fromisoformat(self.timestamp_local)
        return self

@lru_cache(maxsize=2)
def load_model(mtime):
    import joblib
    return joblib.load(ROOT / 'models' / 'weather_next_hour.joblib')

@app.post('/api/v1/ml/weather-next-hour')
def predict_weather(req: WeatherInput):
    from datetime import timedelta
    from .core.weather_features import features
    path = ROOT / 'models' / 'weather_next_hour.joblib'
    if not path.exists():
        raise HTTPException(503, 'Train the weather model first')
    prediction = float(load_model(path.stat().st_mtime_ns).predict([features(req.model_dump())])[0])
    return {'temperature_c': round(prediction,2), 'target_timestamp_local': (datetime.fromisoformat(req.timestamp_local)+timedelta(hours=1)).isoformat(timespec='minutes'), 'timezone': 'Asia/Kolkata', 'model': 'HistGradientBoostingRegressor', 'limitation': 'Experimental weather context. Reanalysis-trained model; live model inputs may shift the error. No sales prediction.'}
