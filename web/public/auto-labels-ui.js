'use strict';
let autoPreview=null,autoBusy=false;
const autoDialog=document.createElement('dialog');autoDialog.id='autoLabelsDialog';document.body.append(autoDialog);
function autoLabelTags(labels){return labels.map(l=>`<span class="task-label-chip" style="${labelPaint(l)}">${esc(l)}</span>`).join(' ')||'<span class="hint">—</span>'}
function renderAutoLabels(message=''){
  const rows=(autoPreview?.rows||[]).filter(r=>!r.existing.length||r.status==='applied').sort((a,b)=>Number(b.eligible)-Number(a.eligible)),ready=rows.filter(r=>r.eligible);
  autoDialog.innerHTML=`<div class="dialog-top"><div><small>TEAM DESIGN</small><h2>Auto Labels</h2></div><button id="closeAutoLabels" aria-label="Đóng Auto Labels" ${autoBusy?'disabled':''}>×</button></div><p class="hint">Đề xuất từ tiêu đề, mô tả và liên kết phụ thuộc theo <a href="${esc(state.teamConfig?.rulesUrl||'#')}" target="_blank" rel="noopener">quy ước Labels</a> · bản ngày 19/10/2026. GAME CONCEPT được lưu thành GAMECONCEPT trên Jira.</p><p class="hint">Chỉ gắn nhãn cho task chưa có nhãn. Task đã có nhãn được khóa. ${esc(LabelRules.message)}</p><div role="status" class="auto-result">${esc(message||`Tuần ${autoPreview?.start||''} → ${autoPreview?.end||''} · ${autoPreview?.rows?.length||0} task đã quét · ${rows.filter(r=>!r.existing.length).length} task chưa có nhãn · ${ready.length} task có thể bổ sung nhãn`)}</div>${rows.length?`<div class="auto-selection"><label><input id="autoSelectAll" type="checkbox" ${autoBusy?'disabled':''}> Chọn tất cả đề xuất có thể áp dụng</label><span id="autoSelectedCount">0 task đã chọn</span></div><div class="auto-rows">${rows.map(r=>`<article class="auto-row"><div><input type="checkbox" data-auto-key="${esc(r.key)}" aria-label="Chọn ${esc(r.key)}" ${!r.eligible||autoBusy?'disabled':''}></div><div><a href="https://tpl-vn.atlassian.net/browse/${encodeURIComponent(r.key)}" target="_blank" rel="noopener"><b>${esc(r.key)} · ${esc(r.summary)}</b></a><p class="hint">${esc(r.assignee||'')}</p><div class="auto-tagline"><span>Hiện tại</span>${autoLabelTags(r.existing)}</div><div class="auto-tagline"><span>Thêm</span>${autoLabelTags(r.additions)}</div><p class="hint">${r.reasons.map(esc).join(' · ')}${(r.references||[]).length?'<br>Mẫu tham chiếu: '+r.references.map(ref=>'<a href="https://tpl-vn.atlassian.net/browse/'+encodeURIComponent(ref.key)+'" target="_blank" rel="noopener">'+esc(ref.key)+'</a> ('+ref.score+'% giống văn bản · '+esc(ref.labels.join(' + '))+')').join(', '):''}</p>${!r.existing.length&&r.status!=='error'&&r.status!=='applied'?`<details class="manual-labels"><summary>Chọn / sửa nhãn đề xuất</summary><div class="learning-choices">${['GAMECONCEPT','WEB-LDP','ALBUM','DAILY','EVENT','Ads','KEY','ADAPT'].map(l=>`<label><input type="checkbox" value="${l}" ${(r.labels||[]).some(v=>labelKey(v)===labelKey(l))?'checked':''} ${autoBusy?'disabled':''}>${l}</label>`).join('')}</div><span class="hint" data-choose-labels="${esc(r.key)}">Chọn nhãn để tự chọn task. Chỉ ghi Jira khi bấm Áp dụng.</span></details>`:''}</div><span class="badge">${r.status==='labeled'?'Đã có nhãn · Khóa':r.status==='applied'?'Đã cập nhật':r.status==='ready'?'Đề xuất':r.status==='unchanged'?'Đã đủ nhãn':r.status==='error'?'Lỗi đọc':'Cần kiểm tra'}</span></article>`).join('')}</div>`:''}<div class="actions"><button id="applyAutoLabels" class="primary" disabled>${autoBusy?'Đang xử lý…':'Áp dụng nhãn lên Jira'}</button></div>`;
  $('#closeAutoLabels').onclick=()=>autoDialog.close();
  $$('[data-choose-labels]').forEach(marker=>{
    const details=marker.closest('details'),article=marker.closest('article'),taskBox=article.querySelector('[data-auto-key]');
    details.querySelectorAll('input').forEach(input=>input.onchange=()=>{
      const row=autoPreview.rows.find(r=>r.key===marker.dataset.chooseLabels);
      const labels=[...details.querySelectorAll('input:checked')].map(i=>i.value);
      row.labels=labels;row.manualDirty=true;
      const existingGroups=row.existing.filter(l=>['GAMECONCEPT','WEB-LDP','ALBUM','DAILY','EVENT','ADS'].includes(labelKey(l)));
      const keyOnly=!LabelRules.valid(labels);
      const conflict=keyOnly||existingGroups.some(l=>!labels.some(v=>labelKey(v)===labelKey(l)));
      row.additions=conflict?[]:labels.filter(l=>!row.existing.some(v=>labelKey(v)===labelKey(l)));
      row.eligible=!conflict&&row.additions.length>0;row.status=row.eligible?'ready':labels.length&&!conflict?'unchanged':'review';
      row.reasons=[keyOnly?LabelRules.message:conflict?'Task có nhãn nhóm khác. Giữ nhãn đó trong lựa chọn hoặc sửa nhãn hiện tại trên card trước.':!labels.length?'Chọn ít nhất một nhãn.':row.eligible?'Nhãn bạn chọn sẽ được thêm khi bấm Áp dụng.':'Task đã có đủ nhãn đã chọn.'];
      taskBox.disabled=!row.eligible;taskBox.checked=row.eligible;
      article.querySelectorAll('.auto-tagline')[1].innerHTML='<span>Thêm</span>'+autoLabelTags(row.additions);
      article.querySelector('.badge').textContent=row.eligible?'Đã chọn':row.status==='unchanged'?'Đã đủ nhãn':'Cần kiểm tra';
      marker.textContent=row.reasons[0];update();
    });
  });
  const update=()=>{const count=$$('[data-auto-key]:checked').length;$('#autoSelectedCount').textContent=count+' task đã chọn';$('#applyAutoLabels').disabled=!count||autoBusy;const eligibleCount=rows.filter(r=>r.eligible).length;$('#autoSelectAll').checked=!!eligibleCount&&count===eligibleCount;$('#autoSelectAll').indeterminate=count>0&&count<eligibleCount};
  $$('[data-auto-key]').forEach(el=>el.onchange=update);
  if($('#autoSelectAll'))$('#autoSelectAll').onchange=e=>{$$('[data-auto-key]:not(:disabled)').forEach(el=>el.checked=e.target.checked);update()};
  $('#applyAutoLabels').onclick=async()=>{
    const keys=$$('[data-auto-key]:checked').map(el=>el.dataset.autoKey);if(!keys.length||autoBusy)return;
    autoBusy=true;renderAutoLabels('Đang bổ sung nhãn cho '+keys.length+' task…');
    try{for(const key of keys){const row=rows.find(r=>r.key===key);if(row.manualDirty){const choice=await api('/api/auto-labels/choose',{token:autoPreview.token,key,labels:row.labels});Object.assign(row,choice.row);row.manualDirty=false;if(!row.eligible)throw Error(key+': không có nhãn mới để áp dụng.')}}const data=await api('/api/auto-labels/apply',{token:autoPreview.token,keys});for(const result of data.results){const row=rows.find(r=>r.key===result.key);if(result.ok){row.existing=[...row.existing,...result.labels];row.additions=[];row.eligible=false;row.status='applied';row.reasons=['Đã bổ sung nhãn lên Jira',result.learningWarning||'Đã lưu làm mẫu đã duyệt cho lần sau.']}else{row.eligible=false;row.status='review';row.reasons=[result.message]}}autoBusy=false;renderAutoLabels(`Đã cập nhật ${data.results.filter(r=>r.ok).length}/${keys.length} task · ${data.results.filter(r=>r.sampleSaved).length} mẫu đã tự lưu. Các lỗi được ghi tại từng dòng.`);await load()}catch(e){autoBusy=false;renderAutoLabels(e.message+' Hãy đóng và quét lại để kiểm tra dữ liệu mới nhất.');$('#applyAutoLabels').disabled=true;autoPreview.rows.forEach(r=>r.eligible=false);renderAutoLabels(e.message+' Hãy đóng và quét lại.')}
  };
}
autoDialog.addEventListener('cancel',e=>{if(autoBusy)e.preventDefault()});
$('#autoLabels').onclick=async()=>{
  if(autoBusy)return;
  autoPreview=null;autoBusy=true;
  try{
    renderAutoLabels('Đang tải dữ liệu tuần để chuẩn bị quét…');autoDialog.showModal();
    await readyWeeklyTasks();
    const [start,end]=range();
    const tasks=filtered().filter(t=>teamOf(t)==='Design'&&t.duedate>=start&&t.duedate<=end);
    if(!tasks.length)throw Error('Không có task Design trong bộ lọc hiện tại.');
    if(tasks.length>100)throw Error('Có '+tasks.length+' task. Lọc thành viên/Epic xuống tối đa 100 task mỗi lần quét.');
    renderAutoLabels('Đang quét tuần '+start+' → '+end+' · '+tasks.length+' task…');
    autoPreview=await api('/api/auto-labels/preview',{keys:tasks.map(t=>t.key),start,end});
  }catch(e){autoBusy=false;renderAutoLabels(e.message);return}
  finally{autoBusy=false}
  renderAutoLabels();
};
