// One-off: back up existing household bills (encrypted) and add seed bills that aren't already there. Logs counts only (public repo).
import fs from 'fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SA)) });
const db = getFirestore(), col = db.collection('families/arpero/bills');
const cur = (await col.get()).docs.map(d => ({ id: d.id, ...d.data() }));
fs.writeFileSync('bills-backup.json', JSON.stringify({ at: new Date().toISOString(), bills: cur }));
const seed = JSON.parse(process.env.BILLS_SEED), added = [], skipped = [];
for (const { k, ...b } of seed) {
  const dup = cur.find(x => x.id === b.id || (x.name || '').toLowerCase().includes(k));
  if (dup) { skipped.push(b.id); continue; }
  await col.doc(b.id).set({ ...b, start: 1, paid: {}, seeded: true });   // set() on a NEW doc id only
  added.push(b.id);
}
fs.writeFileSync('result.json', JSON.stringify({ existing: cur.length, added, skipped }));
console.log(`existing=${cur.length} added=${added.length} skipped=${skipped.length}`);
