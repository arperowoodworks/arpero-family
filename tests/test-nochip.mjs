import puppeteer from 'puppeteer-core';const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});const p=await b.newPage();await p.setViewport({width:375,height:667});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://127.0.0.1:8833/?go=todos',{waitUntil:'networkidle0'});await new Promise(r=>setTimeout(r,800));
await new Promise(r=>setTimeout(r,1200));
console.log(await p.evaluate(()=>{[...document.querySelectorAll('nav button,nav a')].find(x=>/To-dos/.test(x.innerText)).click();return location.search+' '+document.querySelector('h1')?.innerText}));await new Promise(r=>setTimeout(r,1200));
await p.evaluate(()=>document.querySelector('#addBtn').click());await new Promise(r=>setTimeout(r,1200));console.log('sheet:',await p.$eval('#sheet',e=>e.innerText.slice(0,200).replace(/\n/g,' | ')),'chips',await p.$$eval('[data-tpl]',x=>x.length),'ERR',errs);await b.close();
