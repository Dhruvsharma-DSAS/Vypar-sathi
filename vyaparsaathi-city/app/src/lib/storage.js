export function readStore(key, fallback) { try {const value=JSON.parse(localStorage.getItem(key)); return value ?? fallback;} catch {return fallback;} }
export function writeStore(key,value) {try {localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}}
export function downloadJson(name,value){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export function planKey(p){return `plan_${p.city}_${p.businessId||'momo_cart'}_${p.wardId||'unselected'}`;}
export function localDate(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
