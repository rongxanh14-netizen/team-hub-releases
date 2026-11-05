'use strict';
const ALLOWED=new Set(['/api/connection','/api/team-config','/api/palette','/api/tasks','/api/planner-epics','/api/epics']);
function campaignKeys(){return [...new Set((process.env.TEAM_HUB_CAMPAIGNS||'').split(',').map(s=>s.trim()).filter(s=>/^(MTG|MC)-\d+$/.test(s)))].slice(0,60);}
function assertRead(route,options={}){
 const method=(options.method||'GET').toUpperCase();
 if(method==='POST'&&route==='/rest/api/3/search/jql')return;
 if(method==='GET'&&(/^\/rest\/api\/3\/(myself|priority|field)$/.test(route)||/^\/rest\/api\/3\/issue\/[A-Z][A-Z0-9_]*-\d+\?fields=/.test(route)))return;
 throw Error('Guest chỉ được đọc Jira.');
}
function install(app,auth){
 const cached=require('./response-cache').createResponseCache();
 app.use((req,res,next)=>{
  res.set({'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow','Cache-Control':'no-store'});
  if(!['GET','HEAD'].includes(req.method))return res.status(403).json({message:'Guest chỉ xem, không thể thay đổi dữ liệu.'});
  if(!req.path.startsWith('/api/'))return next();
  const parent=/^\/api\/tracked-parents\/((?:MTG|MC)-\d+)$/.exec(req.path);
  if(!ALLOWED.has(req.path)&&!(parent&&campaignKeys().includes(parent[1])))return res.status(403).json({message:'Chức năng không khả dụng trong bản guest.'});
  const email=process.env.JIRA_EMAIL?.trim().toLowerCase(),apiToken=process.env.JIRA_API_TOKEN?.trim();
  if(!email||!apiToken)return res.status(503).json({message:'Chủ trang chưa cấu hình kết nối Jira.'});
  if(req.path==='/api/connection')return res.json({name:'Guest',accountId:'guest',email:'Chỉ xem',site:'https://tpl-vn.atlassian.net',projects:['MTG','MC'],mode:'Guest · Chỉ xem',pollSeconds:60,readOnly:true});
  if(req.path==='/api/team-config'){
   try{const cfg=require('./team-config').validate(JSON.parse(process.env.TEAM_HUB_CONFIG||''));return res.json({version:1,teams:cfg.teams,campaignKeys:campaignKeys()});}
   catch{return res.status(503).json({message:'Chủ trang chưa cấu hình danh sách thành viên.'});}
  }
  if(req.path==='/api/tasks'||req.path==='/api/planner-epics'){
   const {start,end}=req.query,valid=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v));
   if(!valid(start)||!valid(end)||Date.parse(end)<Date.parse(start)||Date.parse(end)-Date.parse(start)>366*86400000)return res.status(400).json({message:'Chọn khoảng ngày hợp lệ, tối đa một năm.'});
  }
  if(req.path==='/api/planner-epics'){
   try{require('./public/planner-epics').previousRange(req.query.start,req.query.end,req.query.period)}catch{return res.status(400).json({message:'Khoảng ngày không hợp lệ'})}
   if(req.query.project&&!['MTG','MC'].includes(req.query.project))return res.status(403).json({message:'Workspace không hợp lệ'});
  }
  // Ignore irrelevant query parameters so equivalent reads share one request.
  const key=req.path==='/api/tasks'?JSON.stringify([req.path,req.query.start,req.query.end,req.query.unscheduled==='true']):req.path==='/api/planner-epics'?JSON.stringify([req.path,req.query.start,req.query.end,req.query.period,req.query.project||'']):req.path;
  cached(req.path==='/api/epics'?JSON.stringify([req.path,req.query.project]):key,req,res,()=>auth.context.run({email,apiToken,baseUrl:'https://tpl-vn.atlassian.net',projectKeys:['MTG','MC'],accountId:'guest'},next));
 });
}
module.exports={install,assertRead,campaignKeys};
