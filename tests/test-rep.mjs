import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox']});
const p=await b.newPage();await p.setViewport({width:375,height:667,deviceScaleFactor:2,isMobile:true,hasTouch:true});
const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>{errs.push('dialog:'+d.message());d.accept()});
const W=ms=>new Promise(r=>setTimeout(r,ms||500));const click=async s=>{await p.$eval(s,e=>e.click());await W()};
await p.goto('http://127.0.0.1:8833/',{waitUntil:'networkidle0'});await p.evaluate(()=>localStorage.removeItem('__D'));
await p.evaluate(async()=>{const m=await import('./test-mock/firebase-firestore.js');await m.setDoc({c:'families/arpero/todos',id:'old1'},{id:'old1',title:'Call plumber',who:'both',due:'',done:false,at:1});await m.setDoc({c:'families/arpero/todos',id:'od'},{id:'od',title:'Trash',who:'both',due:'2026-10-20',done:false,at:2,rep:{k:'weekly',days:[2],from:'sched'}})});
await p.reload({waitUntil:'networkidle0'});await W(1000);
await click('[data-q="todo"]');await p.type('#ft','Laundry');await p.select('#frep','d3');await p.select('#fw','both');await p.evaluate(()=>{const d=document.querySelector('#fd');if(!d.value){const n=new Date();d.value=n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-'+String(n.getDate()).padStart(2,'0')}});console.log('rep sel',await p.$eval('#frep',e=>e.value),await p.$eval('#ft',e=>e.value));await click('#shOk');await W(1700);
await click('[data-q="todo"]');await p.type('#ft','Dishes');await p.select('#frep','daily');await p.select('#fw','both');await p.evaluate(()=>{const d=document.querySelector('#fd');if(!d.value){const n=new Date();d.value=n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-'+String(n.getDate()).padStart(2,'0')}});await click('#shOk');await W(1700);
await p.reload({waitUntil:'networkidle0'});await W(1000);
const T=()=>p.evaluate(()=>Object.values(window.__D['families/arpero/todos']).map(t=>[t.title,t.due,JSON.stringify(t.rep),t.done,t.lastBy||'',t.count||0]));
console.log(JSON.stringify(await T()));
// check off Dishes
await p.evaluate(()=>{const id=Object.values(window.__D['families/arpero/todos']).find(t=>t.title==='Dishes').id;document.querySelector(`[data-done="${id}"]`).click()});await W(1000);
// complete old non-rep
await p.evaluate(()=>document.querySelector('[data-done="old1"]').click());await W(800);
await p.reload({waitUntil:'networkidle0'});await W(1000);console.log(JSON.stringify(await T()));
console.log('logs',JSON.stringify(Object.values(await p.evaluate(()=>window.__D['families/arpero/logs']||{})).map(l=>[l.type,l.pts,l.name])));
console.log('home',await p.evaluate(()=>document.querySelector('main,#app,body').innerText.replace(/\s+/g,' ').match(/Today.{0,400}/)?.[0]));
await p.evaluate(()=>document.querySelector('[data-go="t:todos"]').click());await W(800);
// skip Trash via edit
await p.evaluate(()=>document.querySelector('[data-edit="od"]').click());await W(500);await click('#tskip');await W(800);
console.log('trash after skip',await p.evaluate(()=>window.__D['families/arpero/todos'].od.due));
console.log('todos page',await p.evaluate(()=>document.body.innerText.replace(/\s+/g,' ').slice(0,600)));
await p.screenshot({path:'/workspace/arpero-home/shots/29-repeat-tasks.png'});
await p.goto('http://127.0.0.1:8833/?go=cal',{waitUntil:'networkidle0'});await W(1200);console.log('cal',await p.evaluate(()=>(document.body.innerText.match(/🔁[^\n]*/g)||[]).slice(0,8)));
console.log('ERR',errs);await b.close();
