'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {enrichIssues}=require('./task-enrichment');
test('enrichment resolves unique parents with bounded concurrency and preserves rows and dates',async()=>{
 const issues=Array.from({length:180},(_,i)=>({key:'MTG-'+i,fields:{summary:'Task '+i,parent:{key:'P-'+Math.floor(i/10)},custom:'2026-10-24'}}));
 issues.push({key:'NO-PARENT',fields:{summary:'Standalone',custom:'invalid'}});
 let active=0,peak=0,calls=0;
 const rows=await enrichIssues(issues,['custom'],async issue=>{calls++;peak=Math.max(peak,++active);await new Promise(r=>setTimeout(r,2));active--;return {key:issue.fields.parent.key}});
 assert.equal(calls,18);assert.equal(peak,6);assert.equal(rows.length,181);
 assert.deepEqual(rows.map(r=>r.key),issues.map(r=>r.key));
 assert.equal(rows[0].startDate,'2026-10-24');assert.equal(rows[9].epic.key,'P-0');assert.equal(rows[10].epic.key,'P-1');
 assert.equal(rows[180].epic,null);assert.equal(rows[180].startDate,null);
});
test('enrichment rejects errors instead of reporting incomplete successful data',async()=>{
 await assert.rejects(enrichIssues([{key:'T-1',fields:{parent:{key:'P-1'}}}],[],async()=>{throw Error('offline')}),/offline/);
 assert.deepEqual(await enrichIssues([],[],()=>{throw Error('unexpected')}),[]);
});
