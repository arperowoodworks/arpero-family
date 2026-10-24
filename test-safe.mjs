// Unit tests for monthly income per frequency + safe-to-spend. Extracts the functions from index.html.
import fs from 'fs';import assert from 'assert';
const h=fs.readFileSync(new URL('./index.html',import.meta.url),'utf8');
const grab=re=>h.match(re)[0];
const code=[grab(/const PERMO=\{[^}]+\};/),grab(/const moAmt=[^\n]+/),grab(/function safeCalc[^\n]+/)].join('\n');
const {moAmt,safeCalc}=new Function(code+';return{moAmt,safeCalc}')();
const near=(a,b)=>assert.ok(Math.abs(a-b)<0.01,a+' != '+b);
near(moAmt({amt:1000,freq:'weekly'}),4333.33);
near(moAmt({amt:1000,freq:'biweekly'}),2166.67);
near(moAmt({amt:1000,freq:'semimonthly'}),2000);
near(moAmt({amt:1000,freq:'monthly'}),1000);
near(moAmt({amt:'1000',freq:'biweekly'}),2166.67); // string amount, no concatenation
near(moAmt({amt:'',freq:'weekly'}),0);
near(safeCalc(4000,1500,200,300),2000);
near(safeCalc('4000','1500','200','300'),2000);
near(safeCalc(4000,0,0,-500),4000); // never above income
near(safeCalc(1000,1500,0,0),0); // never negative
assert.ok(safeCalc(3000,1000,100,50)<=3000);
console.log('safe-to-spend tests passed');
