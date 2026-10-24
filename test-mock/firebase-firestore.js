const D=window.__D={},L=[];const key=p=>p.join('/');
export const initializeFirestore=()=>({});export const persistentLocalCache=()=>0;
export const collection=(db,...p)=>({c:key(p)});export const doc=(db,...p)=>({c:key(p.slice(0,-1)),id:p.at(-1)});
const fire=()=>L.forEach(l=>l());
export const onSnapshot=(r,cb)=>{const f=()=>{if(r.id){const v=(D[r.c]||{})[r.id];cb({exists:()=>!!v,data:()=>v})}else cb({docs:Object.values(D[r.c]||{}).map(v=>({data:()=>v}))})};L.push(f);f();return()=>{}};
const deep=(a,b)=>{for(const k in b){if(b[k]&&typeof b[k]==='object'&&!Array.isArray(b[k])&&a[k]&&typeof a[k]==='object')deep(a[k],b[k]);else a[k]=b[k]}return a};
export const setDoc=async(r,v,o)=>{D[r.c]=D[r.c]||{};D[r.c][r.id]=o?.merge?deep(D[r.c][r.id]||{},structuredClone(v)):v;fire()};
export const deleteDoc=async r=>{delete (D[r.c]||{})[r.id];fire()};
