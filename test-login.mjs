import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox']});
const p=await b.newPage();await p.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true});
const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept('kerissa.arpero@outlook.com'));
const w=ms=>new Promise(r=>setTimeout(r,ms)),shot=n=>p.screenshot({path:`/workspace/arpero-home/shots/${n}.png`});
const B='http://127.0.0.1:8812/';
await p.goto(B,{waitUntil:'networkidle0'});await w(300);await shot('L1-signin');
await p.click('#ebtn');await p.type('#lem','Kerissa.arpero@outlook.com');await p.click('#lsend');await w(200);await shot('L2-sent');
console.log('ls',await p.evaluate(()=>localStorage.emailForSignIn),await p.evaluate(()=>JSON.stringify(window.__calls)));
await p.$eval('#lpwmode',e=>e.click());await shot('L3-pw');await p.$eval('#lforgot',e=>e.click());await w(100);
await p.type('#lpw','secret1');await p.click('#lpin');await w(500);console.log('who',await p.$eval('#who',e=>e.textContent),await p.evaluate(()=>JSON.stringify(window.__calls)));
// link return without stored email
const p2=await b.newPage();p2.on('pageerror',e=>errs.push(e.message));p2.on('dialog',d=>d.accept('kerissa.arpero@outlook.com'));await p2.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true});
await p2.goto(B,{waitUntil:'networkidle0'});await p2.evaluate(()=>localStorage.clear());
await p2.goto(B+'?mode=signIn&oobCode=x',{waitUntil:'networkidle0'});await w(800);await p2.screenshot({path:'/workspace/arpero-home/shots/L4-linked.png'});
console.log('url',p2.url(),'who',await p2.$eval('#who',e=>e.textContent),await p2.$eval('#sheet',e=>e.innerText.slice(0,60)));
const fs=await p.$$eval('#login input',e=>e.map(x=>getComputedStyle(x).fontSize));console.log('fs',fs,'ERR',errs);await b.close();
