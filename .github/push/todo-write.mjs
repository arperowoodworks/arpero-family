// One-off: back up todos (encrypted artifact), then add two repeating to-dos. Logs counts only.
import fs from 'fs';import { initializeApp, cert } from 'firebase-admin/app';import { getFirestore } from 'firebase-admin/firestore';
initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SA)) });
const db=getFirestore(),col=db.collection('families/arpero/todos');
const snap=await col.get();fs.writeFileSync('settings-backup.json',JSON.stringify(snap.docs.map(d=>({id:d.id,...d.data()}))));
console.log('backed up todos:',snap.size);
const add=[{id:'rep-dishes',title:'Dishes',rep:{k:'daily',from:'done'}},{id:'rep-laundry',title:'Laundry',rep:{k:'n',n:3,from:'done'}}];
for(const t of add){const ex=snap.docs.find(d=>d.id===t.id||(d.data().title===t.title&&d.data().rep));if(ex){console.log('exists, skipped:',t.title);continue}
 await col.doc(t.id).set({...t,who:'both',due:'2026-10-25',done:false,at:Date.now()});console.log('added:',t.title)}
console.log('todos now:',(await col.get()).size);
