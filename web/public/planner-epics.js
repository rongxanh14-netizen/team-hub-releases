'use strict';
(function(root){
 const colors=['#7771ed','#36adbd','#ac7fe0','#e6a344','#51b68d','#8893a4','#dd719c','#608be5'];
 function previousRange(start,end,period){
  const valid=s=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
  if(!valid(start)||!valid(end)||start>end||!['week','month','year'].includes(period))throw Error('Khoảng ngày không hợp lệ');
  const a=new Date(start+'T00:00:00Z'),b=new Date(end+'T00:00:00Z'),iso=d=>d.toISOString().slice(0,10);
  if(period==='week'){a.setUTCDate(a.getUTCDate()-7);b.setUTCDate(b.getUTCDate()-7)}
  else if(period==='month'){a.setUTCDate(1);a.setUTCMonth(a.getUTCMonth()-1);b.setTime(Date.UTC(a.getUTCFullYear(),a.getUTCMonth()+1,0))}
  else {a.setTime(Date.UTC(a.getUTCFullYear()-1,0,1));b.setTime(Date.UTC(a.getUTCFullYear(),11,31))}
  return [iso(a),iso(b)];
 }
 function aggregate(data,options){
  const {start,end,period,project,assignees=null,epic='',search=''}=options,prev=previousRange(start,end,period),groups=new Map(),seen=new Set();
  const group=(key,name)=>{if(!groups.has(key))groups.set(key,{key,name,current:[],before:0});return groups.get(key)};
  if(period==='year')for(const e of data.epics||[])if((!project||e.project?.key===project)&&(!epic||e.key===epic))group(e.key,e.name);
  for(const t of data.issues||[]){if(seen.has(t.key))continue;seen.add(t.key);
   if(['PENDING','CANCEL/DELETE'].includes(String(t.status?.name||'').toUpperCase().replace(/[\s_-]/g,''))||project&&t.project?.key!==project||assignees!==null&&!assignees.includes(t.assignee?.accountId)||epic&&t.epic?.key!==epic||search&&!(t.key+' '+t.summary).toLowerCase().includes(search.toLowerCase()))continue;
   const current=t.duedate>=start&&t.duedate<=end,prior=t.duedate>=prev[0]&&t.duedate<=prev[1];if(!current&&!prior)continue;
   const g=group(t.epic?.key||'',t.epic?.name||'Chưa có Epic');if(current)g.current.push(t);else g.before++;
  }
  return [...groups.values()].filter(g=>g.current.length||period==='year').sort((a,b)=>b.current.length-a.current.length||a.name.localeCompare(b.name)).map(g=>({...g,count:g.current.length,delta:g.current.length-g.before}));
 }
 function tooltipPosition(chart,size,point,viewport){
  const gap=16,pad=10,clamp=(n,min,max)=>Math.max(min,Math.min(n,Math.max(min,max)));
  const candidates=[{x:chart.right+gap,y:point.y-size.height/2},{x:chart.left-size.width-gap,y:point.y-size.height/2},{x:point.x-size.width/2,y:chart.bottom+gap},{x:point.x-size.width/2,y:chart.top-size.height-gap}];
  return candidates.map(p=>{const x=clamp(p.x,pad,viewport.width-size.width-pad),y=clamp(p.y,pad,viewport.height-size.height-pad);const overlap=Math.max(0,Math.min(x+size.width,chart.right)-Math.max(x,chart.left))*Math.max(0,Math.min(y+size.height,chart.bottom)-Math.max(y,chart.top));return {x,y,score:overlap*10000+Math.hypot(x+size.width/2-point.x,y+size.height/2-point.y)};}).sort((a,b)=>a.score-b.score)[0];
 }
 const exports={previousRange,aggregate,tooltipPosition};if(typeof module!=='undefined'){module.exports=exports;return}
 const rankBadge=(g,i)=>g.count>0&&i<3?`<span class="epic-rank epic-rank-${i+1}" aria-label="Top ${i+1} theo số task trong kỳ">Top ${i+1}</span>`:'';
 const h=s=>esc(String(s)),delta=g=>`<span class="epic-delta ${g.delta>0?'up':g.delta<0?'down':''}">${g.delta>0?'↑ +':g.delta<0?'↓ −':'— '}${Math.abs(g.delta)}</span>`;
 let teamFilter='all',requestId=0;
 function html(){return '<section class="panel planner-epics" id="plannerEpics"><h2>Phân bổ task theo Epic</h2><p class="dash-sub">Ngày đến hạn trong kỳ · lọc team theo Assignee · không giới hạn Reporter</p><div class="segmented epic-team-filter" role="group" aria-label="Lọc team"><button type="button" data-epic-team="all">Tổng quan</button><button type="button" data-epic-team="Video">Team Video</button><button type="button" data-epic-team="Design">Team Design</button><button type="button" data-epic-team="Planner">Team Planner</button></div><div class="epic-body" aria-live="polite">Đang tải dữ liệu Epic và kỳ trước…</div></section>'}
 const cache=new Map();
 async function bind(){
  const panel=document.getElementById('plannerEpics');if(!panel)return;const request=++requestId;
  panel.querySelectorAll('[data-epic-team]').forEach(button=>{const selected=button.dataset.epicTeam===teamFilter;button.classList.toggle('active',selected);button.setAttribute('aria-pressed',String(selected));button.onclick=()=>{teamFilter=button.dataset.epicTeam;bind()}});
  const [start,end]=range(),options={start,end,period:state.period,project:state.project,assignees:teamFilter==='all'?null:(teamRoster[teamFilter]||[]).map(([id])=>id),epic:state.epic,search:state.search};
  const params=new URLSearchParams({start,end,period:state.period,project:state.project||''}),key=JSON.stringify([state.connection?.accountId,params.toString()]);
  try{
   let entry=cache.get(key);if(!entry||Date.now()-entry.at>60000){entry={at:Date.now(),promise:api('/api/planner-epics?'+params)};cache.set(key,entry);if(cache.size>8)cache.delete(cache.keys().next().value)}
   let data;try{data=await entry.promise}catch(e){cache.delete(key);throw e}if(!panel.isConnected||request!==requestId)return;
   draw(panel,aggregate(data,options),options);
  }catch(e){if(panel.isConnected&&request===requestId){const toggle=panel.querySelector('.epic-team-filter');if(toggle)panel.querySelector('.epic-body').before(toggle);panel.querySelector('.epic-body').innerHTML='<p>'+h(e.message)+'</p><button type="button">Thử lại</button>';panel.querySelector('.epic-body button').onclick=bind}}
 }
 function draw(panel,groups,options){
  const total=groups.reduce((n,g)=>n+g.count,0),pct=n=>total?(n/total*100).toLocaleString('vi-VN',{maximumFractionDigits:1})+'%':'0%',radius=82,circ=2*Math.PI*radius;let offset=0;
  const slices=groups.map((g,i)=>{const len=total?g.count/total*circ:0,markup=g.count?`<circle data-epic="${i}" tabindex="0" role="button" aria-label="${h(g.name)}: ${g.count} task" cx="110" cy="110" r="82" fill="none" stroke="${colors[i%colors.length]}" stroke-width="26" stroke-dasharray="${len} ${circ-len}" stroke-dashoffset="${-offset}" transform="rotate(-90 110 110)"/>`:'';offset+=len;return markup}).join('');
  const teamToggle=panel.querySelector('.epic-team-filter');teamToggle?.remove();
  panel.querySelector('.epic-body').innerHTML=`<div class="epic-layout"><div class="epic-plot"><svg viewBox="0 0 220 220" aria-label="Phân bổ task theo Epic"><circle cx="110" cy="110" r="82" fill="none" stroke="var(--s3)" stroke-width="26"/>${slices}<text x="110" y="109" text-anchor="middle" class="epic-total">${total}</text><text x="110" y="132" text-anchor="middle" class="epic-caption">TỔNG TASK</text></svg><div class="epic-tooltip" hidden></div></div><div class="epic-list"><div class="epic-row epic-head"><span>EPIC</span><span>TASK</span><span>%</span><span>+/−</span></div>${groups.map((g,i)=>`<button class="epic-row" data-epic="${i}" type="button"><span class="epic-name-cell"><i style="background:${colors[i%colors.length]}"></i><span class="epic-name-text">${h(g.name)}</span>${rankBadge(g,i)}</span><b>${g.count}</b><span>${pct(g.count)}</span>${delta(g)}</button>`).join('')||'<p class="dash-note">Không có task trong kỳ.</p>'}</div></div><p class="dash-note">${options.start} → ${options.end} · So với ${previousRange(options.start,options.end,options.period).join(' → ')}. Không tính Pending và Cancel/Delete. ↑ tăng · ↓ giảm số task; trạng thái tính tại lần đồng bộ hiện tại.</p><div class="epic-details"></div>`;
  if(teamToggle)panel.querySelector('.epic-layout').prepend(teamToggle);
  const tooltip=panel.querySelector('.epic-tooltip'),plot=panel.querySelector('.epic-plot');
  const position=e=>{if(tooltip.hidden)return;const box=plot.getBoundingClientRect(),svg=plot.querySelector('svg').getBoundingClientRect(),size=tooltip.getBoundingClientRect(),point={x:Number.isFinite(e?.clientX)?e.clientX:svg.right,y:Number.isFinite(e?.clientY)?e.clientY:svg.top+svg.height/2};const at=tooltipPosition(svg,size,point,{width:innerWidth,height:innerHeight}),scaleX=box.width/plot.offsetWidth||1,scaleY=box.height/plot.offsetHeight||1;tooltip.style.left=(at.x-box.left)/scaleX+'px';tooltip.style.top=(at.y-box.top)/scaleY+'px';};
  panel.querySelectorAll('circle[data-epic]').forEach(el=>{const show=e=>{const g=groups[+el.dataset.epic];tooltip.innerHTML=`<strong>${h(g.name)}</strong><small>${options.start} → ${options.end}</small><b>${g.count} task</b><span>${delta(g)} task so với kỳ trước</span>`;tooltip.hidden=false;position(e)};el.onmousemove=position;el.onmouseenter=show;el.onfocus=show;el.onmouseleave=()=>tooltip.hidden=true;el.onblur=()=>tooltip.hidden=true});
  let selected=null;
  panel.querySelectorAll('[data-epic]').forEach(el=>{const open=()=>{tooltip.hidden=true;const i=+el.dataset.epic,g=groups[i],target=panel.querySelector('.epic-details');panel.querySelectorAll('[data-epic]').forEach(x=>x.setAttribute('aria-expanded','false'));target.innerHTML='';if(selected===i){selected=null;return}selected=i;if(!g.count)return;el.setAttribute('aria-expanded','true');target.innerHTML=`<section class="dash-inline-tasks"><div class="inline-list-heading"><strong>${h(g.name)} · ${g.count} task</strong><button type="button" aria-label="Đóng danh sách">×</button></div><div class="inline-task-list">${g.current.map(t=>`<a href="https://tpl-vn.atlassian.net/browse/${encodeURIComponent(t.key)}" target="_blank" rel="noopener"><span><b>${h(t.summary)}</b><small>${h(t.key)} · ${h(t.assignee?.displayName||'Chưa giao')}</small></span><span>${h(t.status?.name||'')}</span><time>${h(t.duedate)}</time></a>`).join('')}</div></section>`;target.querySelector('button').onclick=()=>{target.innerHTML='';selected=null;el.setAttribute('aria-expanded','false');el.focus()};if(!matchMedia('(prefers-reduced-motion: reduce)').matches)target.animate([{opacity:0,transform:'translateY(-6px)'},{opacity:1,transform:'translateY(0)'}],{duration:250})};el.onclick=open;if(el.tagName.toLowerCase()==='circle')el.onkeydown=e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();open()}}});
 }
 root.PlannerEpicChart={html,bind};
})(typeof window==='undefined'?globalThis:window);
