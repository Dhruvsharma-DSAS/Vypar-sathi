import {defineConfig,loadEnv} from 'vite';
import react from '@vitejs/plugin-react';
import {readdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import chat from './api/chat.js';
function apiMiddleware(server){server.middlewares.use('/api/chat',async(req,res)=>{let body='';try{for await(const part of req){body+=part;if(body.length>16000){res.statusCode=413;res.end('Request too large');return}}req.body=body?JSON.parse(body):{};const response={status(code){res.statusCode=code;return this},json(value){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(value))}};await chat(req,response)}catch{res.statusCode=400;res.end(JSON.stringify({error:'Invalid request'}))}})}
function offline(){return {name:'vyaparsaathi-offline',closeBundle(){
 const walk=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(dir,e.name)):[join(dir,e.name)]);
 const files=walk('dist').filter(x=>!x.endsWith('sw.js')&&!x.includes('/downloads/'));
 const hash=createHash('sha256');for(const f of files)hash.update(readFileSync(f));const version=hash.digest('hex').slice(0,12);
 const html=readFileSync('dist/index.html','utf8');const entryAssets=[...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map(m=>m[1]);
 const homeFiles=files.filter(f=>/\/assets\/(Home-|money-|analyser-|SaathiBot-|geist-latin-wght)/.test(f)||(/\/data\//.test(f)&&!f.includes('/real/'))).map(f=>'/'+f.slice(5));
 const urls=['/','/index.html','/manifest.json','/icon.svg','/icon-192.png','/icon-512.png',...new Set([...entryAssets,...homeFiles])];
 writeFileSync('dist/sw.js',`const CACHE='vyaparsaathi-${version}';const FILES=${JSON.stringify(urls)};
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('vyaparsaathi-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==location.origin||u.pathname.startsWith('/api/')||u.pathname.startsWith('/downloads/'))return;
if(e.request.mode==='navigate'){e.respondWith(fetch(e.request).catch(()=>caches.match('/index.html')));return}
if(!u.pathname.startsWith('/assets/')&&!u.pathname.startsWith('/data/')&&!['/manifest.json','/icon.svg','/icon-192.png','/icon-512.png'].includes(u.pathname))return;
e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request).then(r=>{if(r.ok){const copy=r.clone();e.waitUntil(caches.open(CACHE).then(cache=>cache.put(e.request,copy)))}return r})))})`)
}};}
export default defineConfig(({mode})=>{const env=loadEnv(mode,process.cwd(),'');process.env.VYAPAR_EXTERNAL_APIS_ENABLED=env.VYAPAR_EXTERNAL_APIS_ENABLED==='true'?'true':'false';if(process.env.VYAPAR_EXTERNAL_APIS_ENABLED==='true')for(const key of ['GROQ_API_KEY','GROQ_MODEL','GEMINI_API_KEY','GEMINI_MODEL'])if(env[key])process.env[key]=env[key];return {server:{proxy:{'/api/v1':{target:env.VYAPAR_BACKEND_URL||'http://127.0.0.1:8000',changeOrigin:true}}},preview:{proxy:{'/api/v1':{target:env.VYAPAR_BACKEND_URL||'http://127.0.0.1:8000',changeOrigin:true}}},plugins:[react(),{name:'local-api',configureServer:apiMiddleware,configurePreviewServer:apiMiddleware},offline()]}});
