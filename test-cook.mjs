import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox']});
const p=await b.newPage();await p.setViewport({width:375,height:667,deviceScaleFactor:2,isMobile:true,hasTouch:true});
const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>{errs.push('dialog:'+d.message());d.accept()});
const W=ms=>new Promise(r=>setTimeout(r,ms||500));const click=async s=>{await p.$eval(s,e=>e.click());await W()};const type=(s,v)=>p.$eval(s,(e,v)=>{e.value=v;e.dispatchEvent(new Event('input'));e.dispatchEvent(new Event('change'))},v);
await p.goto('http://127.0.0.1:8833/?go=dinner',{waitUntil:'networkidle0'});await p.evaluate(()=>localStorage.removeItem('__D'));
await p.evaluate(async()=>{const m=await import('./test-mock/firebase-firestore.js');const c={c:'families/arpero/items'};
 const I=[{id:'rice',name:'Rice',qty:2,unit:'lb',cat:'Pantry',min:1,ucost:1.2},{id:'chk',name:'Chicken breast',qty:1.5,unit:'lb',cat:'Meat & Fish',min:0,ucost:3.47},{id:'tort',name:'Tortillas',qty:10,unit:'ea',cat:'Bakery',min:2},{id:'apl',name:'Apples',qty:6,unit:'ea',cat:'Produce',min:2,ucost:.5}];
 for(const i of I)await m.setDoc({...c,id:i.id},i);await m.setDoc({c:'families/arpero/meta',id:'settings'},{hb:{setup:true,income:[],limits:{groceries:600}}})});
await p.reload({waitUntil:'networkidle0'});await W(1000);
await click('#ckNew');await type('#ckn','Chicken tacos');await p.$eval('#ckm',e=>e.value='dinner');await type('#cks','4');
const rows=await p.$$('.ingr');
await p.evaluate(()=>{const R=[...document.querySelectorAll('.ingr')];const f=(r,n,q,u)=>{r.querySelector('.ign').value=n;r.querySelector('.igq').value=q;r.querySelector('.igu').value=u};f(R[0],'chicken breast',24,'oz');f(R[1],'tortillas',8,'ea')});
await click('#ckadd');await p.evaluate(()=>{const r=[...document.querySelectorAll('.ingr')].at(-1);r.querySelector('.ign').value='Cilantro';r.querySelector('.igq').value='1';r.querySelector('.igu').value='bunch'});
await type('#ckr','5');await type('#cklq','2');await click('#shOk');await W(600);
await type('[data-pr="2"]','0.79');await W(300);
console.log('summary:',await p.$eval('#sheet',e=>e.innerText.replace(/\s+/g,' ').slice(0,700)));
await click('#shOk');await W(800);
console.log('E1',errs);await click('#snNew');console.log('snack sheet',await p.$eval('#sheet',e=>e.innerText.slice(0,80)));await type('#sni','Apples');await type('#snq','1');await click('#shOk');await W(600);console.log('after snack save',await p.$eval('#sheet',e=>e.innerHTML.slice(0,200)),errs);await click('#shOk');await W(800);
await p.reload({waitUntil:'networkidle0'});await W(1200);
const D=await p.evaluate(()=>window.__D);console.log('items',JSON.stringify(Object.values(D['families/arpero/items']).map(i=>[i.name,i.qty,i.unit,i.ucost||''])));
console.log('cooks',JSON.stringify(Object.values(D['families/arpero/cooks']||{}).map(c=>[c.name,c.mtype,c.cost,c.partial,c.servings])));console.log('shop',JSON.stringify(Object.values(D['families/arpero/shop']||{}).map(x=>x.name)),'meals',Object.values(D['families/arpero/meals']||{}).length);
await p.screenshot({path:'/workspace/arpero-home/shots/28-cooked-dish.png'});
// undo snack
await p.evaluate(()=>[...document.querySelectorAll('[data-ckv]')].find(e=>/Apples/.test(e.innerText)).click());await W(500);await click('#ckU');await W(800);
console.log('apples after undo',await p.evaluate(()=>window.__D['families/arpero/items'].apl.qty),'cooks',Object.keys(await p.evaluate(()=>window.__D['families/arpero/cooks'])).length);
// budget
await p.goto('http://127.0.0.1:8833/?go=budget',{waitUntil:'networkidle0'});await W(1000);console.log('budget food:',await p.evaluate(()=>[...document.querySelectorAll('.card')].find(e=>/Food this month/.test(e.innerText))?.innerText.replace(/\s+/g,' ')));
console.log('ERR',errs);await b.close();
