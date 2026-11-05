const {test}=require('node:test'),assert=require('node:assert/strict');
const {aggregate,previousRange}=require('./public/planner-epics');
const options={start:'2026-11-02',end:'2026-11-08',period:'week'};
const task=(key,date,extra={})=>({key,summary:key,duedate:date,reporter:{accountId:'planner'},assignee:{accountId:'design'},status:{name:'To Do'},epic:{key:'MTG-1',name:'Game'},...extra});
test('previous complete periods handle leap year and year boundaries',()=>{
 assert.deepEqual(previousRange('2024-03-01','2024-03-31','month'),['2024-02-01','2024-02-29']);
 assert.deepEqual(previousRange('2026-01-01','2026-12-31','year'),['2025-01-01','2025-12-31']);
 assert.deepEqual(previousRange(options.start,options.end,'week'),['2026-10-26','2026-11-01']);
 assert.throws(()=>previousRange('2026-02-30','2026-03-01','week'));
});
test('all reporters count, cancelled/pending are excluded and duplicate tasks counted once',()=>{
 const rows=[task('A','2026-11-03'),task('A','2026-11-03'),task('B','2026-10-28'),task('C','2026-11-04',{status:{name:'Pending'}}),task('D','2026-11-04',{status:{name:'Cancel/Delete'}}),task('E','2026-11-04',{reporter:{accountId:'outside'}})];
 const result=aggregate({issues:rows},options);assert.equal(result.length,1);assert.equal(result[0].count,2);assert.equal(result[0].delta,1);
});
test('week hides previous-only Epics, year includes catalog zeros and no Epic tasks',()=>{
 const data={issues:[task('A','2026-10-28'),task('B','2026-11-03',{epic:null})],epics:[{key:'MTG-2',name:'Empty'}]};
 assert.deepEqual(aggregate(data,options).map(g=>g.key),['']);
 const year=aggregate(data,{...options,period:'year',start:'2026-01-01',end:'2026-12-31'});assert.equal(year.find(g=>g.key==='MTG-2').count,0);assert.equal(year.length,3);
});
test('backend paginates and loads catalog only for year',async()=>{
 const {fetchData}=require('./planner-epics');let calls=[];
 const jira=async(_url,request)=>{const body=JSON.parse(request.body);calls.push(body);return body.nextPageToken?{issues:[],isLast:true}:{issues:[{key:'A',fields:{summary:'A'}}],nextPageToken:'next'};};
 const result=await fetchData(jira,{...options,projects:['MTG'],reporters:['planner']},async()=>null);
 assert.equal(result.issues.length,1);assert.equal(calls.length,2);assert.doesNotMatch(calls[0].jql,/reporter/i);assert.match(calls[0].jql,/2026-10-26/);
});

test('team assignee filter is independent of individual member and ignores reporter scope',()=>{
 const data={issues:[task('D','2026-11-03'),task('V','2026-11-03',{assignee:{accountId:'video'}}),task('P','2026-11-03',{assignee:{accountId:'planner'}}),task('U','2026-11-03',{assignee:null}),task('X','2026-11-03',{reporter:{accountId:'outside'}})]};
 assert.equal(aggregate(data,{...options,member:['nobody']})[0].count,5);
 for(const id of ['design','video','planner'])assert.equal(aggregate(data,{...options,assignees:[id]})[0].count,id==='design'?2:1);
 assert.equal(aggregate(data,{...options,assignees:[]}).length,0);
});

test('tooltip stays outside chart and inside viewport when space is available',()=>{
 const {tooltipPosition}=require('./public/planner-epics');
 for(const chart of [{left:40,right:320,top:60,bottom:340},{left:850,right:1130,top:60,bottom:340},{left:10,right:290,top:280,bottom:560}]){
 const size={width:280,height:140},v={width:1200,height:800},p=tooltipPosition(chart,size,{x:chart.right,y:chart.bottom},v);
 assert.ok(p.x>=0&&p.y>=0&&p.x+size.width<=v.width&&p.y+size.height<=v.height);
 assert.ok(p.x>=chart.right||p.x+size.width<=chart.left||p.y>=chart.bottom||p.y+size.height<=chart.top);
 }
});

test('Epic team totals reconcile with dashboard including reporters outside Planner',()=>{
 const {dashboardPeriodTasks}=require('./public/dashboard');
 const rows=[...Array.from({length:52},(_,i)=>task('D'+i,'2026-11-04',{reporter:{accountId:i<49?'planner':'outside'},epic:i%2?null:{key:'E',name:'Epic'}})),...Array.from({length:17},(_,i)=>task('V'+i,'2026-11-05',{assignee:{accountId:'video'},reporter:{accountId:i<12?'planner':'outside'}})),task('cancel','2026-11-04',{status:{name:'Cancel/Delete'}}),task('pending','2026-11-04',{status:{name:'Pending'}}),task('prior','2026-10-28')];
 for(const id of ['design','video']){const expected=dashboardPeriodTasks(rows.filter(t=>t.assignee?.accountId===id),options.start,options.end).length;const actual=aggregate({issues:rows},{...options,assignees:[id]}).reduce((n,g)=>n+g.count,0);assert.equal(actual,expected);assert.equal(actual,id==='design'?52:17);}
});

