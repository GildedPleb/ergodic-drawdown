const {chromium}=require('/workspace/pwtool/node_modules/playwright-core');
// usage: node shoot.js <app.html abs> <out.png> <stJSON> [layer]   · viewport 1420x896 (the reference layout) → 1024x646 px
const [,,file,out,st,layer]=process.argv;
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});const p=await b.newPage({viewport:{width:1420,height:896},deviceScaleFactor:1024/1420});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto(`file://${file}?mode=dark&st=${encodeURIComponent(st)}`);await p.waitForFunction(()=>document.title=='ready');await p.waitForTimeout(300);
if(layer){await p.click(`[data-layer="${layer}"]`);await p.waitForTimeout(600)}
const c=await p.context().newCDPSession(p);await c.send('DOM.enable');await c.send('CSS.enable');const {root}=await c.send('DOM.getDocument',{depth:-1});const ids=(await c.send('DOM.querySelectorAll',{nodeId:root.nodeId,selector:'body *'})).nodeIds;const s=new Set();for(const id of ids){try{(await c.send('CSS.getPlatformFontsForNode',{nodeId:id})).fonts.forEach(f=>s.add(f.familyName))}catch(e){}}
await p.screenshot({path:out});console.log(out,[...s].join(' | '),errs.length?'ERR '+errs.join(';'):'');await b.close()})();
