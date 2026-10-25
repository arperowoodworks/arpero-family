// One-off READ-ONLY: baby log counts/duplicates. No writes, logs counts and shapes only.
import { initializeApp, cert } from 'firebase-admin/app';import { getFirestore } from 'firebase-admin/firestore';
initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SA)) });
const db=getFirestore(),F='families/arpero/';
const babies=(await db.collection(F+'babies').get()).docs.map(d=>d.data());console.log('babies',babies.length,JSON.stringify(babies.map(b=>Object.keys(b).sort())));
const L=(await db.collection(F+'blog').get()).docs.map(d=>({id:d.id,...d.data()}));
const k={};L.forEach(x=>k[x.kind]=(k[x.kind]||0)+1);console.log('blog total',L.length,JSON.stringify(k));
const day=t=>new Date(t).toLocaleString('en-CA',{timeZone:'America/Chicago'}).slice(0,16);
L.filter(x=>x.kind==='feed').sort((a,b)=>b.at-a.at).slice(0,15).forEach(x=>console.log('feed',day(x.at),'baby#'+babies.findIndex(b=>b.id===x.baby),'food len',(x.food||'').length,'by',x.by,'saved',x.id.length));
const dup=L.filter((x,i)=>L.some((y,j)=>j<i&&y.kind===x.kind&&y.baby===x.baby&&(y.food||'')===(x.food||'')&&Math.abs((y.at||0)-(x.at||0))<5*60e3));console.log('possible dups',dup.length,JSON.stringify(dup.map(x=>[x.kind,day(x.at)])));
const it=(await db.collection(F+'items').get()).docs.map(d=>d.data()).filter(i=>i.baby);console.log('baby items',it.length);
const m=(await db.doc(F+'meta/settings').get()).data()||{};console.log('settings has babies?',!!m.babies);
