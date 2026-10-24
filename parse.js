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
    out.push({name:expandAbbr(name),raw:name.toUpperCase(),qty,unit,price});
  }
  return out;
}
// Aldi / Walmart style abbreviations -> friendly words (word by word; the app also remembers your own fixes)
const ABBR={GV:'Great Value',MM:"Member's Mark",SS:'Simply Nature',BNLS:'Boneless',SKNLS:'Skinless',BRST:'Breast',BRSTS:'Breasts',CHKN:'Chicken',CHK:'Chicken',CKN:'Chicken',GRD:'Ground',GRND:'Ground',BF:'Beef',BEEF:'Beef',TRKY:'Turkey',PRK:'Pork',SSG:'Sausage',SAUS:'Sausage',BCN:'Bacon',WHL:'Whole',MLK:'Milk',MILK:'Milk',WHT:'White',WHEAT:'Wheat',WHTBRD:'White Bread',BRD:'Bread',CHS:'Cheese',CHSE:'Cheese',SHRD:'Shredded',SHR:'Shredded',MOZZ:'Mozzarella',CHED:'Cheddar',SHRP:'Sharp',CRM:'Cream',SR:'Sour',BTR:'Butter',BUTR:'Butter',YGRT:'Yogurt',YOG:'Yogurt',EGG:'Eggs',EGGS:'Eggs',LG:'Large',XL:'Extra Large',ORG:'Organic',ORGNC:'Organic',BAN:'Bananas',BANANA:'Bananas',BANANAS:'Bananas',APPL:'Apples',APL:'Apple',STRWB:'Strawberries',STRAWB:'Strawberries',BLUEB:'Blueberries',AVO:'Avocado',AVOC:'Avocados',TOM:'Tomatoes',TMT:'Tomatoes',TOMS:'Tomatoes',ONN:'Onion',ONI:'Onion',ONION:'Onions',YEL:'Yellow',GRN:'Green',RD:'Red',PEPR:'Pepper',PPR:'Pepper',POT:'Potatoes',POTS:'Potatoes',RUSS:'Russet',LTC:'Lettuce',LETT:'Lettuce',ROM:'Romaine',CARR:'Carrots',CRT:'Carrots',CUC:'Cucumber',CILNTR:'Cilantro',CIL:'Cilantro',LMN:'Lemon',LIM:'Lime',GRLC:'Garlic',GAR:'Garlic',RCE:'Rice',RICE:'Rice',BRN:'Brown',PSTA:'Pasta',SPAG:'Spaghetti',SCE:'Sauce',SAU:'Sauce',TORT:'Tortillas',TRTLA:'Tortillas',FLR:'Flour',SGR:'Sugar',OIL:'Oil',VEG:'Vegetable',OLV:'Olive',BNS:'Beans',BN:'Bean',BLK:'Black',PNTO:'Pinto',CRN:'Corn',FRZ:'Frozen',FZN:'Frozen',PZZA:'Pizza',PIZ:'Pizza',CRL:'Cereal',CER:'Cereal',OJ:'Orange Juice',JCE:'Juice',JUI:'Juice',WTR:'Water',SPKL:'Sparkling',SDA:'Soda',COFF:'Coffee',CFE:'Coffee',CHIP:'Chips',CHPS:'Chips',CRKR:'Crackers',CKY:'Cookies',CKIE:'Cookies',SNK:'Snack',PB:'Peanut Butter',PNT:'Peanut',JLY:'Jelly',DIAP:'Diapers',DIAPR:'Diapers',WIPE:'Wipes',WPS:'Wipes',TP:'Toilet Paper',BATH:'Bath',TSSU:'Tissue',PPR_TWL:'Paper Towels',TWL:'Towels',DET:'Detergent',LNDRY:'Laundry',DSH:'Dish',SOAP:'Soap',FAM:'Family',PK:'Pack',CT:'ct',OZ:'oz',LB:'lb',GAL:'Gallon',HG:'Half Gallon',FF:'Fat Free',RF:'Reduced Fat',DZ:'Dozen'};
function expandAbbr(n){return String(n).replace(/[A-Za-z%]+/g,w=>{const k=w.toUpperCase();return ABBR[k]||(/^\d/.test(w)?w:w.charAt(0).toUpperCase()+w.slice(1).toLowerCase())}).replace(/\s+/g,' ').trim()}
function parseTotal(text){let t=0;for(const raw of String(text).split(/\r?\n/)){const l=clean(raw).replace(/(\d),(\d{2})\b/g,'$1.$2');if(/sub\s*-?total/i.test(l))continue;const m=l.match(/\b(?:total|balance due|amount due)\b[^\d]*(\d{1,4}\.\d{2})/i);if(m)t=Math.max(t,parseFloat(m[1]))}return t}
function detectStore(text){const s=String(text);return /walmart|wal-mart|great value/i.test(s)?'Walmart':/\baldi\b/i.test(s)?'Aldi':''}
g.parseReceipt=parseReceipt;g.parseTotal=parseTotal;g.detectStore=detectStore;g.expandAbbr=expandAbbr;
if(typeof module!=='undefined')module.exports={parseReceipt,parseTotal,detectStore,expandAbbr};
})(typeof window!=='undefined'?window:globalThis);
