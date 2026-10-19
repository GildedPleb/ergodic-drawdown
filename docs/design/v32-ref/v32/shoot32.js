const {chromium}=require('/workspace/pwtool/node_modules/playwright-core');
const D=__dirname,U=st=>`file://${D}/app.html?mode=dark&st=${encodeURIComponent(JSON.stringify({hint:0,...st}))}`;
const F={home:{},open:{drawer:1,tab:'plan'},edit:{drawer:1,tab:'plan',editI:7,sp:80,ghostSp:90,undo:1},search:{search:1,kb:1,sq:'when can I st'},scrub:{scrub:74,rwSel:0}};
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
for(const k in F){const p=await b.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});p.on('pageerror',e=>console.log('ERR',e.message));
await p.goto(U(F[k]));await p.waitForFunction(()=>document.title=='ready');await p.waitForTimeout(250);await p.screenshot({path:`${D}/desk-${k}.png`});await p.close()}
await b.close()})();
