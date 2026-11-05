const {test}=require('node:test'),assert=require('node:assert/strict');
process.env.TEAM_HUB_GUEST='1';
process.env.JIRA_EMAIL='fixture@tepaylink.com.vn';
process.env.JIRA_API_TOKEN='fixture-secret-never-return';
process.env.TEAM_HUB_CONFIG=JSON.stringify({version:1,teams:{Design:[],Video:[],Planner:[]}});
const {app}=require('./server');
const {assertRead}=require('./guest-server');
test('Jira transport blocks mutations but permits search POST',()=>{
 for(const method of ['PUT','PATCH','DELETE','POST'])assert.throws(()=>assertRead('/rest/api/3/issue/MTG-1',{method}));
 assert.doesNotThrow(()=>assertRead('/rest/api/3/search/jql',{method:'POST'}));
 assert.throws(()=>assertRead('https://attacker.example'));
});
test('Guest denies all write endpoints and private endpoints before Jira access',async()=>{
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 const base='http://127.0.0.1:'+server.address().port;
 try{
  for(const route of ['/api/auth/login','/api/create','/api/issues/MTG-1','/api/issues/MTG-1/transition','/api/issues/MTG-1/duedate','/api/issues/MTG-1/inline','/api/team-config']){
   for(const method of ['POST','PUT','PATCH','DELETE'])assert.equal((await fetch(base+route,{method})).status,403);
  }
  for(const route of ['/api/create-options','/api/issues/MTG-1/transitions','/api/tracked-parents/MC-9','/api/auth/options'])assert.equal((await fetch(base+route)).status,403);
  const connection=await(await fetch(base+'/api/connection')).text();assert(!connection.includes(process.env.JIRA_API_TOKEN));assert(!connection.includes(process.env.JIRA_EMAIL));assert.equal(JSON.parse(connection).readOnly,true);
  const cfg=await(await fetch(base+'/api/team-config')).json();assert.deepEqual(cfg.teams,{Design:[],Video:[],Planner:[]});assert(!('templateUrl'in cfg));
  assert.equal((await fetch(base+'/api/tasks?start=2026-01-01&end=2030-01-01')).status,400);
  assert.equal((await fetch(base+'/guest-server.js')).status,404);
  assert.equal((await fetch(base+'/.env')).status,404);
  const page=await(await fetch(base+'/')).text();assert(page.includes('GUEST'));assert(!page.includes('daily-notifications.js'));
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
