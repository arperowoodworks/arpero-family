// One-off, read-only: back up meta/settings (encrypted artifact) and log its shape (no values; public repo).
import fs from 'fs';import { initializeApp, cert } from 'firebase-admin/app';import { getFirestore } from 'firebase-admin/firestore';
initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SA)) });
const db=getFirestore(),s=await db.doc('families/arpero/meta/settings').get(),d=s.data()||{};
fs.writeFileSync('settings-backup.json',JSON.stringify({at:new Date().toISOString(),settings:d}));
const shape=(v,dep=0)=>v===null?'null':Array.isArray(v)?`arr[${v.length}]`+(v[0]&&dep<3?shape(v[0],dep+1):''):typeof v==='object'?(dep>3?'{..}':'{'+Object.keys(v).filter(k=>!/^\d{4}-/.test(k)).map(k=>k+':'+shape(v[k],dep+1)).join(',')+'}'):typeof v;
console.log('bytes',JSON.stringify(d).length);console.log('hb',shape(d.hb));console.log('pg',shape(d.pg));console.log('top',Object.keys(d).join(','));
