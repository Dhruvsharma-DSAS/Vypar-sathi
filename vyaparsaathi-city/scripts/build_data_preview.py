"""Build small static previews from existing downloaded CSVs. No network access."""
import csv,json,math
from collections import Counter
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'app/public/data/real'
OUT.mkdir(exist_ok=True)
m=json.loads((ROOT/'data/real/manifest.json').read_text())
with (ROOT/'data/real/business_pois.csv').open(newline='',encoding='utf-8') as f:rows=list(csv.DictReader(f))
summary={'generated_at_utc':m['generated_at_utc'],'total_pois':len(rows),'weather_hours':m['datasets']['weather']['rows'],'cities':{}}
for city in ['bengaluru','pune']:
 group=[r for r in rows if r['city']==city]
 # Equally spaced source rows are a map rendering preview, never extra observations.
 count=min(1200,len(group))
 selected=[group[int(i*len(group)/count)] for i in range(count)]
 points=[{'id':r['record_id'],'name':r['name'],'category':r['category'],'lat':float(r['latitude']),'lng':float(r['longitude']),'updated':r['source_updated_at']} for r in selected]
 cells={}
 for r in group:
  lat,lng=float(r['latitude']),float(r['longitude']);cell=(math.floor(lat*100),math.floor(lng*100))
  if cell not in cells:cells[cell]={'lat':cell[0]/100+.005,'lng':cell[1]/100+.005,'count':0,'categories':{}}
  cells[cell]['count']+=1;c=r['category'];cells[cell]['categories'][c]=cells[cell]['categories'].get(c,0)+1
  if r['name'] and ('landmark' not in cells[cell] or (c in ['school','college','hospital'] and cells[cell]['landmark']['category'] not in ['school','college','hospital'])):
   cells[cell]['landmark']={'name':r['name'],'category':c,'source_url':r['source_url']}
 payload={'density':list(cells.values()),'city':city,'total':len(group),'preview_count':len(points),'retrieved_at_utc':group[0]['retrieved_at_utc'],'points':points,'categories':Counter(r['category'] for r in group).most_common(8)}
 (OUT/(city+'_map.json')).write_text(json.dumps(payload,separators=(',',':')))
 summary['cities'][city]={'total':len(group),'categories':payload['categories']}
(OUT/'summary.json').write_text(json.dumps(summary,indent=2))
print('Built real-data previews without external requests.')
