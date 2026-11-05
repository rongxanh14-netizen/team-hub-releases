'use strict';
function parentProgress(issues){
 const valid=issues.filter(t=>!['PENDING','CANCEL/DELETE'].includes(String(t.status?.name||'').toUpperCase().replace(/[\s_-]/g,'')));
 const counts=new Map();for(const t of valid){const name=t.status?.name||'Không rõ';counts.set(name,(counts.get(name)||0)+1)}
 const progressed=valid.filter(t=>['QC','READY','DONE'].includes(String(t.status?.name||'').toUpperCase().replace(/[\s_-]/g,''))).length;
 return {valid,counts,progressed,total:valid.length,excluded:issues.length-valid.length,percent:valid.length?Math.round(progressed/valid.length*100):0};
}
if(typeof module!=='undefined')module.exports={parentProgress};
if(typeof window!=='undefined')(()=>{

 let busy=false;const cache=new Map(),loaded=new Set();
 const scope=()=>JSON.stringify([state.connection?.accountId||'','campaign']);
 const storageKey=()=> 'hub-parent-tracking:'+scope();
 function keys(){return window.guestCampaignKeys||[];try{let raw=localStorage.getItem(storageKey());if(raw===null){const old=['Design','Video','Planner'].flatMap(team=>{try{return JSON.parse(localStorage.getItem('hub-parent-tracking:'+JSON.stringify([state.connection?.accountId||'',team]))||'[]')}catch{return []}});raw=JSON.stringify([...new Set(old)]);localStorage.setItem(storageKey(),raw)}const data=JSON.parse(raw);return Array.isArray(data)?data.filter(k=>typeof k==='string'&&/^[A-Z][A-Z0-9_]*-\d+$/.test(k)).slice(0,60):[]}catch{return []}}
 const save=list=>localStorage.setItem(storageKey(),JSON.stringify(list));
 const active=()=>state.page==='campaign';
 const link=t=>'<a href="https://tpl-vn.atlassian.net/browse/'+encodeURIComponent(t.key)+'" target="_blank" rel="noopener">'+esc(t.key)+' · '+esc(t.summary)+'</a>';
 function taskList(tasks){return '<div class="parent-subtasks">'+tasks.map(t=>'<div>'+link(t)+'<span>'+esc(t.assignee?.displayName||'Chưa giao')+'</span><span>'+esc(t.status?.name||'')+'</span><time>'+esc(t.duedate||'Chưa có hạn')+'</time></div>').join('')+'</div>'}
 function noteShell(key,content){return '<section class="panel parent-card">'+content+'</section>'; return '<section class="panel parent-card campaign-note-layout note-open" data-note-card="'+esc(key)+'"><div class="campaign-main">'+content+'</div><aside class="campaign-note" aria-label="Ghi chú '+esc(key)+'"><div class="campaign-note-inner"><h3>Ghi chú</h3><p class="hint">'+esc(key)+' · Lưu riêng trên máy theo tài khoản</p>'+CampaignComments.html()+'</div></aside></section>'}
 function card(key){
  const entry=cache.get(scope()+key);const head='<div class="parent-heading"><h2>'+ (entry?.data?link(entry.data.parent):esc(key))+'</h2><div class="campaign-actions"><button data-untrack="'+esc(key)+'" title="Chỉ bỏ khỏi danh sách theo dõi">Bỏ theo dõi</button></div></div>';
  if(!entry?.data)return noteShell(key,head+'<p class="hint">'+esc(entry?.error||'Đang tải…')+'</p>');
  const d=entry.data,m=parentProgress(d.issues);
  const statusPaint=name=>DASH_STATUSES.find(([key])=>key===dashboardStatus({status:{name}}))[2];
  return noteShell(key,head+'<p class="hint">Task lớn: '+esc(d.parent.status?.name||'')+' · '+esc(d.parent.assignee?.displayName||'Chưa giao')+' · Cập nhật '+esc(new Date(d.syncedAt).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}))+'</p>'+(entry.error?'<p class="parent-error">'+esc(entry.error)+' · Đang giữ dữ liệu lần trước.</p>':'')+'<div class="parent-charts"><div><div class="dash-donut" style="--progress:'+m.percent+'%"><div><strong>'+m.percent+'%</strong><small>ĐÃ ĐẾN QC TRỞ ĐI</small></div></div><p class="hint">'+m.progressed+' / '+m.total+' subtask · QC + READY + DONE</p></div><div><h3>Trạng thái subtask</h3>'+[...m.counts].map(([name,count],i)=>'<details class="parent-status" data-parent-key="'+esc(key)+'" data-parent-status="'+esc(name)+'"><summary><span>'+esc(name)+'</span><span class="parent-bar"><i style="width:'+(count/Math.max(1,m.total)*100)+'%;background:'+statusPaint(name)+'"></i></span><b>'+count+'</b></summary>'+'<div class="parent-detail-slot"></div>'+'</details>').join('')+(m.total?'':'<p class="hint">Chưa có subtask hợp lệ để tính tiến trình.</p>')+'</div></div><p class="hint">Tính trên subtask trực tiếp ở mọi thời điểm, không lọc theo tuần hoặc team của Assignee. Không tính task cha trong mẫu số. Loại '+m.excluded+' Pending / Cancel/Delete. QC là đang review, chưa phải DONE.</p><details data-parent-key="'+esc(key)+'"><summary>Danh sách '+m.total+' subtask</summary><div class="parent-detail-slot"></div>'+'</details>');
 }
 function html(){return '<section class="panel"><h2>Campaign · Chỉ xem</h2><p class="hint">Danh sách do chủ trang cấu hình.</p><form id="trackParentForm" hidden><input id="trackParentKey"></form><button id="refreshParents">Đồng bộ Campaign</button><p id="parentTrackerError"></p></section><div class="parent-tracked-list">'+keys().map(card).join('')+'</div>'+(keys().length?'':'<p class="empty">Chưa có Campaign được chia sẻ.</p>')}
 async function refresh(){
  if(busy||!state.connection?.accountId)return;busy=true;const owner=scope(),list=keys();
  try{let index=0;await Promise.all(Array.from({length:Math.min(3,list.length)},async()=>{while(index<list.length){const key=list[index++];try{const data=await api('/api/tracked-parents/'+key);cache.set(owner+key,{data})}catch(e){cache.set(owner+key,{data:cache.get(owner+key)?.data,error:e.message})}}}));loaded.add(owner);}
  finally{busy=false;if(scope()===owner&&active()&&!document.hidden&&!document.querySelector('input:focus,textarea:focus,dialog[open]'))render();}
 }
 function bind(){
  if(!active())return;
  document.getElementById('filters').style.display='none';document.getElementById('autoLabelToolbar').hidden=true;document.getElementById('archiveNotice').textContent='';
  document.querySelectorAll('details[data-parent-key]').forEach(details=>{details.ontoggle=()=>{const slot=details.querySelector('.parent-detail-slot');if(!details.open){slot.replaceChildren();return}const data=cache.get(scope()+details.dataset.parentKey)?.data;if(!data)return;const tasks=parentProgress(data.issues).valid;slot.innerHTML=taskList(details.hasAttribute('data-parent-status')?tasks.filter(t=>(t.status?.name||'Không rõ')===details.dataset.parentStatus):tasks)}});
  document.getElementById('refreshParents').onclick=refresh;
  document.getElementById('trackParentForm').onsubmit=async event=>{
   event.preventDefault();if(busy)return;const input=document.getElementById('trackParentKey'),key=input.value.trim().toUpperCase(),owner=scope(),error=document.getElementById('parentTrackerError');
   if(!/^[A-Z][A-Z0-9_]*-\d+$/.test(key)){error.textContent='Nhập mã task hợp lệ.';return}if(keys().includes(key)){error.textContent='Task này đã được theo dõi.';return}if(keys().length>=60){error.textContent='Tối đa 60 campaign.';return}
   busy=true;if(event.submitter)event.submitter.disabled=true;
   try{const data=await api('/api/tracked-parents/'+key);if(scope()!==owner)return;save([...keys(),key]);cache.set(owner+key,{data});input.value='';busy=false;render()}
   catch(e){error.textContent=e.message}finally{busy=false;if(event.submitter)event.submitter.disabled=false}
  };
  document.querySelectorAll('[data-untrack]').forEach(b=>b.onclick=()=>{
   if(document.querySelector('.campaign-untrack-confirm'))return;
   const key=b.dataset.untrack,owner=scope(),dialog=document.createElement('dialog');
   dialog.className='daily-dialog campaign-untrack-confirm';dialog.setAttribute('aria-labelledby','campaignUntrackQuestion');
   dialog.innerHTML='<div class="daily-symbol" aria-hidden="true"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4h12v17l-6-4-6 4V4Z M9 10h6"/></svg></div><p class="daily-eyebrow hint">CAMPAIGN</p><h2 id="campaignUntrackQuestion">Bạn có muốn bỏ theo dõi big task này?</h2><p class="hint">'+esc(key)+'</p><div class="actions"><button type="button" data-answer="no" autofocus>Không</button><button type="button" class="primary" data-answer="yes">Có</button></div>';
   dialog.querySelector('[data-answer="no"]').onclick=()=>dialog.close('no');
   dialog.querySelector('[data-answer="yes"]').onclick=()=>dialog.close('yes');
   dialog.addEventListener('close',()=>{const yes=dialog.returnValue==='yes';dialog.remove();if(yes&&scope()===owner){save(keys().filter(k=>k!==key));cache.delete(owner+key);render()}else if(b.isConnected)b.focus()},{once:true});
   document.body.append(dialog);dialog.showModal();
  });
  if(!loaded.has(scope())&&!busy&&keys().length)void refresh();
 }
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&active()&&!document.querySelector('input:focus,textarea:focus,dialog[open]'))render()});
 window.ParentTracker={active,html,bind,refresh};
})();
