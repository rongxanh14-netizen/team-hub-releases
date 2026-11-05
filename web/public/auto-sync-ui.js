// Fetch silently; never redraw a form or apply a response from an older view.
let autoSyncNeedsRender=false;
function autoSyncEditing(){return inlineBusy||inlineEditor||calendarDraggedKey||calendarDateSaving||document.querySelector('dialog[open],[aria-busy="true"]')||document.activeElement?.matches('input,textarea,select,[contenteditable="true"]')}
function paintAutoSync(){
 if(!autoSyncNeedsRender||document.hidden||autoSyncEditing()||!['calendar','dashboard'].includes(state.page))return;
 const scrolls=[document.scrollingElement,...document.querySelectorAll('main,.page,.calendar-scroll,.table-scroll')].filter(Boolean).map(el=>[el,el.scrollLeft,el.scrollTop]);
 autoSyncNeedsRender=false;render();for(const [el,x,y] of scrolls){el.scrollLeft=x;el.scrollTop=y}
}
async function backgroundTaskSync(){
 const id=++lastLoad,account=state.connection.accountId,[start,end]=range(),unscheduled=state.unscheduled&&state.page==='calendar',revision=window.syncMutationRevision||0;
 const before=JSON.stringify(state.issues),controller=new AbortController();taskLoadController=controller;
 const timeout=setTimeout(()=>controller.abort(),90000);
 const pending=(async()=>{
  try{
   const data=await api(`/api/tasks?start=${start}&end=${end}&unscheduled=${unscheduled}`,undefined,undefined,controller.signal);
   if(id!==lastLoad||account!==state.connection?.accountId||revision!==(window.syncMutationRevision||0)||JSON.stringify(range())!==JSON.stringify([start,end])||unscheduled!==(state.unscheduled&&state.page==='calendar')||autoSyncEditing()||before!==JSON.stringify(state.issues))return;
   if(data.truncated)throw Error('Dữ liệu quá lớn; chọn kỳ ngắn hơn và đồng bộ lại.');
   const changed=JSON.stringify(data.issues)!==before;
   state.issues=data.issues;state.archive=data.archive||null;
   $('#sync').textContent='Cập nhật '+new Date(data.syncedAt).toLocaleTimeString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'});
   $('#notice').textContent='';
   if(changed){autoSyncNeedsRender=true;paintAutoSync()}
   await window.checkDailyTasks?.('sync');
  }catch(error){if(id===lastLoad){$('#sync').textContent='Tự đồng bộ lỗi · sẽ thử lại';throw error}}
  finally{clearTimeout(timeout);if(taskLoadController===controller)taskLoadController=null}
 })();
 taskLoadPromise=pending;
 try{await pending}finally{if(taskLoadPromise===pending)taskLoadPromise=null}
}
const automaticSync=createAutoSync({canRun:()=>!!state.connection?.accountId&&!taskLoadPromise&&!state.loading&&!autoSyncEditing()&&!document.hidden&&state.page!=='automation',run:async()=>{if(window.ParentTracker?.active()){await window.ParentTracker.refresh();await window.checkDailyTasks?.('sync')}else await backgroundTaskSync()}});
window.markAutoSync=()=>automaticSync.mark();
if(window.teamHubDesktop?.onAutoSync)window.teamHubDesktop.onAutoSync(()=>{paintAutoSync();void automaticSync.tick()});
else setInterval(()=>{paintAutoSync();void automaticSync.tick()},30000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden){paintAutoSync();void automaticSync.tick()}});
