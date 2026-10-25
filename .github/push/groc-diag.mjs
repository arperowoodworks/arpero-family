// One-off READ-ONLY: grocery items with prices and grocery spend. No writes.
import { initializeApp, cert } from 'firebase-admin/app';import { getFirestore } from 'firebase-admin/firestore';
initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SA)) });
const db=getFirestore(),F='families/arpero/',g=async n=>(await db.collection(F+n).get()).docs.map(d=>({id:d.id,...d.data()}));
const ct=t=>t?new Date(t).toLocaleString('en-US',{timeZone:'America/Chicago'}):'';
const I=await g('items'),L=await g('logs'),SP=await g('spend');
console.log('items',I.length,'priced',I.filter(i=>i.ucost).length);
I.forEach(i=>{const lg=L.filter(l=>l.item===i.id);console.log('ITEM',JSON.stringify({name:i.name,qty:i.qty,unit:i.unit,ucost:i.ucost,store:i.store||'',exp:i.exp||'',added:ct(i.at||i.added),keys:Object.keys(i).sort().join(','),logs:lg.map(l=>[l.type,l.qty,l.price||0,ct(l.at),l.rcpt?'rcpt':''])}))});
const bl=L.filter(l=>l.type==='bought');console.log('bought logs',bl.length,JSON.stringify(bl.map(l=>[I.find(i=>i.id===l.item)?.name||'?',l.price||0,ct(l.at),!!l.rcpt])));
console.log('spend',SP.length,JSON.stringify(SP.filter(x=>x.kind==='hh').map(x=>[x.cat,x.amt,x.ym,(x.note||'').slice(0,40),ct(x.at)])));
const s=(await db.doc(F+'meta/settings').get()).data()||{};console.log('limits',JSON.stringify(s.hb?.limits||{}));
