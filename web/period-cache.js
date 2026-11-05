'use strict';
const fs=require('fs/promises'),path=require('path'),{createHash}=require('crypto');
function createPeriodCache(dir=path.join(require('./runtime-paths').dataDir,'closed-periods'),clock=()=>new Date()){
  const pending=new Map();
  async function month(start,end,scope,fetcher,currentMonth){
    if(start.slice(0,7)>=currentMonth)return fetcher(start,end);
    const key=createHash('sha256').update(JSON.stringify({version:1,scope,month:start.slice(0,7)})).digest('hex'),file=path.join(dir,key+'.json');
    try{const saved=JSON.parse(await fs.readFile(file,'utf8'));if(saved.start!==start||saved.end!==end||!Array.isArray(saved.issues)||saved.truncated)throw Error('Bản lưu kỳ không hợp lệ');return {...saved,cacheHit:true}}catch(e){if(e.code!=='ENOENT')throw Error('Không đọc được bản lưu '+start.slice(0,7)+': '+e.message)}
    if(pending.has(key))return pending.get(key);
    const job=(async()=>{const data=await fetcher(start,end);if(data.truncated)throw Error('Dữ liệu '+start.slice(0,7)+' chưa đầy đủ, chưa lưu kỳ.');const saved={...data,start,end,savedAt:clock().toISOString()};await fs.mkdir(dir,{recursive:true});await fs.writeFile(file+'.tmp',JSON.stringify(saved));await fs.rename(file+'.tmp',file);return {...saved,cacheHit:false}})();pending.set(key,job);try{return await job}finally{pending.delete(key)}
  }
  async function get(start,end,scope,fetcher){
    const date=clock(),currentMonth=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit'}).format(date);
    const first=new Date(start+'T12:00:00Z'),last=new Date(end+'T12:00:00Z');
    const monthEnd=d=>new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).toISOString().slice(0,10);
    const fullMonth=start.endsWith('-01')&&end===monthEnd(first);
    const fullYear=start.endsWith('-01-01')&&end===start.slice(0,4)+'-12-31';
    if(!fullMonth&&!fullYear)return fetcher(start,end);
    const parts=[];let cursor=new Date(first);
    while(cursor<=last){const a=cursor.toISOString().slice(0,10),b=monthEnd(cursor);parts.push([a,b]);cursor.setUTCMonth(cursor.getUTCMonth()+1)}
    const results=new Array(parts.length);let index=0;
    await Promise.all(Array.from({length:Math.min(3,parts.length)},async()=>{while(index<parts.length){const i=index++;results[i]=await month(...parts[i],scope,fetcher,currentMonth)}}));
    const archived=results.filter(r=>r.savedAt),allClosed=archived.length===results.length;
    return {issues:[...new Map(results.flatMap(r=>r.issues).map(t=>[t.key,t])).values()],truncated:results.some(r=>r.truncated),syncedAt:date.toISOString(),archive:archived.length?{months:archived.length,reused:archived.filter(r=>r.cacheHit).length,allClosed,savedAt:archived.map(r=>r.savedAt).sort().at(-1),note:'Bản lưu tại lần tải đầu tiên, không phải khôi phục trạng thái Jira tại ngày chốt sổ.'}:null};
  }
  return {get};
}
module.exports={createPeriodCache};
