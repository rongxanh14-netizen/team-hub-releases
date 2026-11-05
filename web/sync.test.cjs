const {test}=require('node:test'),assert=require('node:assert/strict');
process.env.TEAM_HUB_GUEST='1';process.env.JIRA_EMAIL=' test@tepaylink.com.vn ';process.env.JIRA_API_TOKEN=' fake ';
const {app}=require('./server');
test('full sync coalesces equivalent queries and reuses parents from search',async()=>{
 const realFetch=global.fetch,calls=[];
 global.fetch=async(url,options)=>{
  if(!String(url).startsWith('https://tpl-vn.atlassian.net'))return realFetch(url,options);
  calls.push(String(url));await new Promise(r=>setTimeout(r,15));
  assert.equal(options.headers.Authorization,'Basic '+Buffer.from('test@tepaylink.com.vn:fake').toString('base64'));
  let body=[];
  if(url.includes('/search/jql'))body={isLast:true,issues:[{key:'MTG-1',fields:{summary:'Parent',issuetype:{name:'Task'}}},{key:'MTG-2',fields:{summary:'Child',issuetype:{name:'Sub-task'},parent:{key:'MTG-1'}}}]};
  else assert(url.endsWith('/field')||url.endsWith('/priority'),'unexpected parent lookup');
  return new Response(JSON.stringify(body),{headers:{'content-type':'application/json'}});
 };
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;
 try{
  const responses=await Promise.all(Array.from({length:12},(_,i)=>realFetch(base+'/api/tasks?'+(i%2?'end=2026-11-08&start=2026-11-02':'start=2026-11-02&end=2026-11-08')+'&unused='+i).then(r=>r.json())));
  assert(responses.every(r=>r.issues.length===2));assert.equal(calls.length,3,'one search + two metadata calls; no redundant parent lookup');
  await realFetch(base+'/api/tasks?start=2026-11-09&end=2026-11-15');assert.equal(calls.length,4,'next period reuses metadata');
 }finally{global.fetch=realFetch;server.closeAllConnections();await new Promise(r=>server.close(r));}
});
