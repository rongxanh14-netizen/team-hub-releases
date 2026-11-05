'use strict';
const {previousRange}=require('./public/planner-epics');
async function fetchData(jira,{start,end,period,projects},epicFor){
 const previous=previousRange(start,end,period);
 if(!projects.length)throw Error('Chưa cấu hình workspace');
 const search=async(jql,fields)=>{let all=[],token;for(let n=0;n<100;n++){const d=await jira('/rest/api/3/search/jql',{method:'POST',body:JSON.stringify({jql,fields,maxResults:100,...(token?{nextPageToken:token}:{})})});all.push(...(d.issues||[]));token=d.nextPageToken;if(d.isLast||!token)return all;}throw Error('Quá nhiều task. Hãy chọn kỳ nhỏ hơn.');};
 const scope=`project in (${projects.map(p=>JSON.stringify(p)).join(',')})`;
 const [issues,epics]=await Promise.all([
 search(`${scope} AND duedate >= "${previous[0]}" AND duedate <= "${end}"`,['summary','duedate','status','assignee','reporter','parent','issuetype','project']),
 period==='year'?search(`${scope} AND issuetype = Epic`,['summary','project']):[]
 ]);
 return {issues:await require('./task-enrichment').enrichIssues(issues,[],epicFor),epics:epics.map(e=>({key:e.key,name:e.fields.summary,project:e.fields.project})),previous};
}
module.exports={fetchData};
