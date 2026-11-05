'use strict';
// Cache only successful public guest reads. Concurrent callers share one load.
function createResponseCache({ttl=60000,maxEntries=80,maxBytes=16*1024*1024,now=Date.now}={}){
 const cache=new Map(),pending=new Map();let bytes=0;
 function drop(key){const old=cache.get(key);if(old){bytes-=old.size;cache.delete(key)}}
 return function cached(key,req,res,next){
  const hit=cache.get(key);
  const edge=(remaining)=>res.set('Vercel-CDN-Cache-Control','public, s-maxage='+Math.max(0,Math.floor(remaining/1000)));
  if(hit&&hit.until>now()){edge(hit.until-now());res.set('X-Team-Hub-Cache','HIT');return res.type('json').send(hit.text)}
  if(hit)drop(key);
  if(pending.has(key)){
   res.set('X-Team-Hub-Cache','SHARED');
   return pending.get(key).then(result=>{if(!res.destroyed&&!res.writableEnded){if(result.status===200)edge(result.until-now());res.status(result.status).type('json').send(result.text)}});
  }
  // Keep burst traffic bounded even when visitors request different periods.
  if(pending.size>=20)return res.status(503).json({message:'Đang đồng bộ nhiều kỳ. Vui lòng thử lại sau.'});
  let complete,settled=false;
  pending.set(key,new Promise(resolve=>{complete=resolve}));
  function settle(result){if(settled)return;settled=true;pending.delete(key);complete(result)}
  res.once('close',()=>settle({status:503,text:JSON.stringify({message:'Lượt đồng bộ bị ngắt. Vui lòng thử lại.'})}));
  const json=res.json.bind(res);
  res.json=body=>{
   const text=JSON.stringify(body),size=Buffer.byteLength(text),status=res.statusCode,until=now()+ttl;
   if(status===200&&size<=maxBytes){
    while(cache.size>=maxEntries||bytes+size>maxBytes)drop(cache.keys().next().value);
    cache.set(key,{text,size,until});bytes+=size;
   }
   if(status===200)edge(ttl);
   settle({status,text,until});return json(body);
  };
  res.set('X-Team-Hub-Cache','MISS');return next();
 };
}
module.exports={createResponseCache};
