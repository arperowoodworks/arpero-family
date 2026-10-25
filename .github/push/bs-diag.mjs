// One-off READ-ONLY: baby routines + push subscription counts. No writes.
import { initializeApp, cert } from 'firebase-admin/app';import { getFirestore } from 'firebase-admin/firestore';
initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SA)) });
const db=getFirestore(),F='families/arpero/';
const DEF='07:00 Wake up\n08:00 Breakfast\n09:30 Nap\n12:00 Lunch\n13:30 Nap\n15:30 Snack\n17:30 Dinner\n18:30 Bath\n19:30 Bedtime';
for(const d of (await db.collection(F+'babies').get()).docs){const b=d.data();console.log('BABY',b.name,'routine is default?',b.routine===DEF);console.log('ROUTINE',JSON.stringify(b.routine||''))}
const P=(await db.collection(F+'push').get()).docs.map(d=>d.data());console.log('push subs',JSON.stringify(P.reduce((a,s)=>(a[s.who]=(a[s.who]||0)+1,a),{})));
const s=(await db.doc(F+'meta/settings').get()).data()||{};console.log('babyN',JSON.stringify(s.babyN||{}),'nudge',JSON.stringify(s.nudge||{}));
const ev=(await db.collection(F+'events').get()).docs.map(d=>d.data()).filter(e=>e.kind==='baby');console.log('baby events',ev.length);
const ps=(await db.doc(F+'meta/pushstate').get()).data()||{};console.log('last run',new Date(ps.ranAt).toLocaleString('en-US',{timeZone:'America/Chicago'}));
const bs=await db.collection(F+'bsched').get();console.log('bsched',bs.size);
