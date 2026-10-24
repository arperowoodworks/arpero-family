// One-off bill changes. Backs up bills (encrypted artifact), applies ops from secret. Logs counts only (public repo).
import fs from 'fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SA)) });
const db = getFirestore(), col = db.collection('families/arpero/bills');
const cur = (await col.get()).docs.map(d => ({ id: d.id, ...d.data() }));
fs.writeFileSync('bills-backup.json', JSON.stringify({ at: new Date().toISOString(), bills: cur }));
const ops = JSON.parse(process.env.BILLS_SEED), r = { del: 0, add: 0, upd: 0, skip: 0 };
for (const o of ops) {
  const ex = cur.find(x => x.id === o.id);
  if (o.op === 'del') { if (ex) { await col.doc(o.id).delete(); r.del++ } else r.skip++; }
  else if (o.op === 'add') { if (ex || cur.find(x => (x.name || '').toLowerCase().includes(o.k))) { r.skip++; continue } await col.doc(o.id).set({ ...o.b, paid: {}, seeded: true }); r.add++; }
  else if (o.op === 'upd') { if (!ex) { r.skip++; continue } await col.doc(o.id).set(o.b, { merge: true }); r.upd++; }
}
fs.writeFileSync('result.json', JSON.stringify({ existing: cur.length, ...r }));
console.log(JSON.stringify(r));
