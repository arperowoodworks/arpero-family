// Baby schedule alerts. Runs every ~10 min on GitHub Actions; sends each 🔔 item (families/arpero/bsched) to both parents' phones
// at (time - lead). Items due within the next 11 min are waited for in-job so alerts land on time; ones missed by a late run
// (up to 30 min) are still sent. Each item sends at most once per day (meta/babystate).
// Env: FIREBASE_SA, VAPID_PUBLIC, VAPID_PRIVATE. MOCK_FILE=data.json for tests. DRY=1 lists without sending. TEST=1 sends one test alert.
import webpush from 'web-push';import fs from 'node:fs';
const TZ='America/Chicago',BASE='families/arpero',log=(...a)=>console.log(...a);
const {VAPID_PUBLIC,VAPID_PRIVATE,FIREBASE_SA,MOCK_FILE,DRY,TEST,NOW}=process.env;
if(!VAPID_PUBLIC||!VAPID_PRIVATE){log('::warning::VAPID secrets missing');process.exit(0)}
webpush.setVapidDetails('mailto:arperowoodworks@users.noreply.github.com',VAPID_PUBLIC,VAPID_PRIVATE);
let store;
if(MOCK_FILE){const D=JSON.parse(fs.readFileSync(MOCK_FILE,'utf8'));const w=()=>fs.writeFileSync(MOCK_FILE,JSON.stringify(D,null,1));
 store={doc:async p=>D[p]??null,col:async c=>Object.entries(D).filter(([k])=>k.startsWith(c+'/')&&!k.slice(c.length+1).includes('/')).map(([k,v])=>({id:k.split('/').pop(),...v})),set:async(p,v)=>{D[p]={...(D[p]||{}),...v};w()},del:async p=>{delete D[p];w()}}}
else{if(!FIREBASE_SA){log('::warning::FIREBASE_SA missing');process.exit(0)}
 const {initializeApp,cert}=await import('firebase-admin/app');const {getFirestore}=await import('firebase-admin/firestore');initializeApp({credential:cert(JSON.parse(FIREBASE_SA))});const db=getFirestore();
 store={doc:async p=>{const s=await db.doc(p).get();return s.exists?s.data():null},col:async c=>(await db.collection(c).get()).docs.map(d=>({id:d.id,...d.data()})),set:(p,v)=>db.doc(p).set(v,{merge:true}),del:p=>db.doc(p).delete()}}
const nowMs=()=>NOW?+new Date(NOW)+(Date.now()-START):Date.now(),START=Date.now();
// Chicago wall time -> epoch ms for a given Chicago date + HH:MM
const chi=ms=>{const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(ms)).map(x=>[x.type,x.value]));return{day:`${p.year}-${p.month}-${p.day}`,hm:`${p.hour}:${p.minute}`}};
function at(day,hm){const guess=Date.parse(`${day}T${hm}:00Z`);for(const off of [5,6]){const t=guess+off*36e5;if(chi(t).day===day&&chi(t).hm===hm)return t}return guess+5*36e5}
const subs=(await store.col(`${BASE}/push`)).filter(s=>s.sub?.endpoint&&(s.who==='oscar'||s.who==='wife'));
async function sendAll(msg){if(DRY){log('DRY would send:',msg.title,'|',msg.body,'to',subs.length,'phone(s)');return true}let ok=false;
 for(const s of subs){try{await webpush.sendNotification(s.sub,JSON.stringify(msg),{TTL:1800,urgency:'high'});ok=true;log(`sent to ${s.who}: ${msg.title}`)}catch(e){log(`push error ${s.who}: ${e.statusCode||''} ${e.body||e.message}`);if(e.statusCode===404||e.statusCode===410)await store.del(`${BASE}/push/${s.id}`)}}return ok}
if(TEST){log('phones:',subs.map(s=>s.who).join(',')||'none');await sendAll({title:'🔔 Test: baby schedule alerts work',body:'You will get alerts like this for schedule items with the bell on.',go:'baby',tag:'bs-test'});process.exit(0)}
const items=(await store.col(`${BASE}/bsched`)).filter(x=>x.notify&&x.on!==false&&/^\d\d:\d\d$/.test(x.t||''));
const babies=await store.col(`${BASE}/babies`),bn=id=>id==='both'?(babies.length>1?babies.map(b=>b.name).join(' & '):babies[0]?.name||'Baby'):(babies.find(b=>b.id===id)||{}).name||'Baby';
const icon=w=>{const s=String(w||'').toLowerCase();return /feed|bottle|milk|nurs/.test(s)?'🍼':/nap/.test(s)?'😴':/bed|sleep/.test(s)?'🌙':/med|vitamin|tylenol|drop|dose/.test(s)?'💊':/wake/.test(s)?'☀️':/bath/.test(s)?'🛁':'⏰'};
const t12=t=>{const[h,m]=t.split(':').map(Number);return `${(h%12)||12}:${String(m).padStart(2,'0')} ${h<12?'AM':'PM'}`};
const state=(await store.doc(`${BASE}/meta/babystate`))||{},sent={...(state.sent||{})};
const now=nowMs(),due=[];
for(const off of [-1,0,1]){const day=chi(now+off*864e5).day,dw=new Date(day+'T12:00Z').getUTCDay();
 for(const x of items){if(x.days?.length&&!x.days.includes(dw))continue;const fire=at(day,x.t)-(+x.lead||0)*6e4,key=x.id+'@'+day;
  if(fire>=now-30*6e4&&fire<=now+11*6e4&&!sent[key])due.push({x,fire,key})}}
due.sort((a,b)=>a.fire-b.fire);log(`${chi(now).day} ${chi(now).hm} ${TZ}: ${items.length} alert item(s), ${due.length} due in window, ${subs.length} phone(s)`);
for(const d of due){const wait=d.fire-nowMs();if(wait>0&&!DRY){log(`waiting ${Math.round(wait/1000)}s for ${d.x.what}`);await new Promise(r=>setTimeout(r,wait))}
 const fresh=(await store.doc(`${BASE}/meta/babystate`))||{};if((fresh.sent||{})[d.key])continue;
 const lead=+d.x.lead||0,msg={title:`${icon(d.x.what)} ${bn(d.x.baby)}: ${d.x.what}`,body:lead?`In ${lead} minutes (${t12(d.x.t)})`:`Now · ${t12(d.x.t)}`,go:'baby',tag:'bs-'+d.x.id};
 if(await sendAll(msg)||!subs.length){sent[d.key]=chi(now).day;if(!DRY)await store.set(`${BASE}/meta/babystate`,{sent:{[d.key]:sent[d.key]}})}}
// prune old keys
const cut=chi(now-3*864e5).day,keep={};for(const[k,v]of Object.entries(sent))if(v>=cut)keep[k]=v;
if(!DRY)await store.set(`${BASE}/meta/babystate`,{sent:keep,ranAt:Date.now()});log('done');
