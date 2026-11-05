/* Only startup, explicit sync and successful status changes request fresh data. */
(function(){
 let queue=Promise.resolve();
 function completionMotion(){return '<div class="complete-motion" aria-hidden="true"><span class="complete-dot"></span><span class="complete-wave"></span><div class="complete-orbit">'+Array.from({length:24},(_,i)=>{const a=i/24*Math.PI*2,r=66+(i%3)*15;return '<span class="complete-particle p-'+(i%4)+'" style="--px:'+Math.cos(a)*r+'px;--py:'+Math.sin(a)*r+'px;--turn:'+i*31+'deg;--lag:'+(i%4)*.025+'s"><i></i></span>'}).join('')+'</div><span class="complete-badge"><svg viewBox="0 0 48 48" fill="none"><path d="m13 24 8 8 15-17"/></svg></span></div>'}
 function completionConfetti(){return '<div class="complete-confetti" popover="manual" aria-hidden="true">'+Array.from({length:120},(_,i)=>{const angle=i/120*Math.PI*2,r=.45+(i%9)/16,x=Math.cos(angle)*r*65,y=Math.sin(angle)*r*58-10;return '<i style="--cx:'+x.toFixed(2)+'vw;--cy:'+y.toFixed(2)+'vh;--fx:'+(x*1.25).toFixed(2)+'vw;--fy:'+(95+i%6*8)+'vh;--spin:'+(i%2?1:-1)*(360+i*23)+'deg;--paper:'+['var(--accent)','#f4b942','#e979a0','#50bfa5'][i%4]+';--wait:'+(2.3+(i%5)*.025)+'s;--fall:'+(2.8+(i%4)*.2)+'s"></i>'}).join('')+'</div>'}
 const readSeen=key=>{try{return JSON.parse(localStorage.getItem(key))||{}}catch{return {}}};
 function celebrate(){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const layer=document.createElement('div');layer.className='completion-screen';layer.setAttribute('aria-hidden','true');layer.innerHTML=completionMotion()+completionConfetti();document.body.append(layer);
  const confetti=layer.querySelector('.complete-confetti');confetti.style.setProperty('--origin-x','50%');confetti.style.setProperty('--origin-y','40%');confetti.showPopover();setTimeout(()=>layer.remove(),6500);
 }
 async function show(summary,types){
  const complete=types.includes('complete'),late=types.includes('late');
  const title=complete?'Hoàn thành rồi!':late?'Task cần bắt đầu trước khi hết ngày':'Công việc hôm nay';
  const body=complete?summary.total+' task hôm nay đã đến QC, READY hoặc DONE.':late?'Sau 15:00 còn '+summary.late+' task chưa bắt đầu. Tổng '+summary.remaining+' task còn cần làm hôm nay.':'Bạn có '+summary.total+' task đến hạn hôm nay, còn '+summary.remaining+' task cần làm.';
  let delivered=false;
  if(window.teamHubDesktop?.notify)try{delivered=await window.teamHubDesktop.notify({title,body})}catch{}
  if(!delivered){if(typeof inAppToast==='function')inAppToast(title+' · '+body);else toast(title+' · '+body);}
  if(complete)celebrate();return true;
 }
 window.checkDailyTasks=(trigger,changedKey)=>{
  queue=queue.catch(()=>{}).then(async()=>{
   const account=state.connection?.accountId;if(!account)return;
   try{
    const data=await api('/api/daily-tasks'+(trigger==='transition'&&changedKey?'?changed='+encodeURIComponent(changedKey):''));
    if(state.connection?.accountId!==account||data.truncated)return;
    const summary=DailyRules.summarize(data.issues,account,data.date);
    const key='hub-daily-notices:'+account;
    const stored=readSeen(key),seen=stored.date===data.date?stored:{date:data.date};
    const types=DailyRules.decide(summary,seen,trigger,data.hour);
    if(!types.length)return;
    if(await show(summary,types)){
     types.forEach(type=>seen[type]=true);
     if(types.includes('complete'))seen.morning=true;
     localStorage.setItem(key,JSON.stringify(seen));
    }
   }catch{toast('Chưa kiểm tra được task hôm nay. Bấm đồng bộ để thử lại.')}
  });
  return queue;
 };
})();
