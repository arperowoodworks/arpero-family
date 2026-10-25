import https from 'node:https';import crypto from 'node:crypto';import fs from 'node:fs';import {execFileSync,spawn} from 'node:child_process';
import webpush from '/workspace/arpero-home/.github/push/node_modules/web-push/src/index.js';
const got=[];const srv=https.createServer({key:fs.readFileSync('/tmp/k.pem'),cert:fs.readFileSync('/tmp/c.pem')},(q,r)=>{got.push({url:q.url,t:Date.now()});r.writeHead(201);r.end()}).listen(8899);
const ec=crypto.createECDH('prime256v1');ec.generateKeys();const sub={endpoint:'https://127.0.0.1:8899/oscar',keys:{p256dh:ec.getPublicKey('base64url'),auth:crypto.randomBytes(16).toString('base64url')}};
const V=webpush.generateVAPIDKeys(),B='families/arpero';
// NOW = Sun Oct 25 2026 08:52 Chicago (13:52Z)
const D={[B+'/push/p1']:{who:'oscar',sub},[B+'/push/p2']:{who:'wife',sub:{...sub,endpoint:'https://127.0.0.1:8899/wife'}},
 [B+'/babies/k']:{name:'Kataleya'},[B+'/babies/h']:{name:'Harper'},
 [B+'/bsched/a']:{baby:'k',what:'Feeding',t:'09:00',notify:true,lead:5,days:[]},      // fire 08:55 -> wait ~3s*? 
 [B+'/bsched/b']:{baby:'both',what:'Nap',t:'08:40',notify:true,lead:0,days:[]},        // 12 min late -> still sent
 [B+'/bsched/c']:{baby:'h',what:'Bath',t:'08:53',notify:false,lead:0,days:[]},         // bell off
 [B+'/bsched/d']:{baby:'h',what:'Vitamin D drops',t:'08:55',notify:true,lead:0,days:[1,2,3,4,5]}, // weekday only, Sunday -> skip
 [B+'/bsched/e']:{baby:'h',what:'Bedtime',t:'07:00',notify:true,lead:0,days:[]}};     // too old -> skip
fs.writeFileSync('/tmp/bsd.json',JSON.stringify(D));
const run=(extra={})=>new Promise(res=>{const p=spawn('node',['babysched.mjs'],{cwd:'/workspace/arpero-home/.github/push',env:{...process.env,MOCK_FILE:'/tmp/bsd.json',NODE_TLS_REJECT_UNAUTHORIZED:'0',VAPID_PUBLIC:V.publicKey,VAPID_PRIVATE:V.privateKey,NOW:'2026-10-25T13:54:55Z',...extra}});let o='';p.stdout.on('data',d=>o+=d);p.stderr.on('data',d=>o+=d);p.on('close',()=>res(o))});
const t0=Date.now();console.log(await run());console.log('received',got.map(g=>g.url+' +'+Math.round((g.t-t0)/1000)+'s'));
got.length=0;console.log('second run (dedupe):',(await run()).trim().split('\n').slice(-2).join(' / '),'received',got.length);
console.log('state',JSON.stringify(JSON.parse(fs.readFileSync('/tmp/bsd.json'))[B+'/meta/babystate']));
got.length=0;console.log((await run({TEST:'1'})).trim(),'received',got.length);srv.close();
