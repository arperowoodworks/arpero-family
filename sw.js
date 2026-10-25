const C='arpero-family-v31',F=['./','index.html','parse.js','manifest.json','icon-180.png','icon-192.png','icon-512.png','apple-touch-icon.png','logo.png','cal.js','food-data.js','guide.js','rewards-data.js','favicon-32.png','emblem.jpg','fonts/montserrat-latin.woff2'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(F)));self.skipWaiting()});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==location.origin)return;e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(C).then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request,{ignoreSearch:true})))});
// Web Push: payload {title, body, go:'home'|'fix', tag}
self.addEventListener('push',e=>{let d={};try{d=e.data?e.data.json():{}}catch(_){d={body:e.data&&e.data.text()}}
 e.waitUntil(Promise.all([self.registration.showNotification(d.title||'Arpero Family',{body:d.body||'',icon:'icon-192.png',badge:'icon-192.png',tag:d.tag||'arpero',data:{go:d.go||'home'}}),
  self.navigator&&self.navigator.setAppBadge?self.navigator.setAppBadge(1).catch(()=>{}):0]))});
self.addEventListener('notificationclick',e=>{e.notification.close();const go=(e.notification.data&&e.notification.data.go)||'home',url=new URL('./?go='+go,self.registration.scope).href;
 e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(cs=>{const c=cs.find(x=>x.url.startsWith(self.registration.scope));if(c){c.postMessage({go});return c.focus()}return self.clients.openWindow(url)}))});
