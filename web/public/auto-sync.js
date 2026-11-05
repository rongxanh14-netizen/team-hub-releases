'use strict';
function createAutoSync({now=Date.now,canRun,run}){
 const interval=60000;let next=now()+interval,running=false,failures=0;
 return {mark(){failures=0;next=now()+interval},async tick(){
  if(running||now()<next||!canRun())return;
  running=true;
  try{await run();failures=0;next=now()+interval}
  catch{failures++;next=now()+Math.min(1800000,interval*2**failures)}
  finally{running=false}
 }};
}
if(typeof module!=='undefined')module.exports={createAutoSync};
