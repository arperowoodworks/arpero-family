import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox']});
const p=await b.newPage();await p.setViewport({width:375,height:667,deviceScaleFactor:2,isMobile:true,hasTouch:true});
const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>{errs.push('dialog:'+d.message());d.accept()});
const W=ms=>new Promise(r=>setTimeout(r,ms||500));const click=async s=>{await p.$eval(s,e=>e.click());await W(300)};
const open=async()=>!!(await p.$eval('#sheet',e=>e.innerHTML));
await p.goto('http://127.0.0.1:8833/',{waitUntil:'networkidle0'});await p.evaluate(()=>localStorage.removeItem('__D'));
await p.evaluate(async()=>{const m=await import('./test-mock/firebase-firestore.js');await m.setDoc({c:'families/arpero/meta',id:'settings'},{babyLog:true});await m.setDoc({c:'families/arpero/babies',id:'b1'},{id:'b1',name:'Mia',birth:'2026-03-01'});await m.setDoc({c:'families/arpero/babies',id:'b2'},{id:'b2',name:'Leo',birth:'2026-03-01'});await m.setDoc({c:'families/arpero/items',id:'pp'},{id:'pp',name:'Pear puree',qty:3,unit:'ea',baby:true,btype:'Puree'})});
await p.reload({waitUntil:'networkidle0'});await W(800);await p.evaluate(()=>document.querySelector('[data-go="baby"]').click());await W(800);
// empty food -> message
await click('[data-blog="feed"]');await click('#shOk');console.log('empty msg:',await p.$eval('#shMsg',e=>e.textContent),'save btn enabled',await p.$eval('#shOk',e=>!e.disabled));
// with stock
await p.evaluate(()=>document.querySelector('[data-f]').click());await p.evaluate(()=>{document.querySelector('#ffood').value='Pear puree'});
await p.evaluate(()=>{const b=document.querySelector('#shOk');b.click();b.click();b.click()});await W(400);console.log('stock on: closed fast',!(await open()));
// without stock
await click('[data-blog="feed"]');await p.evaluate(()=>{document.querySelector('#ffood').value='Banana';document.querySelector('#fstock').checked=false});await click('#shOk');console.log('stock off closed',!(await open()));
// milk with no food
await click('[data-blog="feed"]');await p.evaluate(()=>{[...document.querySelectorAll('#fcat button')].find(b=>b.dataset.c==='Milk')?.click();document.querySelector('#famt').value='4'});await click('#shOk');console.log('milk closed',!(await open()));
// diaper
await click('[data-blog="diaper"]');await p.evaluate(()=>{const x=document.querySelector('[data-dt="Wet"]');x.click();x.click()});await W(300);console.log('diaper closed',!(await open()));
// med empty then filled
await click('[data-blog="med"]');await click('#shOk');console.log('med msg',await p.$eval('#shMsg',e=>e.textContent));await p.evaluate(()=>document.querySelector('#mname').value='Infant Tylenol');await click('#shOk');console.log('med closed',!(await open()));
// nap start/stop with double tap
await p.evaluate(()=>{const n=document.querySelector('[data-blog="nap"]');n.click();n.click()});await W(1700);await p.evaluate(()=>document.querySelector('[data-blog="nap"]').click());await W(600);
await p.reload({waitUntil:'networkidle0'});await W(1000);
console.log(JSON.stringify(await p.evaluate(()=>Object.values(window.__D['families/arpero/blog']||{}).map(x=>[x.kind,x.food||x.type||x.name||(x.nap?'nap':''),x.end?'ended':'']))),'stock',await p.evaluate(()=>window.__D['families/arpero/items'].pp.qty));
await p.evaluate(()=>document.querySelector('[data-go="baby"]').click());await W(800);
await click('[data-blog="feed"]');await p.evaluate(()=>{document.querySelector('#ffood').value='Sweet potato';document.querySelectorAll('#fhow button')[0].click()});await click('#shOk');await W(1600);
await p.screenshot({path:'/workspace/arpero-home/shots/30-feeding-saved.png'});
console.log('ERR',errs);await b.close();
