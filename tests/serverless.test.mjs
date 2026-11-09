import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/chat.js';

test('root serverless entry loads the ESM advisor and returns a controlled fallback',async()=>{
 const previous=process.env.VYAPAR_EXTERNAL_APIS_ENABLED;
 process.env.VYAPAR_EXTERNAL_APIS_ENABLED='false';
 let status,payload;
 const response={status(code){status=code;return this},json(value){payload=value}};
 try{
  await handler({method:'POST',body:{task:'extract_profile',payload:{text:'hello',asked:'money',wards:['Viman Nagar']}}},response);
  assert.equal(status,502);
  assert.equal(payload.fallback,'rules');
 }finally{if(previous===undefined)delete process.env.VYAPAR_EXTERNAL_APIS_ENABLED;else process.env.VYAPAR_EXTERNAL_APIS_ENABLED=previous}
});
