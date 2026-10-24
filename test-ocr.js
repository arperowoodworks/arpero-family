const T=require('tesseract.js');const {parseReceipt}=require('/workspace/arpero-home/parse.js');
(async()=>{const w=await T.createWorker('eng');const {data}=await w.recognize('/workspace/arpero-home/test-receipt.png');await w.terminate();console.log(data.text);console.log(parseReceipt(data.text))})()
