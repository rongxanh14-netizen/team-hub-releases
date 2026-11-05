(function(root){
 'use strict';
 const status=t=>String(t.status?.name||'').toUpperCase().replace(/[\s_-]/g,'');
 const excluded=t=>['CANCEL/DELETE','CANCEL','DELETE','CANCELLED','CANCELED','PENDING'].includes(status(t));
 const finished=t=>!excluded(t)&&(['QC','READY','DONE'].includes(status(t))||t.status?.statusCategory?.key==='done');
 function summarize(issues,accountId,date){
  const tasks=issues.filter(t=>t.assignee?.accountId===accountId&&t.duedate===date&&!excluded(t));
  const remaining=tasks.filter(t=>!finished(t));
  const late=remaining.filter(t=>['TODO','OPEN'].includes(status(t))||t.status?.statusCategory?.key==='new');
  return {total:tasks.length,remaining:remaining.length,late:late.length,complete:tasks.length>0&&remaining.length===0};
 }
 function decide(summary,seen,trigger,hour){
  if(summary.complete&&!seen.complete)return ['complete'];
  const notices=[];
  if(trigger==='open'&&!seen.morning)notices.push('morning');
  if(['open','sync'].includes(trigger)&&hour>=15&&summary.late>0&&!seen.late)notices.push('late');
  return notices;
 }
 const rules={status,excluded,finished,summarize,decide};
 if(typeof module!=='undefined')module.exports=rules;
 else root.DailyRules=rules;
})(typeof window==='undefined'?globalThis:window);
