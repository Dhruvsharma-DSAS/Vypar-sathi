import csv
import hashlib
import json
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from backend import main

@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(main, 'DB', tmp_path/'test.sqlite3')
    monkeypatch.setenv('VYAPAR_OBSERVATIONS_ENABLED','true')
    return TestClient(main.app)

def auth(client):
    r=client.post('/api/v1/sessions')
    assert r.status_code==201
    return {'Authorization':'Bearer '+r.json()['token']}

def record():
    return {'id':'test-observation-1','table':'prices','row':{'city':'pune','item':'onion','unit':'kg','price':35,'transport':0,'supplier_type':'wholesale'}}

def test_observations_are_private_and_retry_safe(client):
    a,b=auth(client),auth(client)
    assert client.post('/api/v1/observations',json=record()).status_code==401
    assert client.post('/api/v1/observations',headers=a,json=record()).json()['duplicate'] is False
    assert client.post('/api/v1/observations',headers=a,json=record()).json()['duplicate'] is True
    assert len(client.get('/api/v1/observations',headers=a).json()['records'])==1
    assert client.get('/api/v1/observations',headers=b).json()['records']==[]
    altered=record();altered['row']['price']=40
    assert client.post('/api/v1/observations',headers=a,json=altered).status_code==409
    assert client.post('/api/v1/observations',headers=b,json=record()).status_code==200

@pytest.mark.parametrize('change',[{'price':-1},{'lat':91,'lng':73},{'item':''},{'unknown':'bad'},{'lat':18}])
def test_bad_observations_rejected(client,change):
    r=record();r['row'].update(change)
    assert client.post('/api/v1/observations',headers=auth(client),json=r).status_code==422

def test_count_requires_full_ten_minutes(client):
    r={'id':'footfall-1','table':'footfall','row':{'city':'pune','count':186,'duration_min':1}}
    assert client.post('/api/v1/observations',headers=auth(client),json=r).status_code==422

FINANCE={'selling_price':60,'unit_cost':16.58,'fixed_monthly_cost':9000,'startup_cost':42000,'available_capital':30000,'daily_units':45,'operating_days':26}

def test_finance_uses_operating_days_and_rejects_bad_terms(client):
    result=client.post('/api/v1/planner/finance',json=FINANCE)
    assert result.status_code==200
    assert result.json()['estimated_monthly_profit']==41801.4
    assert result.json()['break_even_units_per_day']==8
    assert result.json()['funding_gap']==21000
    assert client.post('/api/v1/planner/finance',json={**FINANCE,'loan_term_months':0}).status_code==422
    assert client.post('/api/v1/planner/finance',json={**FINANCE,'operating_days':32}).status_code==422

def test_pilot_mismatched_expenses_and_negative_values(client):
    assert client.post('/api/v1/planner/pilot',json={'sales_by_day':[10,20],'forecast_units_per_day':15,'daily_expenses':[1]}).status_code==422
    assert client.post('/api/v1/planner/pilot',json={'sales_by_day':[-10],'forecast_units_per_day':15}).status_code==422

@pytest.mark.parametrize('name',['pois','weather'])
def test_real_dataset_integrity(client,name):
    manifest=client.get('/api/v1/datasets').json()['datasets'][name]
    path=main.DATA/manifest['file']
    assert hashlib.sha256(path.read_bytes()).hexdigest()==manifest['sha256']
    with path.open(newline='',encoding='utf-8') as f:
        rows=list(csv.DictReader(f))
    assert len(rows)==manifest['rows']>10000
    assert len({r['record_id'] for r in rows})==len(rows)
    assert all(r['source_url'].startswith('https://') and r['retrieved_at_utc'] and r['license'] for r in rows)
    assert client.get(f'/api/v1/datasets/{name}/download').status_code==200

def test_market_filters_and_pagination(client):
    a=client.get('/api/v1/market/pois?city=pune&category=restaurant&limit=2').json()
    b=client.get('/api/v1/market/pois?city=pune&category=restaurant&limit=2&offset=2').json()
    assert all(r['city']=='pune' and r['category']=='restaurant' for r in a['records'])
    assert a['records'][0]['record_id']!=b['records'][0]['record_id']
    assert client.get('/api/v1/market/pois?city=unknown').status_code==422

def test_weather_failure_is_explicit(client,monkeypatch):
    monkeypatch.setenv('VYAPAR_EXTERNAL_APIS_ENABLED','true')
    main._weather_cache.clear()
    def failed(*args,**kwargs):
        raise main.requests.ConnectionError('offline')
    monkeypatch.setattr(main.requests,'get',failed)
    assert client.get('/api/v1/weather?city=pune').status_code==503
    main._weather_cache['pune']={'time':0,'response':{'city':'pune','stale':False}}
    assert client.get('/api/v1/weather?city=pune').json()['stale'] is True
    main._weather_cache.clear()

def test_model_predicts_and_rejects_impossible_inputs(client):
    row={'city':'pune','timestamp_local':'2026-11-09T12:00','temperature_c':25,'relative_humidity_pct':70,'precipitation_mm':0,'wind_speed_kmh':8}
    result=client.post('/api/v1/ml/weather-next-hour',json=row)
    assert result.status_code==200
    assert 10<result.json()['temperature_c']<50
    assert result.json()['target_timestamp_local']=='2026-11-09T13:00'
    assert client.post('/api/v1/ml/weather-next-hour',json={**row,'relative_humidity_pct':110}).status_code==422


def test_external_apis_disabled_by_default(client,monkeypatch):
    monkeypatch.delenv('VYAPAR_EXTERNAL_APIS_ENABLED',raising=False)
    def forbidden(*args,**kwargs):
        pytest.fail('No external request should be made')
    monkeypatch.setattr(main.requests,'get',forbidden)
    assert client.get('/api/v1/weather?city=pune').status_code==503


def test_advisor_web_research_returns_only_cited_https_sources(client, monkeypatch):
    from backend.core import advisor

    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    monkeypatch.setattr(advisor, "recent_calls", advisor.deque())

    class Response:
        status_code = 200

        def raise_for_status(self):
            pass

        def json(self):
            return {"candidates": [{
                "content": {"parts": [{"text": "Ask nearby shops for repair quotes."}]},
                "groundingMetadata": {
                    "groundingChunks": [
                        {"web": {"title": "Local source", "uri": "https://example.org/repair"}},
                        {"web": {"title": "Uncited", "uri": "https://example.org/irrelevant"}},
                        {"web": {"title": "Unsafe", "uri": "javascript:alert(1)"}},
                    ],
                    "groundingSupports": [{"groundingChunkIndices": [0, 2, 0, -1]}],
                },
            }]}

    def grounded_request(url, *, headers, json, timeout):
        assert url.startswith("https://generativelanguage.googleapis.com/")
        assert headers == {"x-goog-api-key": "test-key"}
        assert json["tools"] == [{"googleSearch": {}}]
        return Response()

    monkeypatch.setattr(advisor.requests, "post", grounded_request)
    payload = {"text": "Bicycle repair near a college in Pune", "research": True}
    response = client.post("/api/v1/advisor/chat", json=payload)
    assert response.status_code == 200
    assert response.json()["sources"] == [{"title": "Local source", "url": "https://example.org/repair"}]

    monkeypatch.setattr(advisor, "web_sources", lambda candidate: [])
    assert client.post("/api/v1/advisor/chat", json=payload).status_code == 502


def test_advisor_reports_missing_configuration(client, monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    assert client.get("/api/v1/advisor/status").json() == {"provider": None, "research": False}
    assert client.post("/api/v1/advisor/chat", json={"text": "Hello"}).status_code == 503
