import {parseICS} from './cal.js';
const d=new Date();const p=n=>String(n).padStart(2,'0');const ds=`${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}`;
const ics=`BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nDTSTART;TZID=Central Standard Time:${ds}T080000\r\nDTEND;TZID=Central Standard Time:${ds}T163000\r\nRRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR\r\nSUMMARY:Busy\r\nEND:VEVENT\r\nBEGIN:VEVENT\r\nDTSTART:${ds}T200000Z\r\nDTEND:${ds}T210000Z\r\nSUMMARY:Busy\r\nEND:VEVENT\r\nBEGIN:VEVENT\r\nDTSTART;VALUE=DATE:${ds}\r\nDTEND;VALUE=DATE:${ds}\r\nTRANSP:TRANSPARENT\r\nEND:VEVENT\r\nEND:VCALENDAR`;
const r=parseICS(ics,14);console.log(r.length,'blocks');console.log(r.slice(0,4));
if(!r.some(x=>x.s.endsWith('T08:00'))||!r.some(x=>x.s.endsWith('T15:00')))throw Error('parse fail');console.log('ICS OK')
