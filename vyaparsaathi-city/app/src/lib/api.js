import { mappedCategories } from './analyser.js';
export async function loadJson(path){const res=await fetch(path);if(!res.ok)throw new Error('Could not load '+path);return res.json()}
export async function askAI(task,payload){try{const res=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({task,payload}),signal:AbortSignal.timeout(task==="advisor_reply"?27000:12000)});if(!res.ok)return null;return await res.json()}catch{return null}}
const BACKEND_URL=(import.meta.env.VITE_BACKEND_URL||'').replace(/\/$/,'');
async function snapshot(path){
 if(path==='/datasets')return loadJson('/data/real/manifest.json');
 if(path==='/ml/report')return loadJson('/data/real/weather_report.json');
 if(path.startsWith('/market/pois?')){const params=new URLSearchParams(path.split('?')[1]);const city=params.get('city');if(!['bengaluru','pune'].includes(city))throw Error('Unknown city');const data=await loadJson('/data/real/'+city+'_map.json');const category=params.get('category'),q=(params.get('q')||'').toLowerCase(),offset=Number(params.get('offset')||0),limit=Number(params.get('limit')||30);const records=data.points.filter(p=>(!category||p.category===category)&&(!q||(p.name+' '+p.category).toLowerCase().includes(q))).map(p=>({record_id:p.id,city,name:p.name,category:p.category,latitude:p.lat,longitude:p.lng,source_updated_at:p.updated,source_url:'https://www.openstreetmap.org/'+p.id}));return {city,total:records.length,city_total:data.total,categories:data.categories,category_options:mappedCategories(data.density),records:records.slice(offset,offset+limit),preview:true,preview_count:data.preview_count};}
 throw Error('Backend unavailable');
}
export async function backend(path,options={}){try{const res=await fetch(BACKEND_URL+'/api/v1'+path,{...options,headers:{'Content-Type':'application/json',...options.headers},signal:AbortSignal.timeout(15000)});if(!res.ok)throw Error('Backend request failed ('+res.status+').');return await res.json()}catch(error){if(!options.method||options.method==='GET')return snapshot(path);throw error}}
export async function getWeather(city){try{const result=await backend('/weather?city='+encodeURIComponent(city));return {...result.data,stale:result.stale,cached_at:Date.parse(result.retrieved_at_utc)}}catch{return null}}


export async function advisorStatus() {
  try {
    if (import.meta.env.DEV || !BACKEND_URL) return await askAI("advisor_status", {});
    const response = await fetch(BACKEND_URL + "/api/v1/advisor/status", {
      signal: AbortSignal.timeout(12000),
    });
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}

export async function advisorReply(payload) {
  if (!BACKEND_URL || (import.meta.env.DEV && !payload.research)) {
    return payload.research ? null : askAI("advisor_reply", payload);
  }
  try {
    const response = await fetch(BACKEND_URL + "/api/v1/advisor/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(27000),
    });
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}
