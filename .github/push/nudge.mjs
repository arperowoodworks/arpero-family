// Arpero Family reminder sender. Runs on GitHub Actions every ~15 min.
// Secrets (GitHub encrypted repo secrets only): FIREBASE_SA (service-account JSON), VAPID_PUBLIC, VAPID_PRIVATE.
// Test mode: MOCK_FILE=data.json uses a local JSON file instead of Firestore.
import webpush from 'web-push';
import fs from 'node:fs';
const TZ = 'America/Chicago', BASE = 'families/arpero';
const now = new Date();
const day = now.toLocaleDateString('en-CA', { timeZone: TZ });
const hm = now.toLocaleTimeString('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false });
const dow = new Date(day + 'T12:00').getDay();
const log = (...a) => console.log(...a);

const { VAPID_PUBLIC, VAPID_PRIVATE, FIREBASE_SA, MOCK_FILE } = process.env;
if (!VAPID_PUBLIC || !VAPID_PRIVATE) { log('::warning::VAPID secrets missing, nothing sent'); process.exit(0); }
webpush.setVapidDetails('mailto:arperowoodworks@users.noreply.github.com', VAPID_PUBLIC, VAPID_PRIVATE);

// ---- data layer ----
let store;
if (MOCK_FILE) {
  const D = JSON.parse(fs.readFileSync(MOCK_FILE, 'utf8'));
  store = {
    doc: async p => D[p] ?? null,
    col: async c => Object.entries(D).filter(([k]) => k.startsWith(c + '/') && !k.slice(c.length + 1).includes('/')).map(([k, v]) => ({ id: k.split('/').pop(), ...v })),
    set: async (p, v) => { D[p] = { ...(D[p] || {}), ...v }; fs.writeFileSync(MOCK_FILE, JSON.stringify(D, null, 1)); },
    del: async p => { delete D[p]; fs.writeFileSync(MOCK_FILE, JSON.stringify(D, null, 1)); },
  };
} else {
  if (!FIREBASE_SA) { log('::warning::FIREBASE_SA secret missing (add the service-account JSON as a repo secret). Nothing sent.'); process.exit(0); }
  const { initializeApp, cert } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');
  initializeApp({ credential: cert(JSON.parse(FIREBASE_SA)) });
  const db = getFirestore();
  store = {
    doc: async p => { const s = await db.doc(p).get(); return s.exists ? s.data() : null; },
    col: async (c, fields) => { let q = db.collection(c); if (fields) q = q.select(...fields); return (await q.get()).docs.map(d => ({ id: d.id, ...d.data() })); },
    set: (p, v) => db.doc(p).set(v, { merge: true }),
    del: p => db.doc(p).delete(),
  };
}

const settings = (await store.doc(`${BASE}/meta/settings`)) || {};
const pulse = (await store.doc(`${BASE}/meta/pulse`)) || {};
const state = (await store.doc(`${BASE}/meta/pushstate`)) || {};
const subs = await store.col(`${BASE}/push`);
const names = { oscar: 'Oscar', wife: 'Kerissa', ...(settings.names || {}) };
const nm = k => names[k] || k;
const partner = k => (k === 'oscar' ? 'wife' : 'oscar');
const isOn = k => (settings.nudge?.[k]?.on) !== false;
const sent = { ...(state.sent || {}) };
let sentCount = 0;

async function push(who, msg) {
  if (!isOn(who)) { log(`skip ${who} (nudges off)`); return false; }
  const mine = subs.filter(s => s.who === who && s.sub?.endpoint);
  if (!mine.length) { log(`skip ${who} (no phone subscribed)`); return false; }
  let ok = false;
  for (const s of mine) {
    try { await webpush.sendNotification(s.sub, JSON.stringify(msg), { TTL: 6 * 3600, urgency: 'normal' }); ok = true; sentCount++; log(`sent to ${who} [${s.id}]: ${msg.body}`); }
    catch (e) {
      log(`push error ${who} [${s.id}]: ${e.statusCode || ''} ${e.body || e.message}`);
      if (e.statusCode === 404 || e.statusCode === 410) await store.del(`${BASE}/push/${s.id}`);
    }
  }
  return ok;
}

// ---- instant: new Fix Its and shout-outs (since last run) ----
const first = !state.fixAt;
const fixAt = state.fixAt || Date.now(), shoutAt = state.shoutAt || Date.now();
let newFixAt = fixAt, newShoutAt = shoutAt;
const fixes = await store.col(`${BASE}/fixes`, ['note', 'by', 'at', 'status', 'pri']);
for (const f of fixes.filter(f => (f.at || 0) > fixAt).sort((a, b) => a.at - b.at)) {
  newFixAt = Math.max(newFixAt, f.at);
  if (f.status === 'fixed') continue;
  const to = f.by === 'oscar' ? null : 'oscar';
  if (to) await push(to, { title: '🔧 New Fix It' + (f.pri === 'high' ? ' (urgent)' : ''), body: `${nm(f.by)}: ${f.note || 'take a look'}`, go: 'fix', tag: 'fix-' + f.id });
}
const shouts = await store.col(`${BASE}/shouts`);
for (const s of shouts.filter(s => (s.at || 0) > shoutAt).sort((a, b) => a.at - b.at)) {
  newShoutAt = Math.max(newShoutAt, s.at);
  if (!s.to || s.seen) continue;
  await push(s.to, { title: '💛 A thank-you', body: `${nm(s.from)} says thanks for ${String(s.text || 'helping').replace(/^(finished|fixed|did|cooked) /, '')}!`, go: 'home', tag: 'thx-' + s.id });
}

// ---- daily nudge: max one per person per Chicago day, at/after their chosen time ----
function nudgeFor(k) {
  const left = (pulse.goal || 300) - (pulse.wk || 0);
  const mineChores = (pulse.chores || []).filter(c => c.turn === k);
  const teamChores = (pulse.chores || []).length;
  if (pulse.streak > 0 && pulse.lastActDay && pulse.lastActDay < day && hm >= '16:00')
    return { title: `🔥 ${pulse.streak}-day team streak`, body: 'One small thing today keeps it going. You two got this!' };
  if (left > 0 && dow >= 4 && dow <= 6 || left > 0 && dow === 0)
    return { title: `⭐ ${left} pts to the team goal`, body: teamChores ? `${teamChores} chore${teamChores > 1 ? 's' : ''} would get you closer.` : 'Every little bit counts!' };
  if (pulse.low?.length) return { title: '🛒 Running low', body: pulse.low.join(', ') };
  if (mineChores.length) return { title: '🧹 Ready when you are', body: mineChores.map(c => c.name).join(', ') };
  if (pulse.streak > 0 && pulse.lastActDay < day) return { title: `🔥 ${pulse.streak}-day team streak`, body: 'One small thing today keeps it going.' };
  return null;
}
for (const k of ['oscar', 'wife']) {
  const t = settings.nudge?.[k]?.time || '08:00';
  if (!isOn(k) || hm < t || sent[k] === day) continue;
  const msg = nudgeFor(k);
  if (!msg) continue;
  if (await push(k, { ...msg, go: 'home', tag: 'nudge' })) sent[k] = day;
}

await store.set(`${BASE}/meta/pushstate`, { fixAt: newFixAt, shoutAt: newShoutAt, sent, ranAt: Date.now() });
log(`done ${day} ${hm} ${TZ}: ${sentCount} sent, ${subs.length} phones${first ? ' (first run: old Fix Its/thanks skipped)' : ''}`);
