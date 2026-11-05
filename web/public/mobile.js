'use strict';
(()=>{
 const phone=matchMedia('(max-width:760px)'),reduced=matchMedia('(prefers-reduced-motion:reduce)');
 const root=document.documentElement,sidebar=document.getElementById('sidebar'),main=document.querySelector('body>main'),toggle=document.getElementById('sidebarToggle');
 if(!sidebar||!main||!toggle)return;
 const menu=document.createElement('button');menu.type='button';menu.className='mobile-menu';menu.setAttribute('aria-label','Mở menu điều hướng');menu.setAttribute('aria-controls','sidebar');menu.setAttribute('aria-expanded','false');menu.innerHTML='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';
 main.querySelector('header').prepend(menu);
 const backdrop=document.createElement('button');backdrop.type='button';backdrop.className='mobile-nav-backdrop';backdrop.tabIndex=-1;backdrop.setAttribute('aria-label','Đóng menu điều hướng');document.body.append(backdrop);
 let open=false,desktopCollapsed=root.classList.contains('sidebar-collapsed');
 function drawer(value,restore=true){
  open=phone.matches&&value;root.classList.toggle('mobile-nav-open',open);menu.setAttribute('aria-expanded',String(open));main.inert=open;sidebar.inert=phone.matches&&!open;
  if(phone.matches){toggle.setAttribute('aria-label','Đóng menu điều hướng');toggle.setAttribute('aria-expanded',String(open));toggle.title='Đóng menu điều hướng';}
  if(open){window.closeInline?.();toggle.focus({preventScroll:true});}else if(restore&&phone.matches)menu.focus({preventScroll:true});
 }
 function viewport(){
  if(phone.matches){desktopCollapsed=root.classList.contains('sidebar-collapsed');root.classList.remove('sidebar-collapsed');}
  else{root.classList.toggle('sidebar-collapsed',desktopCollapsed);toggle.setAttribute('aria-label',desktopCollapsed?'Mở rộng thanh bên':'Thu gọn thanh bên');toggle.setAttribute('aria-expanded',String(!desktopCollapsed));}
  drawer(false,false);
 }
 viewport();phone.addEventListener('change',viewport);menu.addEventListener('click',()=>drawer(!open));backdrop.addEventListener('click',()=>drawer(false));
 toggle.addEventListener('click',event=>{if(!phone.matches)return;event.preventDefault();event.stopImmediatePropagation();drawer(false);},true);
 sidebar.addEventListener('click',event=>{if(phone.matches&&event.target.closest('.team-children button,#nav button,.brand'))drawer(false);});
 window.addEventListener('hashchange',()=>{if(open)drawer(false);});
 document.addEventListener('keydown',event=>{
  if(!open)return;
  if(event.key==='Escape'){event.preventDefault();window.closeInline?.();drawer(false);return;}
  if(event.key==='Tab'){
   const items=[...sidebar.querySelectorAll('button,a[href],summary,input,select,[tabindex="0"]')].filter(el=>!el.disabled&&el.getClientRects().length);
   const first=items[0],last=items.at(-1);
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
  }
 });
 // Pointer feedback never captures the pointer or prevents scrolling/pinch zoom.
 let touch=null;
 const clear=()=>{touch?.element?.classList.remove('touch-pressed');touch=null;};
 document.addEventListener('pointerdown',event=>{
  if(event.pointerType!=='touch'||!phone.matches||!event.isPrimary)return;
  clear();const element=event.target.closest('button,summary,a,[role="button"],[role="menuitemradio"],[role="menuitemcheckbox"]');
  touch={element,x:event.clientX,y:event.clientY,id:event.pointerId,drawer:open&&sidebar.contains(event.target)};element?.classList.add('touch-pressed');
 },{passive:true});
 document.addEventListener('pointermove',event=>{if(touch&&event.pointerId===touch.id&&Math.hypot(event.clientX-touch.x,event.clientY-touch.y)>12)touch.element?.classList.remove('touch-pressed');},{passive:true});
 document.addEventListener('pointerup',event=>{
  if(!touch||touch.id!==event.pointerId)return;
  const current=touch,dx=event.clientX-current.x,dy=event.clientY-current.y;clear();
  if(current.drawer&&dx < -65&&Math.abs(dy)<35){drawer(false);return;}
  if(!current.element||Math.hypot(dx,dy)>12||reduced.matches)return;
  const dot=document.createElement('span');dot.className='touch-feedback';dot.setAttribute('aria-hidden','true');dot.style.left=event.clientX+'px';dot.style.top=event.clientY+'px';document.body.append(dot);setTimeout(()=>dot.remove(),350);
 },{passive:true});
 document.addEventListener('pointercancel',clear,{passive:true});window.addEventListener('blur',clear);
 // Multi-select sheets need an explicit close action for one-handed use.
 new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes){
  if(!(node instanceof HTMLElement)||node.id!=='cardDropdown'||!phone.matches)continue;
  const close=document.createElement('button');close.type='button';close.className='mobile-filter-close';close.textContent='×';close.setAttribute('aria-label','Đóng bộ lọc');close.onclick=()=>window.closeInline?.();node.prepend(close);
 }}).observe(document.body,{childList:true});
})();
