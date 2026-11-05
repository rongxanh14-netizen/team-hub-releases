const {test}=require('node:test'),assert=require('node:assert/strict');
process.env.TEAM_HUB_GUEST='1';process.env.JIRA_EMAIL='test@tepaylink.com.vn';process.env.JIRA_API_TOKEN='fixture';
const {app}=require('./server');
test('Planner reads are validated, cached independently by project, and never expose writes',async()=>{
 const real=global.fetch;let searches=0;
 global.fetch=async(url,options)=>{
  if(!String(url).startsWith('https://tpl-vn.atlassian.net'))return real(url,options);
  assert(url.endsWith('/search/jql'));searches++;
  return Response.json({isLast:true,issues:[]});
 };
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;
 try{
  for(const project of ['MTG','MC']){const r=await real(base+'/api/epics?project='+project);assert.equal(r.status,200);assert.equal(r.headers.get('vercel-cdn-cache-control'),'public, s-maxage=60');assert.deepEqual(await r.json(),{items:[]});}
  await real(base+'/api/epics?project=MTG');assert.equal(searches,2);
  const route='/api/planner-epics?start=2026-11-02&end=2026-11-08&period=week&project=MTG';
  assert.equal((await real(base+route)).status,200);assert.equal(searches,3);
  await real(base+route);assert.equal(searches,3);
  assert.equal((await real(base+route.replace('period=week','period=invalid'))).status,400);
  assert.equal((await real(base+route.replace('project=MTG','project=OTHER'))).status,403);
  assert.equal((await real(base+'/api/epics?project=OTHER')).status,400);
  assert.equal((await real(base+route,{method:'POST'})).status,403);
 }finally{global.fetch=real;server.closeAllConnections();await new Promise(r=>server.close(r));}
});
