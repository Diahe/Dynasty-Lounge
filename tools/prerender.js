const {chromium}=require('playwright');const fs=require('fs'),path=require('path');
(async()=>{const b=await chromium.launch();
for(const f of ['index.html','food.html','tea.html','bar.html']){
 const p=await b.newPage({viewport:{width:1440,height:900}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.route(/^https?:/,r=>r.abort());
 await p.goto('file://'+path.resolve('site',f));await p.waitForTimeout(300);
 const inner=await p.$eval('#app',e=>e.innerHTML);
 const fp=path.join('site',f);let h=fs.readFileSync(fp,'utf8');
 h=h.replace(/<div id="app">[\s\S]*?<\/div>\n<template id="tpl">/, ()=>'<div id="app">'+inner+'</div>\n<template id="tpl">');
 fs.writeFileSync(fp,h);
 console.log(f,'errors:',errs,'len',inner.length, 'sc-left:',/sc-for|sc-if|\{\{/.test(inner));
 await p.screenshot({path:'shot-'+f+'.png'});
 await p.setViewportSize({width:390,height:844});await p.screenshot({path:'m-'+f+'.png'});
 await p.close();}
await b.close();})();
