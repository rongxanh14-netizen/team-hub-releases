'use strict';
// Shared by dashboard, suggestions, sample validation and the Jira write gate.
const LabelRules=(()=>{
 const contexts=['EVENT','GAMECONCEPT','WEB-LDP'];
 const canonical=value=>String(value||'').trim().toUpperCase().replace(/\s/g,'').replace(/^GAMCONCEPT$/,'GAMECONCEPT');
 const normalize=labels=>[...new Set((Array.isArray(labels)?labels:[]).map(canonical))];
 function difficulty(labels){
  const list=normalize(labels);
  if(list.length===1){if(list[0]==='ADS')return 'hard';if(list[0]==='DAILY')return 'easy';if(['ALBUM',...contexts].includes(list[0]))return 'medium';}
  if(list.length===2){for(const [modifier,result] of [['KEY','hard'],['ADAPT','easy'],['ALBUM','medium']])if(list.includes(modifier)&&list.some(l=>contexts.includes(l)))return result;}
  return 'unknown';
 }
 const valid=labels=>difficulty(labels)!=='unknown';
 const message='Tối đa 2 labels: Ads hoặc DAILY đứng riêng; ALBUM đứng riêng hoặc ghép EVENT/GAMECONCEPT/WEB-LDP; KEY và ADAPT phải ghép đúng 1 trong 3 nhãn đó. Tổ hợp khác: Chưa phân loại.';
 return {canonical,normalize,difficulty,valid,message};
})();
if(typeof module!=='undefined')module.exports=LabelRules;
