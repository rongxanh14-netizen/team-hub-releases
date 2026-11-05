'use strict';
const {AsyncLocalStorage}=require('node:async_hooks');
const {randomBytes}=require('node:crypto');
const context=new AsyncLocalStorage(),sessions=new Map(),attempts=new Map();
const SITE='https://tpl-vn.atlassian.net',SESSION_SECONDS=28800,REMEMBER_SECONDS=30*86400;
let desktopOptions={};
function configureRemember(options){desktopOptions=options;}
function current(){const s=context.getStore();if(!s)throw Error('Vui lòng đăng nhập Jira');return s;}
function owner(){return current().accountId;}
function cookie(req,name='hub_session'){return new RegExp('(?:^|;\\s*)'+name+'=([a-f0-9]{64})(?:;|$)').exec(req.headers.cookie||'')?.[1];}
function fail(status,message,invalid=false){return Object.assign(Error(message),{status,invalid});}
async function verify(email,token){
 if(!/^[^\s@]+@tepaylink\.com\.vn$/.test(email)||typeof token!=='string'||!token.trim()||token.length>4096)throw fail(400,'Nhập email @tepaylink.com.vn và API token Jira của bạn.',true);
 const headers={Authorization:'Basic '+Buffer.from(email+':'+token).toString('base64'),Accept:'application/json'};
 const request=route=>fetch(SITE+route,{headers,signal:AbortSignal.timeout(20000),redirect:'error'});
 const r=await request('/rest/api/3/myself');
 if([401,403].includes(r.status))throw fail(401,'Không xác thực được Jira. Kiểm tra email và API token.',true);
 if(!r.ok)throw fail(502,'Jira chưa sẵn sàng. Vui lòng thử lại.');
 const me=await r.json();
 if(me.active===false||!me.accountId||(me.emailAddress&&me.emailAddress.toLowerCase()!==email))throw fail(403,'Tài khoản Jira không hợp lệ.',true);
 const keys=['MTG','MC'],responses=await Promise.all(keys.map(key=>request('/rest/api/3/project/'+key)));
 if(responses.some(p=>p.status===429||p.status>=500))throw fail(502,'Chưa kiểm tra được quyền Jira. Vui lòng thử lại.');
 const projects=keys.filter((_,i)=>responses[i].ok);
 if(!projects.length)throw fail(403,'Tài khoản chưa có quyền truy cập MTG hoặc MC trên Jira.',true);
 return {email,apiToken:token,baseUrl:SITE,projectKeys:projects,accountId:me.accountId};
}
function install(app,{vault=null,desktopKey=''}=desktopOptions){
 const trusted=req=>Boolean(vault&&desktopKey&&req.headers['x-team-hub-desktop']===desktopKey);
 const rememberCookie=(value,age)=>'hub_remember='+value+'; HttpOnly; SameSite=Strict; Path=/; Max-Age='+age;
 const issue=(req,res,account,remembered,extraCookie)=>{
  const now=Date.now(),old=cookie(req);if(old)sessions.delete(old);
  for(const [id,s]of sessions)if(s.expires<now)sessions.delete(id);
  const id=randomBytes(32).toString('hex');sessions.set(id,{...account,remembered,expires:now+SESSION_SECONDS*1000});
  const sessionCookie='hub_session='+id+'; HttpOnly; SameSite=Strict; Path=/; Max-Age='+SESSION_SECONDS;
  res.setHeader('Set-Cookie',extraCookie?[sessionCookie,extraCookie]:sessionCookie);
  res.json({ok:true,accountId:account.accountId,remembered});
 };
 const limit=req=>{const now=Date.now(),ip=req.ip;let item=attempts.get(ip);if(!item||now-item.at>600000){item={at:now,count:0};attempts.set(ip,item);}if(++item.count>15)throw fail(429,'Đã thử quá nhiều lần. Vui lòng thử lại sau 10 phút.');};
 const error=(res,e)=>res.status(e.status||502).json({message:e.status?e.message:'Chưa kết nối được Jira hoặc kho đăng nhập. Vui lòng thử lại.'});
 app.get('/api/auth/options',async(req,res)=>{
  try{const available=trusted(req)&&await vault.available();res.json({rememberAvailable:available,canRestore:available&&await vault.has(cookie(req,'hub_remember')),rememberDays:30});}
  catch{res.json({rememberAvailable:false,canRestore:false});}
 });
 app.post('/api/auth/login',async(req,res)=>{
  try{
   limit(req);
   const email=String(req.body.email||'').trim().toLowerCase(),token=typeof req.body.token==='string'?req.body.token.trim():req.body.token;
   const account=await verify(email,token);
   let extraCookie,remembered=false;
   if(req.body.remember===true){
    if(!trusted(req)||!await vault.available())throw fail(400,'Ghi nhớ đăng nhập chỉ khả dụng trong ứng dụng Windows.');
    const deviceId=randomBytes(32).toString('hex');
    try{await vault.save({email,token,deviceId});}catch{throw fail(503,'Chưa lưu được đăng nhập. Thử lại hoặc bỏ chọn Ghi nhớ đăng nhập.');}
    extraCookie=rememberCookie(deviceId,REMEMBER_SECONDS);remembered=true;
   }else if(trusted(req)){
    await vault.clear();extraCookie=rememberCookie('',0);
   }
   issue(req,res,account,remembered,extraCookie);
  }catch(e){error(res,e);}
 });
 app.post('/api/auth/restore',async(req,res)=>{
  const deviceId=cookie(req,'hub_remember');
  try{
   if(!trusted(req)||!deviceId)throw fail(401,'Vui lòng đăng nhập Jira.');
   limit(req);
   const saved=await vault.read(deviceId);
   if(!saved){res.setHeader('Set-Cookie',rememberCookie('',0));throw fail(401,'Đăng nhập đã ghi nhớ hết hạn. Vui lòng đăng nhập lại.');}
   const account=await verify(saved.email,saved.token);issue(req,res,account,true);
  }catch(e){
   if(e.invalid&&trusted(req)){try{await vault.clear(deviceId);res.setHeader('Set-Cookie',rememberCookie('',0));}catch{}}
   error(res,e);
  }
 });
 app.post('/api/auth/logout',async(req,res)=>{
  try{
   if(trusted(req))await vault.clear();
   sessions.delete(cookie(req));res.setHeader('Set-Cookie',['hub_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0',rememberCookie('',0)]);res.json({ok:true});
  }catch{res.status(503).json({message:'Chưa xóa được đăng nhập đã ghi nhớ. Vui lòng thử đăng xuất lại.'});}
 });
 app.use('/api',(req,res,next)=>{const s=sessions.get(cookie(req));if(!s||s.expires<Date.now())return res.status(401).json({message:'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập Jira.'});req.accountId=s.accountId;context.run(s,next);});
}
class AccountMap extends Map{key(k){return owner()+':'+k;}get(k){return super.get(this.key(k));}set(k,v){return super.set(this.key(k),v);}has(k){return super.has(this.key(k));}delete(k){return super.delete(this.key(k));}}
module.exports={install,current,owner,AccountMap,context,configureRemember};
