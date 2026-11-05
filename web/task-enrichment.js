'use strict';
// Resolve each distinct parent once, with bounded concurrency. Many children of
// one parent must not occupy every worker while unrelated parents wait.
async function enrichIssues(issues,startFields,epicFor){
 const groups=new Map();
 for(const issue of issues){const key=issue.fields.parent?.key;if(key&&!groups.has(key))groups.set(key,issue)}
 const entries=[...groups],epics=new Map();let cursor=0;
 await Promise.all(Array.from({length:Math.min(6,entries.length)},async()=>{
  while(cursor<entries.length){const [key,issue]=entries[cursor++];epics.set(key,await epicFor(issue))}
 }));
 return issues.map(issue=>({key:issue.key,...issue.fields,startDate:startFields.map(id=>issue.fields[id]).find(value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value))||null,epic:epics.get(issue.fields.parent?.key)||null}));
}
module.exports={enrichIssues};
