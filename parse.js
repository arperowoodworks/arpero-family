// Receipt line parser (shared by app + tests)
(function(g){
const SKIP=/\b(sub\s*-?total|total|tax|change|cash|visa|mastercard|amex|debit|credit|balance|tender|card|savings|you saved|discount|coupon|points|rewards|approved|auth|ref|terminal|store|thank|receipt|items sold|tip|member)\b/i;
const UNITS={lb:'lb',lbs:'lb',oz:'oz',ct:'ct',pk:'pk',gal:'gal',ea:'ea',kg:'kg',g:'g',l:'L',ml:'mL',dz:'dozen',doz:'dozen'};
function clean(s){return s.replace(/[|_*~`"]/g,' ').replace(/\s+/g,' ').trim()}
function titleCase(s){return s.toLowerCase().replace(/\b[a-z]/g,c=>c.toUpperCase())}
function parseReceipt(text){
  const out=[];
  for(let raw of String(text).split(/\r?\n/)){
    let l=clean(raw); if(l.length<3)continue;
    // OCR fixes: "4,99" -> "4.99", "S4.99" -> "4.99"
    l=l.replace(/(\d\s*)1bs?\b/gi,'$1lb').replace(/\/1b\b/gi,'/lb').replace(/(\d\s*)[0O]Z\b/g,'$1oz').replace(/(\d),(\d{2})\b/g,'$1.$2').replace(/(^|\s)[S$]\s?(\d+\.\d{2})\b/g,"$1$2");
    const m=l.match(/^(.*?[A-Za-z].*?)\s+-?(\d{1,4}\.\d{2})\s*-?\s*[A-Z]{0,2}$/);
    if(!m)continue;
    let name=m[1], price=parseFloat(m[2]);
    if(SKIP.test(name)||price<=0||price>500)continue;
    let qty=1, unit='ea';
    let q=name.match(/(\d+(?:\.\d+)?)\s*(lb|lbs|kg|oz)?\s*@\s*\$?\d+(?:\.\d+)?(?:\s*\/\s*(lb|kg|oz|ea))?/i);
    if(q){qty=parseFloat(q[1]);unit=UNITS[(q[2]||q[3]||'ea').toLowerCase()]||'ea';name=name.replace(q[0],'')}
    else{const lead=name.match(/^(\d{1,2})\s*[xX@]?\s+(?=[A-Za-z])/);if(lead&&+lead[1]<25){qty=+lead[1];name=name.slice(lead[0].length)}
      const u=name.match(/\b(\d+(?:\.\d+)?)\s*(lb|lbs|oz|ct|pk|gal|kg|dz|doz)\b/i);if(u&&!q){unit=UNITS[u[2].toLowerCase()]}}
    name=name.replace(/^\d{4,}\s*/,'').replace(/\s\d{5,}\b/g,'').replace(/[^A-Za-z0-9&%' .\/-]/g,' ').replace(/\s+/g,' ').trim();
    if(name.replace(/[^A-Za-z]/g,'').length<2)continue;
    out.push({name:titleCase(name),qty,unit,price});
  }
  return out;
}
g.parseReceipt=parseReceipt;
if(typeof module!=='undefined')module.exports={parseReceipt};
})(typeof window!=='undefined'?window:globalThis);
