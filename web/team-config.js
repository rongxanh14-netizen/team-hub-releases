'use strict';
const fs=require('node:fs'),path=require('node:path');
const file=path.join(require('./runtime-paths').dataDir,'team-config.json');
function validate(value){
 if(!value||value.version!==1||!value.teams)throw Error('File cấu hình team không hợp lệ.');
 const teams={};for(const team of ['Design','Video','Planner']){const rows=value.teams[team];if(!Array.isArray(rows)||rows.length>200)throw Error('Danh sách thành viên không hợp lệ.');const seen=new Set();teams[team]=rows.map(row=>{if(!Array.isArray(row)||row.length!==2||row.some(x=>typeof x!=='string'||!x.trim()||x.length>200)||!/^[-a-zA-Z0-9:]+$/.test(row[0])||seen.has(row[0]))throw Error('Thông tin thành viên không hợp lệ.');seen.add(row[0]);return row.map(x=>x.trim());});}
 const result={version:1,teams};for(const key of ['templateUrl','rulesUrl','serverTemplateUrl']){const url=value[key]||'';if(url&&(!/^https:\/\/docs\.google\.com\/spreadsheets\/d\/[\w-]+(?:[/?#]|$)/.test(url)||url.length>2000))throw Error('Link Google Sheets không hợp lệ.');result[key]=url;}return result;
}
function read(){try{return validate(JSON.parse(fs.readFileSync(file,'utf8')))}catch{return{version:1,teams:{Design:[],Video:[],Planner:[]},templateUrl:'',rulesUrl:'',serverTemplateUrl:''}}}
function save(value){const config=validate(value);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file+'.tmp',JSON.stringify(config,null,2));fs.renameSync(file+'.tmp',file);return config;}
module.exports={read,save,validate};
