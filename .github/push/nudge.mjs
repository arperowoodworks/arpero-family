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
    ids: async c => [...new Set(Object.keys(D).filter(k => k.startsWith(c + '/')).map(k => k.split('/')[1]))],
    email: async uid => (D._users || {})[uid] || '',
    delField: async (p, f, id) => { const o = D[p]?.[f]; if (o) delete o[id]; fs.writeFileSync(MOCK_FILE, JSON.stringify(D, null, 1)); },
  };
} else {
  if (!FIREBASE_SA) { log('::warning::FIREBASE_SA secret missing (add the service-account JSON as a repo secret). Nothing sent.'); process.exit(0); }
  const { initializeApp, cert } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');
  initializeApp({ credential: cert(JSON.parse(FIREBASE_SA)) });
  const { getAuth } = await import('firebase-admin/auth');
  const { FieldValue } = await import('firebase-admin/firestore');
  const db = getFirestore();
  store = {
    doc: async p => { const s = await db.doc(p).get(); return s.exists ? s.data() : null; },
    col: async (c, fields) => { let q = db.collection(c); if (fields) q = q.select(...fields); return (await q.get()).docs.map(d => ({ id: d.id, ...d.data() })); },
    set: (p, v) => db.doc(p).set(v, { merge: true }),
    del: p => db.doc(p).delete(),
    ids: async c => (await db.collection(c).listDocuments()).map(d => d.id),
    email: async uid => { try { return (await getAuth().getUser(uid)).email || ''; } catch { return ''; } },
    delField: (p, f, id) => db.doc(p).update({ [`${f}.${id}`]: FieldValue.delete() }),
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

async function push(who, msg, own = false) {
  if (!own && !isOn(who)) { log(`skip ${who} (nudges off)`); return false; }
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
  if (pulse.soon?.length) return { title: '⏰ Use soon', body: pulse.soon.join(', ') + ' — use or freeze today' };
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

// ---- dinner reminder: its own optional notification (settings.dinnerN[k] = {on, time}), max once a day ----
const dsent = { ...(state.dsent || {}) }, bsent = { ...(state.bsent || {}) }, vsent = { ...(state.vsent || {}) };
for (const k of ['oscar', 'wife']) {
  const d = settings.dinnerN?.[k];
  if (!d?.on || hm < (d.time || '16:00') || dsent[k] === day) continue;
  const planned = pulse.dinnerDay === day && pulse.dinner;
  if (await push(k, planned ? { title: '🍽️ Tonight: ' + pulse.dinner, body: 'Tap to see the recipe and what you need.', go: 'week', tag: 'dinner' }
    : { title: "🍽️ What's for dinner?", body: 'Tap for 3 ideas from what you already have.', go: 'dinner', tag: 'dinner' }, true)) dsent[k] = day;
}
// ---- baby feeding / nap reminders: own toggles (settings.babyN[k] = {feed, h, nap, awake}), off by default ----
if (hm >= '07:00' && hm <= '21:30') for (const k of ['oscar', 'wife']) {
  const r = settings.babyN?.[k];
  if (!r) continue;
  bsent[k] = { ...(bsent[k] || {}) };
  for (const b of pulse.babies || []) {
    const hrs = t => Math.round((Date.now() - t) / 36e5 * 2) / 2;
    if (r.feed && b.feed && !b.asleep && Date.now() - b.feed >= (r.h || 3) * 36e5 && bsent[k][b.id + ':f'] !== b.feed) {
      if (await push(k, { title: `🍼 ${b.name}`, body: `About ${hrs(b.feed)} hours since the last feeding.`, go: 'baby', tag: 'baby-feed-' + b.id }, true)) bsent[k][b.id + ':f'] = b.feed;
    }
    if (r.nap && b.sleep && !b.asleep && Date.now() - b.sleep >= (r.awake || 2.5) * 36e5 && bsent[k][b.id + ':n'] !== b.sleep) {
      if (await push(k, { title: `😴 ${b.name}`, body: `Awake about ${hrs(b.sleep)} hours. Nap time soon?`, go: 'baby', tag: 'baby-nap-' + b.id }, true)) bsent[k][b.id + ':n'] = b.sleep;
    }
  }
}
// ---- baby doctor visits / vaccines with remind:true: evening before (18:00+) and morning of (07:00+), both parents ----
{
  const tmr = (() => { const x = new Date(day + 'T12:00'); x.setDate(x.getDate() + 1); return x.toLocaleDateString('en-CA'); })();
  const evs = (await store.col(`${BASE}/events`, ['title', 'kind', 's', 'remind', 'allDay'])).filter(e => e.kind === 'baby' && e.remind);
  for (const e of evs) {
    const d = String(e.s || '').slice(0, 10), t = String(e.s || '').slice(11, 16);
    const tl = t ? new Date('2000-01-01T' + t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '';
    let key = '', msg = null;
    if (d === tmr && hm >= '18:00') { key = e.id + ':eve'; msg = { title: '🩺 Tomorrow' + (tl ? ' ' + tl : ''), body: e.title }; }
    else if (d === day && hm >= '07:00' && (!t || hm < t)) { key = e.id + ':morn'; msg = { title: '🩺 Today' + (tl ? ' ' + tl : ''), body: e.title }; }
    if (!msg || vsent[key]) continue;
    let any = false;
    for (const k of ['oscar', 'wife']) any = (await push(k, { ...msg, go: 'baby', tag: 'visit-' + e.id }, true)) || any;
    vsent[key] = day;
  }
  for (const k of Object.keys(vsent)) if (vsent[k] < addD0(day, -30)) delete vsent[k];
}
function addD0(d, n) { const x = new Date(d + 'T12:00'); x.setDate(x.getDate() + n); return x.toLocaleDateString('en-CA'); }

// ---- bill reminders (settings.hb.billN[k] !== false): unpaid, non-autopay; 3 days before and on the due day, 08:00+ ----
const bnsent = { ...(state.bnsent || {}) };
if (settings.hb?.setup && hm >= '08:00') {
  const ym = day.slice(0, 7), [yy, mo] = ym.split('-').map(Number), dim = new Date(yy, mo, 0).getDate(), in3 = addD0(day, 3);
  const bills = await store.col(`${BASE}/bills`);
  for (const b of bills) {
    if (b.auto) continue;
    for (const m of [ym, in3.slice(0, 7)]) {
      const mm = +m.slice(5, 7);
      if (b.freq === 'quarterly' && ((mm - (+b.start || 1)) % 3 + 3) % 3) continue;
      if (b.freq === 'yearly' && mm !== (+b.start || 1)) continue;
      const [y2, m2] = m.split('-').map(Number), date = m + '-' + String(Math.min(+b.due || 1, new Date(y2, m2, 0).getDate())).padStart(2, '0');
      if ((b.paid || {})[m]) continue;
      const which = date === day ? 'day' : date === in3 ? 'pre' : '';
      const key = `${b.id}:${m}:${which}`;
      if (!which || bnsent[key]) continue;
      const amt = '$' + (+b.amt || 0).toLocaleString('en-US');
      const msg = which === 'day' ? { title: `💵 ${b.name} is due today`, body: `${amt} · tap to mark it paid.` } : { title: `💵 ${b.name} due in 3 days`, body: `${amt} on ${new Date(date + 'T12:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}.` };
      for (const k of ['oscar', 'wife']) if ((settings.hb.billN || {})[k] !== false) await push(k, { ...msg, go: 'budget', tag: 'bill-' + b.id }, true);
      bnsent[key] = day;
    }
  }
  for (const k of Object.keys(bnsent)) if (bnsent[k] < addD0(day, -40)) delete bnsent[k];
}
// ---- personal budget (settings.pb[k] = {on, amt, n:{p75,p100,weekly}}): 75% / 100% once a month, weekly note Sundays 18:00+ ----
const psent = { ...(state.psent || {}) };
{
  const ym = day.slice(0, 7);
  let spend = null;
  for (const k of ['oscar', 'wife']) {
    const raw = settings.pb?.[k] || {}, on = raw.on ?? true, amt = +raw.amt || 0, n = { p75: true, p100: true, weekly: true, ...(raw.n || {}) };
    if (!on || !amt) continue;
    spend = spend || await store.col(`${BASE}/spend`, ['who', 'amt', 'ym', 'biz']);
    const spent = spend.filter(x => x.who === k && x.ym === ym && !x.biz).reduce((a, x) => a + (+x.amt || 0), 0);
    const pct = spent / amt * 100, left = amt - spent, $ = v => '$' + Math.round(v).toLocaleString('en-US');
    const ps = psent[k] = psent[k]?.ym === ym ? { ...psent[k] } : { ym, wk: psent[k]?.wk };
    if (hm >= '08:00' && hm <= '21:30') {
      if (pct >= 100 && n.p100 && !ps.p100) { if (await push(k, { title: '💳 Budget reached', body: `You've used this month's ${$(amt)}. The wait list is a good friend till the 1st.`, go: 'spend', tag: 'pb' }, true)) ps.p100 = ps.p75 = 1; }
      else if (pct >= 75 && pct < 100 && n.p75 && !ps.p75) { if (await push(k, { title: '💳 75% of your budget', body: `${$(left)} left this month. You're doing fine, just a heads-up.`, go: 'spend', tag: 'pb' }, true)) ps.p75 = 1; }
    }
    if (n.weekly && dow === 0 && hm >= '18:00' && ps.wk !== day) {
      const [y, m, d] = day.split('-').map(Number), dl = new Date(y, m, 0).getDate() - d + 1, wk = Math.max(0, left) * Math.min(7, dl) / dl;
      if (await push(k, { title: '💳 This week', body: `You have about ${$(wk)} to spend this week (${$(Math.max(0, left))} left this month).`, go: 'spend', tag: 'pb-week' }, true)) ps.wk = day;
    }
  }
}

// ================= Arpero Shop (Oscar only) =================
// Data: shops/{uid}/data/state {state: JSON}, shops/{uid}/data/notify {on, time, subs:{id:{sub}}}, shops/{uid}/data/pushstate (sender-owned)
const OSCAR = 'oskararpero@gmail.com';
const addD = (d, n) => { const x = new Date(d + 'T12:00'); x.setDate(x.getDate() + n); return x.toLocaleDateString('en-CA'); };
const tomorrow = addD(day, 1);
const fmtD = d => new Date(d + 'T12:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
async function shopPush(uid, subsMap, msg) {
  let ok = false;
  for (const [id, v] of Object.entries(subsMap || {})) {
    if (!v?.sub?.endpoint) continue;
    try { await webpush.sendNotification(v.sub, JSON.stringify(msg), { TTL: 6 * 3600 }); ok = true; sentCount++; log(`shop sent [${id}]: ${msg.title} — ${msg.body}`); }
    catch (e) { log(`shop push error [${id}]: ${e.statusCode || ''} ${e.body || e.message}`); if (e.statusCode === 404 || e.statusCode === 410) await store.delField(`shops/${uid}/data/notify`, 'subs', id); }
  }
  return ok;
}
let famEvents = null;
for (const uid of await store.ids('shops')) {
  const nt = await store.doc(`shops/${uid}/data/notify`);
  if (!nt || nt.on === false || !Object.keys(nt.subs || {}).length) continue;
  if ((await store.email(uid)).toLowerCase() !== OSCAR) { log(`shop ${uid}: not Oscar, skipped`); continue; }
  if (hm < (nt.time || '07:30')) continue;
  const st = await store.doc(`shops/${uid}/data/state`);
  let S = {}; try { S = typeof st?.state === 'string' ? JSON.parse(st.state) : (st?.state || st || {}); } catch { }
  const ps = (await store.doc(`shops/${uid}/data/pushstate`)) || {};
  const alerted = Object.fromEntries(Object.entries(ps.alerted || {}).filter(([, d]) => d === day));
  const open = (S.projects || []).filter(p => !p.done && p.due);
  // 1) morning summary (max one a day): projects due today + shop calendar events today
  if (ps.summary !== day) {
    famEvents ??= await store.col('families/arpero/events', ['title', 'src', 'kind', 's', 'auto']);
    const ev = famEvents.filter(e => (e.src === 'shop' || e.kind === 'shop') && !e.auto && String(e.s || '').slice(0, 10) === day);
    const items = [...open.filter(p => p.due === day).map(p => p.name), ...ev.map(e => (String(e.s).length > 10 ? String(e.s).slice(11, 16) + ' ' : '') + e.title)];
    if (items.length && await shopPush(uid, nt.subs, { title: `🪵 Shop today: ${items.length} item${items.length > 1 ? 's' : ''}`, body: items.slice(0, 4).join(' · ') + (items.length > 4 ? ` +${items.length - 4} more` : ''), go: 'cal', tag: 'shop-summary' })) ps.summary = day;
    else if (!items.length) ps.summary = day; // nothing today: don't keep checking
  }
  // 2) per-project alerts, at most once per project per day
  const due = open.filter(p => p.due <= tomorrow && alerted[p.id] !== day).sort((a, b) => a.due.localeCompare(b.due)).slice(0, 5);
  for (const p of due) {
    const od = p.due < day, n = od ? Math.round((new Date(day) - new Date(p.due)) / 864e5) : 0;
    const msg = od ? { title: `⏰ Overdue: ${p.name}`, body: `Was due ${fmtD(p.due)} (${n} day${n > 1 ? 's' : ''} ago) · ${p.pct || 0}% done` }
      : p.due === day ? { title: `📌 Due today: ${p.name}`, body: `${p.customer ? p.customer + ' · ' : ''}${p.pct || 0}% done` }
        : { title: `📅 Due tomorrow: ${p.name}`, body: `${p.customer ? p.customer + ' · ' : ''}${p.pct || 0}% done` };
    if (await shopPush(uid, nt.subs, { ...msg, go: 'p:' + p.id, tag: 'proj-' + p.id })) alerted[p.id] = day;
  }
  await store.set(`shops/${uid}/data/pushstate`, { summary: ps.summary || '', alerted, ranAt: Date.now() });
}

await store.set(`${BASE}/meta/pushstate`, { fixAt: newFixAt, shoutAt: newShoutAt, sent, dsent, bsent, vsent, psent, bnsent, ranAt: Date.now() });
log(`done ${day} ${hm} ${TZ}: ${sentCount} sent, ${subs.length} phones${first ? ' (first run: old Fix Its/thanks skipped)' : ''}`);
