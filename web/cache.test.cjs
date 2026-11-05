const {test}=require('node:test'),assert=require('node:assert/strict'),express=require('express');
const {createResponseCache}=require('./response-cache');
test('30 parallel reads share one load; expiry refreshes and errors never poison cache',async()=>{
 let now=0,calls=0,fail=false;
 const app=express(),cache=createResponseCache({ttl:100,now:()=>now,maxEntries:2,maxBytes:1024});
 app.get('/:key',(req,res,next)=>cache(req.params.key,req,res,next),async(req,res)=>{calls++;await new Promise(r=>setTimeout(r,30));res.status(fail?502:200).json({calls});});
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const url='http://127.0.0.1:'+server.address().port;
 try{
  const batch=await Promise.all(Array.from({length:30},()=>fetch(url+'/week').then(r=>r.json())));
  assert.equal(calls,1);assert(batch.every(r=>r.calls===1));
  assert.equal((await fetch(url+'/week')).headers.get('x-team-hub-cache'),'HIT');assert.equal(calls,1);
  now=101;await fetch(url+'/week');assert.equal(calls,2);
  fail=true;assert.equal((await fetch(url+'/failure')).status,502);fail=false;assert.equal((await fetch(url+'/failure')).status,200);assert.equal(calls,4);
  await fetch(url+'/third');await fetch(url+'/week');assert.equal(calls,6,'old entries evicted at the configured bound');
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
