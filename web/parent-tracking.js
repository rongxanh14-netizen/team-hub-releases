'use strict';
async function fetchParent(jira,key,projects){
 if(!/^[A-Z][A-Z0-9_]*-\d+$/.test(key))throw Error('Mã task không hợp lệ. Ví dụ MTG-1234.');
 const parent=await jira('/rest/api/3/issue/'+encodeURIComponent(key)+'?fields=summary,status,issuetype,project,assignee,duedate');
 if(!projects.includes(parent.fields.project?.key))throw Error('Task không thuộc workspace được phép.');
 if(parent.fields.issuetype?.subtask)throw Error('Hãy nhập mã task lớn, không phải subtask.');
 const issues=[];let token;const seen=new Set();
 do{
  const data=await jira('/rest/api/3/search/jql',{method:'POST',body:JSON.stringify({jql:`parent = "${key}" ORDER BY key ASC`,maxResults:100,fields:['summary','status','assignee','duedate','issuetype','parent'],...(token?{nextPageToken:token}:{})})});
  for(const issue of data.issues||[])if(issue.fields.issuetype?.subtask&&!issues.some(t=>t.key===issue.key))issues.push({key:issue.key,...issue.fields});
  token=data.isLast?null:data.nextPageToken;
  if(token&&seen.has(token))throw Error('Jira trả dữ liệu lặp. Hãy đồng bộ lại.');
  if(token)seen.add(token);
  if(seen.size>100)throw Error('Quá nhiều subtask để thống kê đầy đủ.');
 }while(token);
 return {parent:{key:parent.key,...parent.fields},issues,syncedAt:new Date().toISOString()};
}
module.exports={fetchParent};
