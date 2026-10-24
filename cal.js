// @ts-nocheck
// Shared calendar module for Arpero Family + Arpero Shop. Data: families/arpero/{events,chores,maint,dates}, meta/work, private/ics
const pad=n=>String(n).padStart(2,'0'),ymd=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`,hm=d=>`${pad(d.getHours())}:${pad(d.getMinutes())}`;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');
const addD=(s,n)=>{const d=new Date(s+'T12:00');d.setDate(d.getDate()+n);return ymd(d)};
export function parseICS(txt,days=75){const un=txt.replace(/\r?\n[ \t]/g,''),out=[],now=new Date(),lim=new Date(+now+days*864e5),from=new Date(+now-2*864e5);
 const dt=(v,p)=>{if(!v)return null;if(/^\d{8}$/.test(v))return new Date(+v.slice(0,4),+v.slice(4,6)-1,+v.slice(6,8));const m=v.match(/(\d{4})(\d\d)(\d\d)T(\d\d)(\d\d)(\d\d)?(Z?)/);if(!m)return null;
  return m[7]?new Date(Date.UTC(+m[1],+m[2]-1,+m[3],+m[4],+m[5])):new Date(+m[1],+m[2]-1,+m[3],+m[4],+m[5])};
 for(const blk of un.split('BEGIN:VEVENT').slice(1)){const b=blk.split('END:VEVENT')[0],get=k=>{const m=b.match(new RegExp('^'+k+'([;:][^\\n]*)$','m'));if(!m)return null;const i=m[1].lastIndexOf(':');return{p:m[1].slice(0,i),v:m[1].slice(i+1).trim()}};
  if(/^STATUS:CANCELLED/m.test(b)||/^TRANSP:TRANSPARENT/m.test(b))continue;const s0=get('DTSTART'),e0=get('DTEND');const s=dt(s0?.v),e=dt(e0?.v)||(s&&new Date(+s+36e5));if(!s)continue;
  const allDay=/^\d{8}$/.test(s0.v),dur=e-s,ex=new Set();(b.match(/^EXDATE[^:]*:(.*)$/gm)||[]).forEach(l=>l.split(':').pop().split(',').forEach(v=>{const d=dt(v.trim());d&&ex.add(+d)}));
  const push=st=>{if(ex.has(+st))return;const en=new Date(+st+dur);if(en>=from&&st<=lim)out.push({s:allDay?ymd(st):ymd(st)+'T'+hm(st),e:allDay?ymd(new Date(+en-1)):ymd(en)+'T'+hm(en),allDay})};
  const rr=get('RRULE');if(!rr){push(s);continue}
  const R=Object.fromEntries(rr.v.split(';').map(x=>x.split('='))),iv=+R.INTERVAL||1,until=R.UNTIL?dt(R.UNTIL):lim,cnt=+R.COUNT||1e4,DAYS=['SU','MO','TU','WE','TH','FR','SA'];
  let n=0;const end=until<lim?until:lim;
  if(R.FREQ==='WEEKLY'){const by=R.BYDAY?R.BYDAY.split(',').map(x=>DAYS.indexOf(x.slice(-2))):[s.getDay()];const ws=new Date(s);ws.setDate(ws.getDate()-ws.getDay());
   for(let w=new Date(ws);w<=end&&n<cnt;w.setDate(w.getDate()+7*iv))for(const d of by.sort()){const st=new Date(w);st.setDate(w.getDate()+d);st.setHours(s.getHours(),s.getMinutes(),0,0);if(st<s||st>end||n>=cnt)continue;n++;push(st)}}
  else if(R.FREQ==='DAILY'){for(let st=new Date(s);st<=end&&n<cnt;st.setDate(st.getDate()+iv)){n++;push(new Date(st))}}
  else if(R.FREQ==='MONTHLY'){for(let st=new Date(s);st<=end&&n<cnt;st.setMonth(st.getMonth()+iv)){n++;push(new Date(st))}}
  else push(s)}
 return out.sort((a,b)=>a.s>b.s?1:-1)}
export function initCal({db,F,me,el,app,names={oscar:'Oscar',wife:'Kerissa'},onChange}){
 const C=n=>F.collection(db,'families','arpero',n),D=(n,id)=>F.doc(db,'families','arpero',n,id),S={events:[],chores:[],maint:[],dates:[],work:{blocks:[]},ics:{},view:'agenda',sheet:null};
 const nm=k=>names[k]||k,uid=()=>Math.random().toString(36).slice(2,10);
 const subs=[];
 async function refreshICS(force){const u=(S.ics.url||'').trim().replace(/^webcal:/i,'https:');if(!u)return;S.busy=true;render();let txt='',how='direct';
  try{const r=await fetch(u,{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);txt=await r.text()}catch(e){if(!S.ics.proxy){await F.setDoc(D('meta','work'),{...S.work,err:'Blocked by the browser (CORS). Add a proxy URL in settings.',at:Date.now()});S.busy=false;return render()}
   try{how='proxy';const r=await fetch(S.ics.proxy+encodeURIComponent(u),{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);txt=await r.text()}catch(e2){await F.setDoc(D('meta','work'),{...S.work,err:'Could not load: '+e2.message,at:Date.now()});S.busy=false;return render()}}
  if(!/BEGIN:VCALENDAR/.test(txt)){await F.setDoc(D('meta','work'),{...S.work,err:'That link is not a calendar (.ics) file.',at:Date.now()});S.busy=false;return render()}
  const blocks=parseICS(txt);await F.setDoc(D('meta','work'),{blocks,at:Date.now(),err:'',how});S.busy=false;render()}
 let tried=false;function maybeRefresh(){if(tried||!S.ics.url)return;tried=true;if(!S.work.at||Date.now()-S.work.at>6*36e5)refreshICS()}
 setInterval(()=>{tried=false;maybeRefresh()},30*6e4);
 function all(from,to){const L=[],inR=d=>d>=from&&d<=to;
  S.events.forEach(e=>{if(inR(e.s.slice(0,10)))L.push({...e,lab:e.src==='shop'?(app==='shop'?e.title:`Oscar busy: Shop${e.title?' · '+e.title:''}`):e.title,c:e.color||(e.src==='shop'?'#0f2d52':e.kind==='date'?'#e0457b':e.kind==='baby'?'#7c5cff':'#f26a1b')})});
  (S.work.blocks||[]).forEach(b=>inR(b.s.slice(0,10))&&L.push({...b,lab:'Oscar at work',c:'#8a8f98',src:'work',ro:1}));
  S.chores.forEach(c=>c.next&&inR(c.next<from?from:c.next)&&L.push({s:c.next<from?from:c.next,allDay:true,lab:`🧹 ${c.name} (${nm(c.turn)})`,c:'#f26a1b',ro:1}));
  S.maint.forEach(m=>{const due=m.last?addD(m.last,m.every):from;inR(due<from?from:due)&&L.push({s:due<from?from:due,allDay:true,lab:'🛠️ '+m.name,c:'#f7a325',ro:1})});
  S.dates.forEach(d=>{if(!d.date)return;let n=d.date;if(d.yearly){const y=+from.slice(0,4);n=y+d.date.slice(4);if(n<from)n=(y+1)+d.date.slice(4)}inR(n)&&L.push({s:n,allDay:true,lab:'📅 '+d.name,c:'#e0457b',ro:1})});
  return L.sort((a,b)=>(a.s.slice(0,10)+(a.allDay?'':a.s.slice(10)))>(b.s.slice(0,10)+(b.allDay?'':b.s.slice(10)))?1:-1)}
 function busy(day){return all(day,day).filter(e=>!e.allDay&&e.s.includes('T')).map(e=>[e.s.slice(11),e.e?.slice(11)||e.s.slice(11)])}
 function suggest(kind){const out=[],t=new Date(),dur=kind==='date'?3:1;for(let i=0;i<21&&out.length<3;i++){const day=addD(ymd(t),i),dow=new Date(day+'T12:00').getDay(),b=busy(day);
   const starts=kind==='date'?(dow===5||dow===6?[18,19,17]:[19]):[9,10,11,13,14,15,16,17,18,19];if(kind==='date'&&![0,5,6].includes(dow)&&i<7&&out.length<1)continue;
   for(const h of starts){const s=pad(h)+':00',e=pad(h+dur)+':00';if(i===0&&h<=t.getHours())continue;if(b.some(([bs,be])=>bs<e&&be>s))continue;out.push({day,s,e});break}}return out}
 const css=`<style>.cal .dh{font-weight:700;color:#0f2d52;margin:18px 4px 8px;font-size:15px}.cal .ev{display:flex;gap:12px;align-items:center;background:#fff;padding:14px 16px;border-bottom:1px solid #e5e5ea;min-height:56px}.cal .ev:last-child{border-bottom:0}.cal .grp{background:#fff;border-radius:18px;overflow:hidden}
 .cal .dot{width:10px;height:10px;border-radius:50%;flex:0 0 10px}.cal .tm{color:#8a8f98;font-size:14px;width:74px;flex:0 0 74px}.cal .chip{display:inline-block;margin:6px 6px 0 0;padding:10px 14px;border-radius:20px;border:1px solid #e5e5ea;background:#fff;color:#0f2d52;font-size:15px}
 .cal .mod{position:fixed;inset:0;background:rgba(0,0,0,.3);z-index:50;display:flex;align-items:flex-end}.cal .mod>div{background:#f2f2f7;width:100%;max-height:92vh;overflow:auto;border-radius:20px 20px 0 0;padding:20px 20px calc(20px + env(safe-area-inset-bottom))}
 .cal input,.cal select,.cal textarea{font-size:16px;width:100%;padding:12px 14px;border:1px solid #e5e5ea;border-radius:12px;background:#fff;box-sizing:border-box;-webkit-appearance:none}.cal label{display:block;margin:14px 0 6px;font-size:14px;color:#8a8f98}
 .cal button{font-size:16px;min-height:46px;border:0;border-radius:12px;padding:12px 16px;background:#0f2d52;color:#fff;font-weight:600}.cal button.s{background:#fff;color:#0f2d52;border:1px solid #e5e5ea}.cal .r{display:flex;gap:10px}.cal .r>*{flex:1}.cal .sub{color:#8a8f98;font-size:14px}.cal .warn{background:#fff4ec;border-radius:14px;padding:12px 14px;margin:10px 0;font-size:15px}</style>`;
 function render(){if(!el.isConnected&&!el.closest)return;const from=ymd(new Date()),to=addD(from,13),L=all(from,to),by={};L.forEach(e=>(by[e.s.slice(0,10)]=by[e.s.slice(0,10)]||[]).push(e));
  const tl=e=>e.allDay||!e.s.includes('T')?'All day':e.s.slice(11)+(e.e&&e.e.includes('T')?'–'+e.e.slice(11):'');
  const fmt=d=>{const x=new Date(d+'T12:00');return d===from?'Today':d===addD(from,1)?'Tomorrow':x.toLocaleDateString('en',{weekday:'long',month:'short',day:'numeric'})};
  el.innerHTML=css+`<div class="cal"><div class="r" style="margin:6px 0"><button id="cAdd">＋ Add event</button>${me==='oscar'?'<button class="s" id="cSet" style="flex:0 0 auto">⚙︎ Work calendar</button>':''}</div>
  ${S.work.err&&me==='oscar'?`<div class="warn">Work calendar: ${esc(S.work.err)}</div>`:''}${S.busy?'<div class="sub">Refreshing work calendar…</div>':''}
  ${Object.keys(by).length?Object.entries(by).map(([d,es])=>`<div class="dh">${fmt(d)}</div><div class="grp">${es.map(e=>`<div class="ev" ${e.id&&!e.ro?`data-cev="${e.id}"`:''}><span class="tm">${tl(e)}</span><span class="dot" style="background:${e.c}"></span><span style="flex:1">${esc(e.lab)}</span></div>`).join('')}</div>`).join(''):'<p class="sub" style="text-align:center;margin:30px 0">Nothing in the next 2 weeks.</p>'}
  <p class="sub" style="margin:16px 4px">● Family &nbsp; <span style="color:#2e7d4f">●</span> Bills &nbsp; <span style="color:#0f2d52">●</span> Shop &nbsp; <span style="color:#8a8f98">●</span> Work${S.work.at?' · work updated '+new Date(S.work.at).toLocaleString('en',{weekday:'short',hour:'numeric',minute:'2-digit'}):''}</p>${S.sheet||''}</div>`;
  el.querySelector('#cAdd').onclick=()=>edit();el.querySelector('#cSet')&&(el.querySelector('#cSet').onclick=settings);
  el.querySelectorAll('[data-cev]').forEach(x=>x.onclick=()=>edit(S.events.find(e=>e.id===x.dataset.cev)));
  if(S.sheet)bindSheet();onChange?.()}
 let bindSheet=()=>{};const close=()=>{S.sheet=null;render()};
 function edit(e={}){const isShop=app==='shop';
  S.sheet=`<div class="mod"><div><h2 style="margin:0 0 6px;color:#0f2d52">${e.id?'Edit':'New'} event</h2><label>What</label><input id="ct" value="${esc(e.title)}" placeholder="${isShop?'Pickup: walnut board':'Date night'}">
  <label>Type</label><select id="ck">${(isShop?[['shop','Shop (build, pickup, order due)']]:[['date','Date night'],['chore','Chore / errand'],['family','Family'],['baby','Baby / doctor']]).concat(isShop?[['family','Family']]:[]).map(([v,l])=>`<option value="${v}" ${(e.kind||(isShop?'shop':'family'))===v?'selected':''}>${l}</option>`).join('')}</select>
  <div id="csug"></div><button class="s" id="cs" style="margin-top:10px;width:100%">✨ Suggest a free time</button>
  <div class="r"><div><label>Date</label><input id="cd" type="date" value="${e.s?e.s.slice(0,10):ymd(new Date())}"></div></div>
  <div class="r"><div><label>Start</label><input id="c1" type="time" value="${e.s&&e.s.includes('T')?e.s.slice(11):''}"></div><div><label>End</label><input id="c2" type="time" value="${e.e&&e.e.includes('T')?e.e.slice(11):''}"></div></div>
  <p class="sub">Leave times empty for an all-day item.</p><div class="r" style="margin-top:14px"><button class="s" id="cx">Cancel</button><button id="co">Save</button></div>${e.id?'<button class="s" id="cdel" style="width:100%;margin-top:10px;color:#d1402b">Delete</button>':''}</div></div>`;
  bindSheet=()=>{const q=s=>el.querySelector(s);q('#cx').onclick=close;q('.mod').onclick=ev=>{if(ev.target.classList.contains('mod'))close()};
   q('#cs').onclick=()=>{const k=q('#ck').value,sg=suggest(k==='date'?'date':'chore');q('#csug').innerHTML=sg.length?'<label>Free times (avoids work & shop)</label>'+sg.map(x=>`<span class="chip" data-d="${x.day}" data-s="${x.s}" data-e="${x.e}">${new Date(x.day+'T12:00').toLocaleDateString('en',{weekday:'short',month:'short',day:'numeric'})} · ${x.s}</span>`).join(''):'<p class="sub">No free slot found in 3 weeks.</p>';
    q('#csug').querySelectorAll('.chip').forEach(c=>c.onclick=()=>{q('#cd').value=c.dataset.d;q('#c1').value=c.dataset.s;q('#c2').value=c.dataset.e;if(!q('#ct').value)q('#ct').value=k==='date'?'Date night 💑':''})};
   q('#co').onclick=async()=>{const t=q('#ct').value.trim(),d=q('#cd').value;if(!t||!d)return;const a=q('#c1').value,b=q('#c2').value,k=q('#ck').value;
    const id=e.id||uid();await F.setDoc(D('events',id),{...e,id,title:t,kind:k,src:k==='shop'?'shop':'family',s:a?d+'T'+a:d,e:a?(d+'T'+(b||a)):d,allDay:!a,by:me,at:Date.now()});close()};
   if(e.id)q('#cdel').onclick=async()=>{await F.deleteDoc(D('events',e.id));close()}};
  render()}
 function settings(){S.sheet=`<div class="mod"><div><h2 style="margin:0 0 6px;color:#0f2d52">Work calendar (Outlook)</h2><p class="sub">In Outlook on the web: Settings → Calendar → Shared calendars → Publish a calendar → "Can view when I'm busy" → copy the <b>ICS</b> link and paste it here. Only you two can see it.</p>
  <label>ICS link</label><textarea id="iu" rows="3" autocapitalize="off" autocorrect="off" spellcheck="false" inputmode="url" placeholder="https://outlook.office365.com/owa/calendar/…/calendar.ics">${esc(S.ics.url||'')}</textarea>
  <div class="r" style="margin-top:8px"><button class="s" id="ip">📋 Paste</button><button class="s" id="ic">Clear</button></div>
  <label>Proxy (only if Outlook blocks the direct fetch)</label><input id="ix" autocapitalize="off" autocorrect="off" spellcheck="false" inputmode="url" placeholder="https://your-worker.workers.dev/?url=" value="${esc(S.ics.proxy||'')}">
  <div class="r" style="margin-top:14px"><button class="s" id="cx">Cancel</button><button id="co">Save & refresh</button></div></div></div>`;
  bindSheet=()=>{const q=s=>el.querySelector(s);q('#cx').onclick=close;q('#ic').onclick=()=>q('#iu').value='';
   q('#ip').onclick=async()=>{try{q('#iu').value=(await navigator.clipboard.readText()).trim()}catch{q('#iu').focus()}};
   q('#co').onclick=async()=>{const url=q('#iu').value.trim(),proxy=q('#ix').value.trim();S.ics={url,proxy};await F.setDoc(D('private','ics'),{url,proxy,at:Date.now()});if(!url)await F.setDoc(D('meta','work'),{blocks:[],at:Date.now(),err:''});close();if(url)refreshICS(true)}};
  render()}
 // Shop app: mirror project due dates into the shared store
 async function syncShop(items){const keep=new Set();for(const it of items){if(!it.date)continue;const id='shop_'+it.id;keep.add(id);const cur=S.events.find(e=>e.id===id);
   if(!cur||cur.title!==it.title||cur.s!==it.date)await F.setDoc(D('events',id),{id,title:it.title,kind:'shop',src:'shop',s:it.date,e:it.date,allDay:true,auto:true,by:'oscar',at:Date.now()})}
  for(const e of S.events)if(e.auto&&e.src==='shop'&&!keep.has(e.id))await F.deleteDoc(D('events',e.id))}
 ['events','chores','maint','dates'].forEach(n=>subs.push(F.onSnapshot(C(n),s=>{S[n]=s.docs.map(d=>d.data());render()},()=>{})));
 subs.push(F.onSnapshot(D('meta','work'),s=>{S.work=s.exists()?s.data():{blocks:[]};render()},()=>{}));
 if(me==='oscar')subs.push(F.onSnapshot(D('private','ics'),s=>{S.ics=s.exists()?s.data():{};maybeRefresh();render()},()=>{}));
 render();return{render,syncShop,suggest,stop:()=>subs.forEach(f=>f())}}
