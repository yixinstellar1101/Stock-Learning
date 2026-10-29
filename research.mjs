// Optional maintenance tool: verify only the selected official US resources.
// Records metadata, not copies of tutorial bodies or real-time prices.
import {parseHTML} from 'linkedom';
import fs from 'node:fs/promises';
import {sources} from './src/sources.mjs';
const results=await Promise.allSettled(sources.map(async s=>{
  const response=await fetch(s.url,{signal:AbortSignal.timeout(25000)});
  const {document}=parseHTML(await response.text());
  return {id:s.id,url:s.url,finalUrl:response.url,title:s.title,pageTitle:document.title,
    organization:s.org,httpStatus:response.status,access:s.access,
    originalChineseAnnotation:s.why};
}));
const record={verifiedAt:new Date().toISOString(),timezone:'Asia/Shanghai',
  method:'Direct official-page access. A successful status does not verify dynamic data or gated course contents.',
  sources:results.map((r,i)=>r.status==='fulfilled'?r.value:{id:sources[i].id,url:sources[i].url,error:String(r.reason)})};
await fs.mkdir('research',{recursive:true});
await fs.writeFile('research/sources.json',JSON.stringify(record,null,2));
console.log(JSON.stringify(record,null,2));
