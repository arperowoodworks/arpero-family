import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox']});
const p=await b.newPage();await p.setViewport({width:375,height:667,deviceScaleFactor:2,isMobile:true,hasTouch:true});
const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>{errs.push('dialog:'+d.message());d.accept()});
const W=ms=>new Promise(r=>setTimeout(r,ms||500));const click=async s=>{await p.$eval(s,e=>e.click());await W(300)};const type=(s,v)=>p.$eval(s,(e,v)=>{e.value=v;e.dispatchEvent(new Event('input'));e.dispatchEvent(new Event('change'))},v);
const SP=()=>p.evaluate(()=>Object.values(window.__D['families/arpero/spend']||{}).map(x=>[x.id.slice(0,14),x.kind||'',x.cat,x.amt,x.ym,x.who,x.biz?'biz':'']));
const food=()=>p.evaluate(()=>[...document.querySelectorAll('.card')].find(e=>/Food this month/.test(e.innerText))?.innerText.replace(/\s+/g,' ').slice(0,120));
await p.goto('http://127.0.0.1:8833/',{waitUntil:'networkidle0'});await p.evaluate(()=>localStorage.removeItem('__D'));
await p.evaluate(async()=>{const m=await import('./test-mock/firebase-firestore.js');await m.setDoc({c:'families/arpero/meta',id:'settings'},{hb:{setup:true,income:[{id:'i1',who:'oscar',amt:2000,freq:'biweekly',next:'2026-10-30'}],limits:{groceries:400,gas:100}}});
 await m.setDoc({c:'families/arpero/spend',id:'r1'},{id:'r1',who:'oscar',kind:'hh',cat:'groceries',amt:52.10,note:'🧾 Aldi receipt (9 items)',receipt:true,date:'2026-10-20',at:Date.parse('2026-10-20T12:00'),ym:'2026-10'})});
await p.reload({waitUntil:'networkidle0'});await W(800);
// 1. manual item with past date & no qty (his case)
await p.evaluate(()=>{S_=0});await p.evaluate(()=>[...document.querySelectorAll('nav button, nav a, [data-tab]')].find(x=>/Groceries/.test(x.innerText)).click());await W(600);await p.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(x=>/^\s*(In stock|Stock|Have)/i.test(x.innerText));b&&b.click()});await W(500);
await click('#addBtn');
await type('#fn','Walmart groceries 10/16');await type('#fpp','87.45');await type('#fbo','2026-10-16');await click('#shOk');await W(1700);
await click('#addBtn');await type('#fn','Bananas');await type('#fq','6');await type('#fpp','1.50');await type('#fbo','2026-09-28');await click('#shOk');await W(1700);
await p.reload({waitUntil:'networkidle0'});await W(800);console.log('after items',JSON.stringify(await SP()));
// edit price then clear price
const iid=await p.evaluate(()=>Object.values(window.__D['families/arpero/items']).find(i=>i.name==='Bananas').id);
await p.evaluate(id=>{const e=[...document.querySelectorAll('[data-item],[data-iedit],[data-edit]')].find(x=>x.dataset.item===id||x.dataset.iedit===id||x.dataset.edit===id);e&&e.click();return !!e},iid).then(x=>console.log('found item el',x));await W(400);
if(await p.$('#fpp')){await type('#fpp','2.25');await click('#shOk');await W(1700);console.log('edited',JSON.stringify((await SP()).filter(x=>x[0].startsWith('it_'+iid.slice(0,11)))))}
// 2. grocery trip
await p.goto('http://127.0.0.1:8833/?go=budget',{waitUntil:'networkidle0'});await W(1000);console.log('food before trip',await food());
await click('#hbTrip');await p.evaluate(()=>document.querySelector('#xst').value='Walmart');await type('#xa','80');await type('#xd','2026-10-12');await click('#shOk');await W(1700);
// 3. apple import
await click('#hbApple');const [fc]=await Promise.all([p.waitForFileChooser(),p.click('#acf')]);await fc.accept(['/tmp/t/apple.csv']);await W(800);
console.log('review',await p.$eval('#sheet',e=>e.innerText.replace(/\s+/g,' ').slice(0,900)));
await p.evaluate(()=>{const i=[...document.querySelectorAll('#acL .card')].findIndex(c=>/Home Depot/.test(c.innerText));document.querySelector(`[data-acc="${i}"]`).value='biz'});
await p.screenshot({path:'/workspace/arpero-home/shots/32-applecard-import.png'});
await click('#shOk');await W(2200);console.log('summary',await p.$eval('#sheet',e=>e.innerText.replace(/\s+/g,' ').slice(0,500)));await p.screenshot({path:'/tmp/sum.png'});await click('#shX');
await p.reload({waitUntil:'networkidle0'});await W(1000);console.log('spend',JSON.stringify(await SP()));console.log('food after',await food());
console.log('groc row',await p.evaluate(()=>document.body.innerText.match(/Groceries[^\n]*\n?[^\n]*/g)?.slice(0,3)));
await p.evaluate(()=>[...document.querySelectorAll('.card')].find(e=>/Food this month/.test(e.innerText))?.scrollIntoView());await p.evaluate(()=>scrollBy(0,-260));await W(300);await p.screenshot({path:'/workspace/arpero-home/shots/31-groceries-budget.png'});
// re-import -> all already imported
await click('#hbApple');const [fc2]=await Promise.all([p.waitForFileChooser(),p.click('#acf')]);await fc2.accept(['/tmp/t/apple.csv']);await W(800);console.log('reimport checked',await p.$$eval('[data-aci]:checked',x=>x.length),await p.evaluate(()=>(document.body.innerText.match(/Already imported/g)||[]).length));
console.log('ccmap',JSON.stringify(await p.evaluate(()=>window.__D['families/arpero/meta']?.ccmap)));
await p.evaluate(()=>document.querySelector('#shX')?.click());await W(300);const type2=(s,v)=>p.$eval(s,(e,v)=>{e.value=v},v);
await p.evaluate(()=>[...document.querySelectorAll('nav button, nav a, [data-tab]')].find(x=>/Groceries/.test(x.innerText)).click());await W(600);
const ids=await p.$$eval('[data-item]',x=>x.map(e=>e.dataset.item));console.log('items',ids.length);
const id=await p.evaluate(()=>Object.values(window.__D['families/arpero/items']).find(i=>i.name==='Bananas').id);
const sp=()=>p.evaluate(id=>window.__D['families/arpero/spend']['it_'+id]?.amt??'none',id);
await p.$eval(`[data-item="${id}"]`,e=>e.click());await W(400);console.log('prefill',await p.$eval('#fpp',e=>e.value),await p.$eval('#fbo',e=>e.value));
await type2('#fpp','2.25');await p.$eval('#shOk',e=>e.click());await W(1700);console.log('after edit',await sp());
await p.$eval(`[data-item="${id}"]`,e=>e.click());await W(400);await type2('#fpp','');await p.$eval('#shOk',e=>e.click());await W(1700);console.log('after clear',await sp());
await p.$eval(`[data-item="${id}"]`,e=>e.click());await W(400);await type2('#fpp','3');await p.$eval('#shOk',e=>e.click());await W(1700);
await p.$eval(`[data-item="${id}"]`,e=>e.click());await W(400);await p.$eval('#idel',e=>e.click());await W(1000);await p.reload({waitUntil:'networkidle0'});await W(800);console.log('after delete',await sp());
await p.goto('http://127.0.0.1:8833/?go=budget',{waitUntil:'networkidle0'});await W(1000);await p.evaluate(()=>{const e=[...document.querySelectorAll('.card')].find(e=>/Food this month/.test(e.innerText));scrollTo(0,e.getBoundingClientRect().top+scrollY-330)});await W(400);await p.screenshot({path:'/workspace/arpero-home/shots/31-groceries-budget.png'});
console.log('ERR',errs);await b.close();
