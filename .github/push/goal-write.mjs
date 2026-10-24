// One-off: back up meta/settings (encrypted artifact), then set Oscar's goals (dedupe DJI, add terms) and add one shared goal. Logs counts only.
import fs from 'fs';import { initializeApp, cert } from 'firebase-admin/app';import { getFirestore } from 'firebase-admin/firestore';
initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SA)) });
const db=getFirestore(),ref=db.doc('families/arpero/meta/settings');
await db.runTransaction(async t=>{const d=(await t.get(ref)).data()||{};fs.writeFileSync('settings-backup.json',JSON.stringify({at:new Date().toISOString(),settings:d}));
 const G=d.pg?.oscar?.goals||[];const dji=G.filter(g=>/osmo action 6/i.test(g.name));const keep=G.filter(g=>!/osmo action 6/i.test(g.name)).map(g=>({term:'short',...g}));
 keep.push({...(dji[0]||{id:'dji_oa6'}),name:'DJI Osmo Action 6',target:436,saved:Math.max(0,...dji.map(g=>+g.saved||0)),date:'',term:'short'});
 const both=(d.pg?.both?.goals||[]).filter(g=>!/kitchen thermometer/i.test(g.name));both.push({id:'kthermo',name:'Kitchen thermometer',target:16.99,saved:0,date:'',term:'short'});
 t.update(ref,{'pg.oscar.goals':keep,'pg.both.goals':both});console.log('oscar goals',G.length,'->',keep.length,'dji dupes',dji.length,'both',both.length)});
