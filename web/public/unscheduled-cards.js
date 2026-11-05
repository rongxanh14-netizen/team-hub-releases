'use strict';
function unscheduledCards(tasks){
 const list=tasks.filter(t=>!t.duedate);
 return '<p class="hint">'+list.length+' task chưa có hạn · Chế độ chỉ xem.</p><div class="unscheduled-grid">'+list.map(t=>'<section class="unscheduled-item">'+calendarCard(t)+'<form class="unscheduled-date" data-schedule-key="'+esc(t.key)+'"><label>Ngày đến hạn<input type="date" required aria-label="Ngày đến hạn '+esc(t.key)+'"></label><button type="submit">Lưu ngày</button></form></section>').join('')+'</div>'+(list.length?'':'<p class="empty">Không có task chưa có hạn.</p>');
}
function bindUnscheduledDates(){document.querySelectorAll('[data-schedule-key]').forEach(form=>form.onsubmit=async event=>{
 event.preventDefault();if(inlineBusy)return;const input=form.querySelector('input'),button=form.querySelector('button'),date=input.value,key=form.dataset.scheduleKey;if(!date)return;
 inlineBusy=true;button.disabled=true;input.disabled=true;form.setAttribute('aria-busy','true');
 try{const saved=await api('/api/issues/'+encodeURIComponent(key)+'/duedate',{duedate:date,expectedDue:null},'PUT');const task=state.issues.find(t=>t.key===key);if(task)task.duedate=saved.duedate;render();toast('Đã thêm deadline '+key+' · '+date.split('-').reverse().join('/'));}
 catch(error){toast(error.message)}finally{inlineBusy=false;button.disabled=false;input.disabled=false;form.removeAttribute('aria-busy')}
});}
