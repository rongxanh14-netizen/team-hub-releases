'use strict';
const express = require('express');
const auth=require('./account-auth');
const storage={getConfig:async()=>auth.current()};
const path = require('path');
const app = express();
const PORT = Number(process.env.TEAM_HUB_PORT || 4850);
const {dataDir}=require('./runtime-paths');
const hosts=['localhost:'+PORT,'127.0.0.1:'+PORT];
const origins=hosts.map(host=>'http://'+host);
app.use((req,res,next)=>{
  if(!process.env.TEAM_HUB_GUEST && !hosts.includes(req.headers.host)) return res.status(403).json({message:'Host không hợp lệ'});
  if(!process.env.TEAM_HUB_GUEST && req.headers.origin && !origins.includes(req.headers.origin)) return res.status(403).json({message:'Origin không hợp lệ'});
  res.set('Cache-Control','no-store'); next();
});
require('./guest-server').install(app,auth);
app.use(express.json({limit:'16mb'}));
app.use(express.static(path.join(__dirname,'public')));
let activeWrites=0;
app.use('/api',(req,res,next)=>{
  if(!process.parentPort||['GET','HEAD','OPTIONS'].includes(req.method))return next();
  activeWrites++;process.parentPort.postMessage({type:'busy',scope:'requests',count:activeWrites});
  res.once('finish',()=>{activeWrites--;process.parentPort.postMessage({type:'busy',scope:'requests',count:activeWrites});});
  next();
});

app.get('/api/team-config',(_req,res)=>res.json(require('./team-config').read()));
async function jira(route,options={}) {
  require('./guest-server').assertRead(route,options);
  const c=await storage.getConfig();
  if(!c?.apiToken || !c.email.toLowerCase().endsWith('@tepaylink.com.vn') || c.baseUrl!=='https://tpl-vn.atlassian.net') throw new Error('Kết nối Jira cũ không khớp tài khoản dự kiến.');
  const r=await fetch(c.baseUrl+route,{...options,signal:AbortSignal.timeout(45000),headers:{Authorization:'Basic '+Buffer.from(c.email+':'+c.apiToken).toString('base64'),Accept:'application/json',...(options.body instanceof FormData?{'X-Atlassian-Token':'no-check'}:{'Content-Type':'application/json'})}});
  if(!r.ok) {const body=await r.json().catch(()=>({})); throw new Error('Jira '+r.status+': '+[...(body.errorMessages||[]),...Object.values(body.errors||{})].join('; ').slice(0,500));}
  return r.status===204 ? {ok:true}:r.json();
}
const wrap=fn=>(req,res)=>Promise.resolve(fn(req,res)).catch(e=>res.status(502).json({message:e.message}));
const parentCache=new auth.AccountMap();
function boundedSet(map,key,value){if(map.size>=1500&&!map.has(key))Map.prototype.delete.call(map,map.keys().next().value);map.set(key,value);}
const paletteCaches=new auth.AccountMap();
async function palette(){
  let paletteCache=paletteCaches.get("palette");
  if(!paletteCache||Date.now()-paletteCache.at>3600000)paletteCache={at:Date.now(),value:Promise.all([jira('/rest/api/3/priority'),jira('/rest/api/3/field')]).then(([priorities,fields])=>({priorities,startFields:fields.filter(f=>['start date','start day','ngày bắt đầu'].includes(f.name.toLowerCase().trim())).map(f=>f.id),colorFields:fields.filter(f=>['issue colour','issue color','epic color'].includes(f.name.toLowerCase())).map(f=>f.id)})).catch(e=>{paletteCaches.delete("palette");throw e})};
  paletteCaches.set("palette",paletteCache);return paletteCache.value;
}
const epicCache=new auth.AccountMap();
async function epicInfo(key){
  let cached=epicCache.get(key);
  if(!cached||Date.now()-cached.at>1800000){cached={at:Date.now(),value:(async()=>{const p=await palette();const d=await jira(`/rest/api/3/issue/${encodeURIComponent(key)}?fields=summary,${p.colorFields.join(',')}`);return {key,name:d.fields.summary,color:p.colorFields.map(f=>d.fields[f]).find(Boolean)||null};})().catch(()=>{epicCache.delete(key);return {key,name:key,color:null}})};boundedSet(epicCache,key,cached);}
  return cached.value;
}
app.get('/api/palette',wrap(async(req,res)=>res.json({priorities:(await palette()).priorities})));
app.get('/api/issues/:key/priorities',wrap(async(req,res)=>{
  const [meta,p]=await Promise.all([jira(`/rest/api/3/issue/${encodeURIComponent(req.params.key)}/editmeta`),palette()]);
  const field=meta.fields?.priority;
  res.json({editable:!!field,priorities:(field?.allowedValues||[]).map(v=>({...v,statusColor:p.priorities.find(p=>p.id===v.id)?.statusColor}))});
}));
app.get('/api/issues/:key/assignees',wrap(async(req,res)=>{
  const users=await jira(`/rest/api/3/user/assignable/search?issueKey=${encodeURIComponent(req.params.key)}&maxResults=1000`);
  res.json({users:users.map(u=>({id:u.accountId,name:u.displayName,avatarUrls:u.avatarUrls}))});
}));
// A date-only write avoids overwriting labels or other concurrently edited fields.
app.put('/api/issues/:key/duedate',wrap(async(req,res)=>{
 const {duedate}=req.body;
 if(!/^[A-Z][A-Z0-9_]*-\d+$/.test(req.params.key)||!/^\d{4}-\d{2}-\d{2}$/.test(duedate||'')||!Number.isFinite(Date.parse(duedate+'T00:00:00Z'))||new Date(duedate+'T00:00:00Z').toISOString().slice(0,10)!==duedate)return res.status(400).json({message:'Ngày đến hạn không hợp lệ'});
 if(req.body.expectedDue!==undefined){const current=(await jira('/rest/api/3/issue/'+encodeURIComponent(req.params.key)+'?fields=duedate')).fields.duedate;if(current===duedate)return res.json({duedate});if(current!==req.body.expectedDue)return res.status(409).json({message:'Deadline đã thay đổi sau lần kéo thả. Hãy đồng bộ và kiểm tra lại.'})}
 await jira('/rest/api/3/issue/'+encodeURIComponent(req.params.key),{method:'PUT',body:JSON.stringify({fields:{duedate},...(req.body.calendarMove===true?{update:{comment:[{add:{body:{type:"doc",version:1,content:[{type:"paragraph",content:[{type:"text",text:"Dời deadline do task đổi ưu tiên"}]}]}}}]}}:{})})});
 res.json({duedate});
}));
app.put('/api/issues/:key/inline',wrap(async(req,res)=>{
  const b=req.body;let update;
  if(b.kind==='priority'&&/^\d+$/.test(b.id||''))update={fields:{priority:{id:b.id}}};
  else if(b.kind==='assignee'&&(b.id===null||typeof b.id==='string'))update={fields:{assignee:b.id?{accountId:b.id}:null}};
  else if(b.kind==='label'&&['add','remove'].includes(b.action)&&typeof b.label==='string'&&b.label.length>0&&b.label.length<=255&&!/\s/.test(b.label))update={update:{labels:[{[b.action]:b.label}]}};
  else return res.status(400).json({message:'Ưu tiên hoặc nhãn không hợp lệ; nhãn không được chứa khoảng trắng.'});
  await jira(`/rest/api/3/issue/${encodeURIComponent(req.params.key)}`,{method:'PUT',body:JSON.stringify(update)});
  const fields=(await jira(`/rest/api/3/issue/${encodeURIComponent(req.params.key)}?fields=priority,status,labels,assignee,summary,description`)).fields;
  if(b.kind==='label'&&require('./auto-labels').isDesign(fields.assignee?.accountId)){try{await labelLearning.ingest([{key:req.params.key,fields}])}catch(e){fields.learningWarning='Đã lưu Jira nhưng chưa lưu được mẫu.'}}
  res.json(fields);
}));
async function epicFor(issue){
  let parent=issue.fields.parent;
  const visited=new Set();
  for(let depth=0;parent?.key&&depth<10;depth++){
    if(visited.has(parent.key))break;visited.add(parent.key);
    if(parent.fields?.issuetype?.hierarchyLevel===1||parent.fields?.issuetype?.name==='Epic')return epicInfo(parent.key);
    let cached=parentCache.get(parent.key);
    if(!cached||Date.now()-cached.at>1800000){
      const parentKey=parent.key;
      cached={at:Date.now(),value:jira(`/rest/api/3/issue/${encodeURIComponent(parentKey)}?fields=parent,summary,issuetype`).catch(()=>{parentCache.delete(parentKey);return null})};
      boundedSet(parentCache,parentKey,cached);
    }
    const full=await cached.value;if(!full)break;
    if(full.fields?.issuetype?.hierarchyLevel===1||full.fields?.issuetype?.name==='Epic')return epicInfo(full.key);
    parent=full.fields?.parent;
  }
  return null;
}
app.get('/api/connection',wrap(async(req,res)=>{
  const [me,c]=await Promise.all([jira('/rest/api/3/myself'),storage.getConfig()]);
  res.json({name:me.displayName,accountId:me.accountId,email:c.email,site:c.baseUrl,projects:c.projectKeys,mode:'Tài khoản Jira cá nhân',pollSeconds:0,remembered:c.remembered===true});
}));
const periodCache={get:(start,end,scope,fetcher)=>fetcher(start,end)};
app.get('/api/epics',wrap(async(req,res)=>{
 const project=req.query.project;
 if(!['MTG','MC'].includes(project))return res.status(400).json({message:'Workspace không hợp lệ'});
 const items=[];let nextPageToken;
 for(let page=0;page<100;page++){
  const d=await jira('/rest/api/3/search/jql',{method:'POST',body:JSON.stringify({jql:`project = "${project}" AND issuetype = Epic ORDER BY key ASC`,fields:['summary'],maxResults:100,...(nextPageToken?{nextPageToken}:{})})});
  items.push(...d.issues.map(e=>({key:e.key,summary:e.fields.summary})));
  nextPageToken=d.nextPageToken;if(d.isLast||!nextPageToken)return res.json({items});
 }
 throw Error('Danh sách Epic quá lớn');
}));
app.get('/api/planner-epics',wrap(async(req,res)=>{
 const {start,end,period,project}=req.query;
 require('./public/planner-epics').previousRange(start,end,period);
 const c=auth.current(),allowed=(c.projectKeys||[]).filter(k=>/^[A-Z][A-Z0-9_]*$/.test(k));
 if(project&&!allowed.includes(project))return res.status(403).json({message:'Workspace không hợp lệ'});
 const projects=project?[project]:allowed;
 res.json(await require('./planner-epics').fetchData(jira,{start,end,period,projects},epicFor));
}));
app.get('/api/daily-tasks',wrap(async(req,res)=>{
 const c=await storage.getConfig();
 const projects=(c.projectKeys||[]).filter(k=>/^[A-Z][A-Z0-9_]*$/.test(k));
 if(!projects.length)throw Error('Chưa cấu hình project');
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(new Date());
 const part=name=>parts.find(p=>p.type===name).value;
 const date=`${part('year')}-${part('month')}-${part('day')}`,hour=Number(part('hour'));
 const jql=`project in (${projects.join(',')}) AND assignee = currentUser() AND duedate = "${date}" ORDER BY key ASC`;
 const issues=[];let nextPageToken,truncated=false;
 for(let page=0;page<100;page++){
  const d=await jira('/rest/api/3/search/jql',{method:'POST',body:JSON.stringify({jql,maxResults:100,fields:['summary','duedate','status','assignee'],...(nextPageToken?{nextPageToken}:{})})});
  issues.push(...d.issues.map(t=>({key:t.key,...t.fields})));
  nextPageToken=d.nextPageToken;if(d.isLast||!nextPageToken)break;
  if(page===99)truncated=true;
 }
 // Jira search may lag a successful transition; reconcile the changed issue
 // from its direct endpoint before deciding whether today's work is complete.
 const changed=req.query?.changed;
 if(changed&&/^[A-Z][A-Z0-9_]*-\d+$/.test(changed)&&projects.includes(changed.split('-')[0])){
  const issue=await jira(`/rest/api/3/issue/${encodeURIComponent(changed)}?fields=summary,duedate,status,assignee`);
  const index=issues.findIndex(t=>t.key===changed);
  if(index>=0)issues.splice(index,1);
  if(issue.fields.assignee?.accountId===c.accountId&&issue.fields.duedate===date)issues.push({key:changed,...issue.fields});
 }
 res.json({issues,date,hour,truncated});
}));
app.get('/api/tasks',wrap(async(req,res)=>{
  const {start,end,unscheduled}=req.query;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(start||'')||!/^\d{4}-\d{2}-\d{2}$/.test(end||'')) return res.status(400).json({message:'Khoảng ngày không hợp lệ'});
  const c=await storage.getConfig();
  const projects=(c.projectKeys||[]).filter(k=>/^[A-Z][A-Z0-9_]*$/.test(k));
  if(!projects.length) throw new Error('Chưa cấu hình project');
  const startFields=(await palette()).startFields||[];
  const fetchTasks=async(start,end)=>{
  const jql=`project in (${projects.join(',')}) AND ${unscheduled==='true'?'duedate is EMPTY':`duedate >= "${start}" AND duedate <= "${end}"`} ORDER BY duedate ASC`;
  let issues=[],nextPageToken,truncated=false;
  for(let page=0;page<100;page++) {
    const d=await jira('/rest/api/3/search/jql',{method:'POST',body:JSON.stringify({jql,maxResults:100,fields:['summary','duedate','status','assignee','reporter','labels','priority','parent','issuetype','project','created','updated',...startFields],...(nextPageToken?{nextPageToken}:{})})});
    issues.push(...d.issues);nextPageToken=d.nextPageToken;if(d.isLast||!nextPageToken) break;if(page===99) truncated=true;
  }
  // Search already contains parent/issuetype: reuse it instead of looking up
  // each parent again when parent and children are in the same selected range.
  for(const issue of issues)boundedSet(parentCache,issue.key,{at:Date.now(),value:Promise.resolve(issue)});
  const rows=await require('./task-enrichment').enrichIssues(issues,startFields,epicFor);
  return {issues:rows,truncated,syncedAt:new Date().toISOString()};
  };
  res.json(unscheduled==='true'?await fetchTasks(start,end):await periodCache.get(start,end,{site:c.baseUrl,email:c.email,projects:[...projects].sort(),schema:2,startFields},fetchTasks));
}));
app.get('/api/tracked-parents/:key',wrap(async(req,res)=>{const c=await storage.getConfig();res.json(await require('./parent-tracking').fetchParent(jira,req.params.key,c.projectKeys||[]));}));
app.get('/api/issues/:key/transitions',wrap(async(req,res)=>res.json(await jira(`/rest/api/3/issue/${encodeURIComponent(req.params.key)}/transitions`))));
app.put('/api/issues/:key',wrap(async(req,res)=>{
  const {duedate,labels}=req.body;
  if(duedate && !/^\d{4}-\d{2}-\d{2}$/.test(duedate)) return res.status(400).json({message:'Ngày không hợp lệ'});
  if(!Array.isArray(labels)||labels.some(l=>typeof l!=='string'||/\s/.test(l))) return res.status(400).json({message:'Nhãn không được chứa khoảng trắng'});
  res.json(await jira(`/rest/api/3/issue/${encodeURIComponent(req.params.key)}`,{method:'PUT',body:JSON.stringify({fields:{duedate:duedate||null,labels:[...new Set(labels)]}})}));
}));
app.post('/api/issues/:key/transition',wrap(async(req,res)=>res.json(await jira(`/rest/api/3/issue/${encodeURIComponent(req.params.key)}/transitions`,{method:'POST',body:JSON.stringify({transition:{id:String(req.body.id)}})}))));
app.get('/api/create-options',wrap(async(req,res)=>{
  const c=await storage.getConfig();const project=String(req.query.project||'');
  if(!c.projectKeys.includes(project)) return res.status(400).json({message:'Project không hợp lệ'});
  const [types,users]=await Promise.all([jira(`/rest/api/3/issue/createmeta/${project}/issuetypes?maxResults=100`),jira(`/rest/api/3/user/assignable/search?project=${project}&maxResults=1000`)]);
  res.json({types:(types.issueTypes||types.values||[]).filter(t=>!t.subtask),users:users.map(u=>({id:u.accountId,name:u.displayName}))});
}));
const created=new auth.AccountMap();
app.post('/api/create',wrap(async(req,res)=>{
  const {project,type,summary,duedate,assignee,description,requestId}=req.body;
  const c=await storage.getConfig();
  if(!c.projectKeys.includes(project)||!/^\d+$/.test(type||'')||!summary?.trim()||summary.length>255||!requestId) return res.status(400).json({message:'Kiểm tra project, loại task và tiêu đề (tối đa 255 ký tự)'});
  if(duedate&&!/^\d{4}-\d{2}-\d{2}$/.test(duedate)) return res.status(400).json({message:'Ngày không hợp lệ'});
  if(created.has(requestId)) return res.json(await created.get(requestId));
  const fields={project:{key:project},issuetype:{id:type},summary:summary.trim(),...(duedate?{duedate}:{}),...(assignee?{assignee:{id:assignee}}:{}),...(description?{description:{type:'doc',version:1,content:[{type:'paragraph',content:[{type:'text',text:description}]}]}}:{})};
  const pending=jira('/rest/api/3/issue',{method:'POST',body:JSON.stringify({fields})});created.set(requestId,pending);
  try {res.json(await pending);} catch(e) { /* retain failed request to avoid duplicates after ambiguous timeouts */ throw e; }
}));


function startServer(){return new Promise((resolve,reject)=>{const server=app.listen(PORT,'127.0.0.1',()=>resolve(server));server.once('error',reject);});}
if(require.main===module)startServer().then(()=>console.log('Team Hub: http://localhost:'+PORT)).catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports={app,startServer};
