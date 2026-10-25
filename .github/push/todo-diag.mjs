// one-off READ-ONLY diag
const {initializeApp,cert}=await import('firebase-admin/app');const {getFirestore}=await import('firebase-admin/firestore');initializeApp({credential:cert(JSON.parse(process.env.FIREBASE_SA))});const db=getFirestore();
const f=db.collection('families').doc('arpero');
for(const c of ['todos','chores','maint']){const s=await f.collection(c).get();console.log(`== ${c}: ${s.size}`);s.forEach(d=>{const x=d.data();delete x.notes;console.log(d.id,JSON.stringify(x))})}
