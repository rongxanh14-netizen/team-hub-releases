'use strict';
(()=>{
 let popup,source,month;
 const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
 function close(){if(popup){popup.remove();popup=null;}source?.focus();}
 function choose(value){const input=source;if(input.disabled)return close();input.value=value;close();input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));}
 function draw(){
  const selected=source.value,now=iso(new Date()),first=new Date(month.getFullYear(),month.getMonth(),1),start=new Date(first);start.setDate(1-(first.getDay()+6)%7);
  popup.innerHTML=`<div class="hub-date-head"><button type="button" data-prev aria-label="Tháng trước">‹</button><strong>Tháng ${month.getMonth()+1} · ${month.getFullYear()}</strong><button type="button" data-next aria-label="Tháng sau">›</button></div><div class="hub-date-grid">${['T2','T3','T4','T5','T6','T7','CN'].map(x=>`<small>${x}</small>`).join('')}${Array.from({length:42},(_,i)=>{const d=new Date(start);d.setDate(start.getDate()+i);const value=iso(d);return `<button type="button" data-date="${value}" aria-label="${value}" aria-pressed="${value===selected}" class="${d.getMonth()!==month.getMonth()?'outside ':''}${value===selected?'selected ':''}${value===now?'today':''}" ${source.min&&value<source.min||source.max&&value>source.max?'disabled':''}>${d.getDate()}</button>`}).join('')}</div><div class="hub-date-foot"><button type="button" data-clear>Xóa ngày</button><button type="button" data-today>Hôm nay</button></div>`;
  popup.querySelector('[data-prev]').onclick=()=>{month.setMonth(month.getMonth()-1);draw()};popup.querySelector('[data-next]').onclick=()=>{month.setMonth(month.getMonth()+1);draw()};popup.querySelectorAll('[data-date]').forEach(b=>b.onclick=()=>choose(b.dataset.date));popup.querySelector('[data-clear]').onclick=()=>choose('');popup.querySelector('[data-today]').onclick=()=>choose(now);
 }
 function open(input){if(input.disabled||input.readOnly)return;close();source=input;const d=input.value?new Date(input.value+'T12:00:00'):new Date();month=new Date(d.getFullYear(),d.getMonth(),1);popup=document.createElement('div');popup.className='hub-date-picker';popup.setAttribute('popover','auto');popup.setAttribute('role','dialog');popup.setAttribute('aria-label','Chọn ngày đến hạn');(input.closest("dialog")||document.body).append(popup);draw();popup.showPopover();const z=window.teamHubDesktop?.setScale?1:(parseFloat(document.documentElement.style.zoom)||1),rect=input.getBoundingClientRect(),r={left:rect.left/z,top:rect.top/z,bottom:rect.bottom/z},h=popup.offsetHeight;popup.style.left=Math.max(8,Math.min(r.left,innerWidth/z-296))+'px';popup.style.top=Math.max(8,r.bottom+h+8>innerHeight/z?r.top-h-6:r.bottom+6)+'px';popup.querySelector('.selected:not(:disabled),[data-date]:not(:disabled)')?.focus();popup.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();close();}};
 }
 document.addEventListener('click',e=>{if(e.target.matches('input[type="date"]')){e.preventDefault();open(e.target);}},true);
 document.addEventListener('keydown',e=>{if(e.target.matches('input[type="date"]')&&['Enter',' ','ArrowDown'].includes(e.key)){e.preventDefault();open(e.target);}},true);
 window.addEventListener('resize',()=>{if(popup)close()});
})();


