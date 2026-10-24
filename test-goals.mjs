import puppeteer from 'puppeteer-core';import fs from 'fs';
const real=JSON.parse(fs.readFileSync('/workspace/budget/settings-backup/settings-backup.json')).settings;
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox']});
const p=await b.newPage();await p.setViewport({width:375,height:667,deviceScaleFactor:2,isMobile:true,hasTouch:true});
const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>{errs.push('dialog:'+d.message());d.accept()});
const W=ms=>new Promise(r=>setTimeout(r,ms||500));const click=async s=>{await p.$eval(s,e=>e.click());await W()};const type=(s,v)=>p.$eval(s,(e,v)=>{e.value=v},v);const sel=(s,v)=>p.$eval(s,(e,v)=>{e.value=v},v);
await p.goto('http://127.0.0.1:8833/?go=budget',{waitUntil:'networkidle0'});await p.evaluate(()=>localStorage.removeItem('__D'));
await p.evaluate(async r=>{const m=await import('./test-mock/firebase-firestore.js');await m.setDoc({c:'families/arpero/meta',id:'settings'},r)},real);await W(800);
// new shared goal
await click('[data-pgnew="both"]');await type('#pgn','Kitchen thermometer');await type('#pgt','17');await click('#shOk');await W(600);
// new oscar long-term goal then move to medium + owner wife
await click('[data-pgnew="oscar"]');await type('#pgn','Shop expansion');await sel('#pgterm','long');await type('#pgt','20000');await click('#shOk');await W(600);
const id=await p.evaluate(()=>window.__D['families/arpero/meta'].settings.pg.oscar.goals.find(g=>g.name==='Shop expansion').id);
await click(`[data-pgedit="oscar:${id}"]`);await sel('#pgterm','medium');await click('#shOk');await W(600);
// move fun money into shared goal
await click('[data-pgmove="oscar"]').catch(e=>errs.push('nomove '+e.message));
if(await p.$('#pmg')){const o=await p.$$eval('#pmg option',x=>x.map(o=>o.value));await sel('#pmg',o.find(v=>v.startsWith('both:')));await type('#pma','5');await click('#shOk');await W(600)}
await p.reload({waitUntil:'networkidle0'});await W(1200);
const st=await p.evaluate(()=>window.__D['families/arpero/meta'].settings.pg);console.log(JSON.stringify(st));
const el=await p.$('.rwh');await p.evaluate(()=>{const h=[...document.querySelectorAll('.rwh')].find(e=>e.innerText.trim()==='GOALS');h&&h.scrollIntoView()});await W(400);
await p.screenshot({path:'/workspace/arpero-home/shots/26-goal-saved.png'});
await p.evaluate(()=>scrollBy(0,560));await W(300);await p.screenshot({path:'/workspace/arpero-home/shots/27-goal-terms.png'});
console.log('ERR',errs);await b.close();
