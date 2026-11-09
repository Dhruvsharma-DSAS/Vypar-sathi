import math
from datetime import datetime

FEATURE_NAMES = ['temperature_c', 'relative_humidity_pct', 'precipitation_mm', 'wind_speed_kmh', 'hour_sin', 'hour_cos', 'day_of_year_sin', 'day_of_year_cos', 'is_pune']

def features(row):
    timestamp = datetime.fromisoformat(row['timestamp_local'])
    return [float(row[k]) for k in FEATURE_NAMES[:4]] + [math.sin(timestamp.hour * math.tau / 24), math.cos(timestamp.hour * math.tau / 24), math.sin(timestamp.timetuple().tm_yday * math.tau / 365.25), math.cos(timestamp.timetuple().tm_yday * math.tau / 365.25), float(row['city'] == 'pune')]
