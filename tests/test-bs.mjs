import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox']});
const p=await b.newPage();await p.setViewport({width:375,height:667,deviceScaleFactor:2,isMobile:true,hasTouch:true});
const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
const W=ms=>new Promise(r=>setTimeout(r,ms||500));const click=async s=>{await p.$eval(s,e=>e.click());await W(300)};const type=(s,v)=>p.$eval(s,(e,v)=>{e.value=v},v);
await p.goto('http://127.0.0.1:8833/',{waitUntil:'networkidle0'});await p.evaluate(()=>localStorage.removeItem('__D'));
await p.evaluate(async()=>{const m=await import('./test-mock/firebase-firestore.js');
 await m.setDoc({c:'families/arpero/babies',id:'k'},{id:'k',name:'Kataleya',birth:'2025-11-01',routine:'9:30 Wake up\n10:00 Breakfast\n12:00 Nap\n20:00 Bedtime'});
 await m.setDoc({c:'families/arpero/babies',id:'h'},{id:'h',name:'Harper',birth:'2026-03-01',routine:'07:00 Wake up\n13:30 Nap\n19:30 Bedtime'});
 await m.setDoc({c:'families/arpero/items',id:'bf'},{id:'bf',name:'Pear puree',qty:2,unit:'ea',baby:true,exp:new Date(Date.now()+864e5).toLocaleDateString('en-CA')})});
await p.reload({waitUntil:'networkidle0'});await W(2000);
const BS=()=>p.evaluate(()=>Object.values(window.__D['families/arpero/bsched']||{}).map(x=>[x.baby,x.t,x.what,x.notify,x.lead,JSON.stringify(x.days)]));
console.log('migrated',JSON.stringify(await BS()));
console.log('home baby',await p.evaluate(()=>document.body.innerText.match(/Baby schedule[\s\S]{0,200}/)?.[0].replace(/\s+/g,' ')),'| use soon shows puree?',await p.evaluate(()=>/Pear puree/.test(document.body.innerText)));
await p.evaluate(()=>document.querySelector('button[data-go="baby"]').click());await W(800);console.log('on',await p.evaluate(()=>!!document.querySelector('#bsList')));
console.log('feeding btn visible?',!!(await p.$('[data-blog="feed"]')),'glance?',!!(await p.$('.glance')));
// add item for both
await click('#bsAdd');await p.evaluate(()=>[...document.querySelectorAll('[data-bsq]')].find(e=>e.dataset.bsq==='Feeding').click());await type('#bst','21:15');await p.$eval('#bsb',e=>e.value='both');await p.$eval('#bsl',e=>e.value='10');await p.evaluate(()=>{document.querySelector('[data-bsday="1"]').click();document.querySelector('[data-bsday="3"]').click()});await click('#shOk');await W(1700);
// edit Nap -> 12:30, bell on
const nap=await p.evaluate(()=>Object.values(window.__D['families/arpero/bsched']).find(x=>x.baby==='k'&&x.what==='Nap').id);
await p.$eval(`[data-bsed="${nap}"]`,e=>e.click());await W(300);await type('#bst','12:30');await p.$eval('#bsno',e=>e.checked=true);await p.$eval('#bsl',e=>e.value='5');await click('#shOk');await W(1700);
// toggle bell via button on Bedtime, delete Wake up
const bed=await p.evaluate(()=>Object.values(window.__D['families/arpero/bsched']).find(x=>x.baby==='k'&&x.what==='Bedtime').id);await click(`[data-bsn="${bed}"]`);await W(600);
const wk=await p.evaluate(()=>Object.values(window.__D['families/arpero/bsched']).find(x=>x.baby==='k'&&x.what==='Wake up').id);await p.$eval(`[data-bsed="${wk}"]`,e=>e.click());await W(300);await click('#bsdel');await W(800);
// empty validation
await click('#bsAdd');await click('#shOk');console.log('validation',await p.$eval('#shMsg',e=>e.textContent));await click('#shX');
await p.reload({waitUntil:'networkidle0'});await W(1500);console.log('after edits',JSON.stringify((await BS()).filter(x=>x[0]!=='h')));
await p.evaluate(()=>document.querySelector('button[data-go="baby"]').click());await W(800);console.log('on',await p.evaluate(()=>!!document.querySelector('#bsList')));
await p.screenshot({path:'/workspace/arpero-home/shots/33-baby-schedule.png'});
console.log('baby page',await p.evaluate(()=>document.querySelector('#bsList')?.innerText.replace(/\s+/g,' ').slice(0,400)));
// toggle log on
await click('#bLogT');await W(600);console.log('log on: feeding btn',!!(await p.$('[data-blog="feed"]')),'toggle still there',!!(await p.$('#bLogT')),'schedule still',!!(await p.$('#bsList')));
await p.reload({waitUntil:'networkidle0'});await W(1200);await p.evaluate(()=>document.querySelector('button[data-go="baby"]').click());await W(800);console.log('on',await p.evaluate(()=>!!document.querySelector('#bsList')));console.log('after reload log on:',!!(await p.$('[data-blog="feed"]')));
await click('#bLogT');await W(600);console.log('off again:',!(await p.$('[data-blog="feed"]')),'migrated twice?',(await BS()).length);
console.log('ERR',errs);await b.close();
