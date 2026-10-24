import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox']});
const p=await b.newPage();await p.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>m.type()==='error'&&errs.push(m.text()));
await p.goto('http://127.0.0.1:8811/',{waitUntil:'networkidle0'});await new Promise(r=>setTimeout(r,500));
const shot=async n=>{await new Promise(r=>setTimeout(r,300));await p.screenshot({path:`/workspace/arpero-home/shots/${n}.png`,fullPage:true})};
const click=async s=>{await p.$eval(s,e=>e.click())};const type=async(s,v)=>{await p.$eval(s,(e,v)=>{e.value=v},v)};
await shot('1-home');
// add todo
await click('[data-q="todo"]');await type('#ft','Hang garage shelf');await click('#shOk');
// add item + used
await p.evaluate(()=>document.querySelector('nav button[data-t=pantry]').click());
await click('#addBtn');await type('#fn','Whole Milk');await type('#fq','1');await type('#fm','1');await click('#shOk');
await shot('2-pantry');
await p.evaluate(()=>document.querySelector('[data-pseg=shop]').click());await shot('3-shop');
// fix it
await p.evaluate(()=>document.querySelector('nav button[data-t=fix]').click());await click('#addBtn');await type('#fno','Kitchen faucet dripping');await click('#shOk');await shot('4-fix');
await click('[data-fixed]');await click('#shOk');
// todo done
await p.evaluate(()=>document.querySelector('nav button[data-t=todos]').click());await click('[data-done]');await shot('5-todos');
// more
await p.evaluate(()=>document.querySelector('nav button[data-t=more]').click());await shot('6-more');
for(const s of ['budget','meals','chores','rewards','maint','dates','score','compare']){await p.evaluate(s=>{const e=document.querySelector(`[data-sub="${s}"]`)||document.querySelector('[data-sub=""]');e.click()},s);
 if(s==='maint')await click('#seedM');if(s==='meals'){await click('#newMeal');await type('#mn','Milk cereal');await type('#mi','milk, cereal');await click('#shOk')}
 if(s==='chores'){await click('#newChore');await type('#cn','Take out trash');await click('#shOk');await click('[data-chdone]')}
 if(s==='rewards'){await click('#newReward');await type('#rn','Pick the movie');await type('#rc','20');await click('#shOk')}
 if(s==='dates'){await click('#newIdea');await type('#in','Picnic');await click('#shOk');await click('#pickIdea')}
 await shot('7-'+s);await p.evaluate(()=>document.querySelector('nav button[data-t=more]').click())}
await p.evaluate(()=>document.querySelector('nav button[data-t=home]').click());await shot('8-home-after');
const fs=await p.$$eval('input,select,textarea',e=>e.map(x=>getComputedStyle(x).fontSize));
console.log('ERR',errs);console.log('fontsizes',[...new Set(fs)]);console.log('who',await p.$eval('#who',e=>e.textContent));
await b.close();
