import {copyFileSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
const app=resolve(dirname(fileURLToPath(import.meta.url)),'..'),root=resolve(app,'..');
mkdirSync(resolve(app,'public/downloads'),{recursive:true});
mkdirSync(resolve(app,'public/data/real'),{recursive:true});
for(const name of ['business_pois.csv','weather_hourly.csv'])copyFileSync(resolve(root,'data/real',name),resolve(app,'public/downloads',name));
for(const name of ['manifest.json'])copyFileSync(resolve(root,'data/real',name),resolve(app,'public/data/real',name));
copyFileSync(resolve(root,'models/weather_report.json'),resolve(app,'public/data/real/weather_report.json'));
// Vercel serves the browser application; Render hosts the API. The URL is public configuration.
const raw=process.env.VITE_BACKEND_URL||'';
if(raw){const url=new URL(raw);if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash)throw Error('VITE_BACKEND_URL must be a plain HTTPS service URL');}
console.log('Prepared sourced CSV downloads and offline metadata.');
