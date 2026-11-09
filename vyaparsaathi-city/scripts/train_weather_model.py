"""Train a weather context model on real ERA5 history, with chronological holdout."""
import csv
import hashlib
import json
import math
from datetime import datetime, timedelta, timezone
from pathlib import Path
import joblib
import sklearn
import numpy as np
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error

ROOT = Path(__file__).resolve().parents[1]
import sys
sys.path.insert(0, str(ROOT))
from backend.core.weather_features import features, FEATURE_NAMES
DATA = ROOT / 'data/real/weather_hourly.csv'
OUT = ROOT / 'models'

def main():
    with DATA.open(newline='') as f:
        rows = list(csv.DictReader(f))
    lookup = {(r['city'], r['timestamp_local']): r for r in rows}
    samples = []
    for row in rows:
        next_time = (datetime.fromisoformat(row['timestamp_local']) + timedelta(hours=1)).isoformat(timespec='minutes')
        target = lookup.get((row['city'], next_time))
        if target:
            samples.append((row, target))
    samples.sort(key=lambda pair: pair[1]['timestamp_local'])
    # Split on target timestamp, shared across cities. No shuffled neighbors in holdout.
    times = sorted({target['timestamp_local'] for _, target in samples})
    split = times[int(len(times)*0.8)]
    train = [(a,b) for a,b in samples if b['timestamp_local'] < split]
    test = [(a,b) for a,b in samples if b['timestamp_local'] >= split]
    model = HistGradientBoostingRegressor(max_iter=150, max_leaf_nodes=15, l2_regularization=2, random_state=42)
    model.fit(np.array([features(r) for r,_ in train]), np.array([float(t['temperature_c']) for _,t in train]))
    truth = np.array([float(t['temperature_c']) for _,t in test])
    predictions = model.predict(np.array([features(r) for r,_ in test]))
    baseline = np.array([float(r['temperature_c']) for r,_ in test])
    mae = float(mean_absolute_error(truth,predictions))
    baseline_mae = float(mean_absolute_error(truth,baseline))
    report = {'scikit_learn_version': sklearn.__version__, 'task': 'Next-hour city-grid temperature in Celsius', 'model': 'HistGradientBoostingRegressor',
              'data_kind': 'ERA5 historical reanalysis', 'dataset_sha256': hashlib.sha256(DATA.read_bytes()).hexdigest(),
              'trained_at_utc': datetime.now(timezone.utc).isoformat(), 'training_rows': len(train), 'test_rows': len(test),
              'split': '80/20 chronological holdout by target timestamp shared across both cities', 'test_starts_at_local': split,
              'mae_c': round(mae,4), 'rmse_c': round(float(math.sqrt(mean_squared_error(truth,predictions))),4),
              'persistence_baseline_mae_c': round(baseline_mae,4), 'beats_baseline': mae < baseline_mae,
              'feature_names': ['temperature_c','relative_humidity_pct','precipitation_mm','wind_speed_kmh','hour_sin','hour_cos','day_of_year_sin','day_of_year_cos','is_pune'],
              'limitations': ['This is a weather context prototype, not a sales, profit, demand, or business success model.', 'Holdout is from the same two city grids and one year. Additional seasons and rolling validation are needed.', 'ERA5 is model reanalysis, not a street sensor. Live forecast inputs can shift its error.', 'No fabricated vendor outcomes or rule-generated success labels were used.'],
              'business_model_status': 'Awaiting consented vendor-day sales, prices, operating hours, stockouts, location and verified weather joins.'}
    OUT.mkdir(exist_ok=True)
    joblib.dump(model, OUT/'weather_next_hour.joblib')
    (OUT/'weather_report.json').write_text(json.dumps(report,indent=2))
    with (OUT/'weather_holdout_predictions.csv').open('w',newline='') as f:
        w=csv.writer(f);w.writerow(['city','target_timestamp_local','actual_temperature_c','predicted_temperature_c','persistence_temperature_c'])
        w.writerows([r['city'],t['timestamp_local'],y,round(float(p),4),b] for (r,t),y,p,b in zip(test,truth,predictions,baseline))
    print(json.dumps(report,indent=2))

if __name__=='__main__':
    main()
