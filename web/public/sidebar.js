'use strict';
(()=>{
 const root=document.documentElement,key='hub-sidebar-collapsed';
 let collapsed=matchMedia('(max-width:760px)').matches;
 try{const saved=localStorage.getItem(key);if(saved!==null)collapsed=saved==='true';}catch{}
 root.classList.toggle('sidebar-collapsed',collapsed);
 document.addEventListener('DOMContentLoaded',()=>{
  const sidebar=document.getElementById('sidebar'),toggle=document.getElementById('sidebarToggle');
  if(!sidebar||!toggle)return;
  const reduced=()=>matchMedia('(prefers-reduced-motion:reduce)').matches;
  const sync=()=>{const label=collapsed?'Mở rộng thanh bên':'Thu gọn thanh bên';toggle.setAttribute('aria-expanded',String(!collapsed));toggle.setAttribute('aria-label',label);toggle.title=label;};
  const setCollapsed=value=>{
   window.closeInline?.();
   collapsed=value;root.classList.toggle('sidebar-collapsed',collapsed);sync();
   try{localStorage.setItem(key,String(collapsed));}catch{}
  };
  sync();toggle.addEventListener('click',()=>setCollapsed(!root.classList.contains('sidebar-collapsed')));
  window.addEventListener('storage',event=>{if(event.key===key){collapsed=event.newValue==='true';root.classList.toggle('sidebar-collapsed',collapsed);sync();}});
  const animations=new WeakMap();
  // Animate the native details rows in both directions, including rapid repeat clicks.
  sidebar.addEventListener('click',event=>{
   collapsed=root.classList.contains('sidebar-collapsed');
   const workspace=event.target.closest('#projectFilter');
   if(collapsed&&workspace){
    event.preventDefault();event.stopPropagation();setCollapsed(false);
    setTimeout(()=>{if(!collapsed&&workspace.isConnected)workspace.click();},reduced()?0:280);return;
   }
   const summary=event.target.closest('.team-group>summary');if(!summary)return;
   event.preventDefault();
   const group=summary.parentElement,children=group.querySelector('.team-children'),previous=animations.get(group);
   const opening=collapsed||!(previous?previous.opening:group.open);
   if(collapsed)setCollapsed(false);
   const start=group.open?children.getBoundingClientRect().height:0;
   previous?.animation.cancel();
   if(reduced()){group.open=opening;animations.delete(group);return;}
   group.open=true;
   const height=children.scrollHeight;
   const animation=children.animate([{height:start+'px',opacity:opening?0:1,transform:opening?'translateY(-4px)':'translateY(0)'},{height:(opening?height:0)+'px',opacity:opening?1:0,transform:opening?'translateY(0)':'translateY(-4px)'}],{duration:220,easing:'cubic-bezier(.22,1,.36,1)'});
   animations.set(group,{animation,opening});
   animation.finished.then(()=>{if(animations.get(group)?.animation!==animation)return;group.open=opening;animations.delete(group);}).catch(()=>{});
  },true);
  sidebar.addEventListener('transitionend',event=>{if(event.target===sidebar&&event.propertyName==='width')window.positionDropdown?.();});
 });
})();
