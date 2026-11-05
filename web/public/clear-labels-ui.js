'use strict';
const clearDialog=document.createElement('dialog');clearDialog.id='clearLabelsDialog';document.body.append(clearDialog);
let clearBusy=false,clearPreview=null;
function renderClearLabels(message=''){
  const rows=clearPreview?.rows||[],targets=rows.filter(r=>r.eligible),errors=rows.filter(r=>r.status==='error');
  clearDialog.innerHTML=`<div class="dialog-top"><div><small>TEAM DESIGN</small><h2>Xóa Labels trong tuần</h2></div><button id="closeClearLabels" aria-label="Đóng" ${clearBusy?'disabled':''}>×</button></div><p>Tuần ${esc(clearPreview?.start||'')} → ${esc(clearPreview?.end||'')} · Theo bộ lọc thành viên, Project, Epic và tìm kiếm hiện tại. Bao gồm cả Thứ 7 và Chủ nhật.</p><p class="hint">Xóa tất cả nhãn của các task trong danh sách dưới đây, kể cả KEY và nhãn tùy chỉnh. Task và các thông tin khác được giữ nguyên.</p><div class="auto-result" role="status">${esc(message||`${targets.length} task sẽ được xóa nhãn · ${targets.reduce((n,r)=>n+r.existing.length,0)} nhãn`)}</div><div class="auto-rows">${rows.map(r=>`<article class="auto-row"><div></div><div><b>${esc(r.key)} · ${esc(r.summary)}</b><p class="hint">${esc(r.assignee||'')}</p>${autoLabelTags(r.existing)}${r.reasons?.length?`<p class="hint">${r.reasons.map(esc).join(' · ')}</p>`:''}</div><span class="badge">${r.status==='cleared'?'Đã xóa':r.status==='error'?'Lỗi':r.eligible?'Sẽ xóa':'Không có nhãn'}</span></article>`).join('')}</div><div class="actions"><button id="confirmClearLabels" class="danger-outline" ${clearBusy||!targets.length||errors.length?'disabled':''}>${clearBusy?'Đang xử lý…':`Xác nhận xóa nhãn của ${targets.length} task`}</button></div>`;
  $('#closeClearLabels').onclick=()=>clearDialog.close();
  $('#confirmClearLabels').onclick=async()=>{
    if(clearBusy)return;const keys=targets.map(r=>r.key);if(!keys.length)return;
    clearBusy=true;renderClearLabels('Đang xóa nhãn trên Jira…');
    try{const data=await api('/api/auto-labels/apply',{token:clearPreview.token,keys});for(const result of data.results){const row=rows.find(r=>r.key===result.key);row.eligible=false;row.status=result.ok?'cleared':'error';row.reasons=[result.ok?'Đã xóa các nhãn hiển thị ở trên.':result.message]}clearBusy=false;renderClearLabels(`Đã xóa nhãn của ${data.results.filter(r=>r.ok).length}/${keys.length} task. Nhãn cũ vẫn hiển thị để đối chiếu.`);await load()}
    catch(e){clearBusy=false;rows.forEach(r=>r.eligible=false);renderClearLabels(e.message+' Đóng và xem trước lại để kiểm tra kết quả trước khi thử lại.')}
  };
}
clearDialog.addEventListener('cancel',e=>{if(clearBusy)e.preventDefault()});
$('#clearWeekLabels').onclick=async()=>{
  if(clearBusy||state.loading)return toast('Đợi đồng bộ xong dữ liệu rồi thử lại.');
  if(state.period!=='week'||state.unscheduled)return toast('Chọn chế độ Tuần và tắt “Task chưa có hạn” để xóa nhãn trong tuần đang hiển thị.');
  const [start,end]=range(),tasks=filtered().filter(t=>teamOf(t)==='Design'&&t.duedate>=start&&t.duedate<=end);
  if(!tasks.length)return toast('Không có task Design trong tuần và bộ lọc hiện tại.');
  if(tasks.length>100)return toast('Có hơn 100 task. Lọc theo thành viên hoặc Epic để xử lý tối đa 100 task mỗi lần.');
  clearPreview={start,end,rows:[]};clearBusy=true;renderClearLabels('Đang kiểm tra nhãn hiện tại trên Jira…');clearDialog.showModal();
  try{clearPreview=await api('/api/auto-labels/preview',{keys:tasks.map(t=>t.key),start,end,mode:'clear'});clearBusy=false;renderClearLabels(clearPreview.rows.some(r=>r.status==='error')?'Một số task không đọc được. Đóng và quét lại trước khi xóa.':'')}
  catch(e){clearBusy=false;renderClearLabels(e.message)}
};
