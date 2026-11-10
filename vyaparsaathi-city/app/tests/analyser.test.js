import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compareCells,economics,categoryOf,evidenceCSV} from '../src/lib/analyser.js';
const load=p=>JSON.parse(readFileSync(new URL('../public/data/'+p,import.meta.url)));
const types=load('common/business_types.json'), common={recipes:load('common/recipes.json'),mandi:load('daily/mandi_today.json')};
test('cell comparison excludes sparse mapping and preserves observed category share',()=>{const r=compareCells([{lat:1,count:9,categories:{cafe:0}},{lat:2,count:20,categories:{cafe:2,school:3}},{lat:3,count:30,categories:{cafe:1}}],['cafe']);assert.equal(r.length,2);assert.equal(r[0].lat,3);assert.equal(r[1].share,.1);assert.equal(r[1].anchors,3);assert.equal(r[0].peers,1)});
test('real city grids conserve all downloaded records and category counts',()=>{for(const city of ['bengaluru','pune']){const data=load('real/'+city+'_map.json');assert.equal(data.density.reduce((n,c)=>n+c.count,0),data.total);for(const r of compareCells(data.density,['restaurant','fast_food'])){assert.ok(r.peers<=r.count);assert.ok(r.share>=0&&r.share<=1)}}});
test('stress scenario reduces profit and uses 26 operating days for break-even',()=>{const t=types.find(t=>t.id==='momo_cart'),base=economics(t,common,'bengaluru'),stress=economics(t,common,'bengaluru',{sales:.7,costRise:.15});assert.equal(base.cashNeeded,51000);assert.equal(base.breakEven,8);assert.ok(Math.abs(base.profit-41801.4)<.01);assert.ok(stress.profit<base.profit);assert.ok(stress.breakEven>=base.breakEven);assert.equal(categoryOf(types.find(t=>t.id==='tiffin_service')),'home')});

test('evidence CSV quotes names and neutralises spreadsheet formulas',()=>{const csv=evidenceCSV([{lat:1,lng:2,count:20,peers:2,share:.1,anchors:3,landmark:{name:'=SUM(1,2)'}}],'pune','2026-11-09','food');assert.ok(csv.includes('"\'=SUM(1,2)"'));assert.ok(csv.includes('"10.00"'));assert.equal(csv.split('\r\n').length,3)});
