# Builds depth/v32/app.html from the LOCKED v32/app.html. Only: SM fonts, ₿ prefix, dock tabs + gear, world back layer.
import re
s=open('v32/app.html').read()
s=re.sub(r'<link href="https://fonts.googleapis.com[^>]*>','<link rel="stylesheet" href="../../type/type.css">',s)
def cg(m):
    size=float(m.group(1));fam="SM Cormorant" if size>=21 else "SM EB Garamond";q=m.group(3)
    return m.group(0).replace(m.group(2),q+fam+q)
s=re.sub(r"(\d+(?:\.\d+)?)px(?:/[\d.]+)?\s+((['\"])Cormorant Garamond\3)",cg,s)
s=s.replace("'Cormorant Garamond'","'SM EB Garamond'").replace('"Cormorant Garamond"','"SM EB Garamond"')
s=s.replace('"JetBrains Mono"','"SM Jost"').replace("'Inter'","'SM Jost'").replace("JetBrains Mono","SM Jost")
s=re.sub(r"(\d+(?:\.\d+)?px(?:/[\d.]+)?) Inter\b",r"\1 SM Jost",s)
s=re.sub(r"\bInter\b(?=[;'}\",])","SM Jost",s)
# dock row: search far left · Models Plans Stats · gear far right (search state unchanged)
old="${ST.search?(ST.sq||'')+'<span class=\"caret\"></span>':'Ask anything, or change your plan…'}</span>${ST.search?'<span class=\"dlink\" data-xs=\"1\">✕ Close</span>':open?"
assert old in s
s=s.replace("const row=`<div class=\"drow\" data-open=\"1\" role=\"button\" tabindex=\"-1\">${MAGI}<span class=\"ask ${ST.search?'on':''}\">",
 "const row=ST.search?`<div class=\"drow\" data-open=\"1\" role=\"button\" tabindex=\"-1\">${MAGI}<span class=\"ask ${ST.search?'on':''}\">",1)
s=s.replace("Your plan <b>⌃</b></button>'}</div>`;","Your plan <b>⌃</b></button>'}</div>`:`<div class=\"drow d3\">${MAGI}<span class=\"tabs3\" role=\"tablist\" aria-label=\"Panes\">${[['m','Models'],['p','Plans'],['s','Stats']].map(([k,n])=>`<button role=\"tab\" data-layer=\"${k}\" aria-selected=\"${(ST.layer||'p')==k}\">${n}</button>`).join('')}</span><button class=\"gear\" aria-label=\"Settings\"><svg viewBox=\"0 0 16 16\" width=\"15\" height=\"15\"><circle cx=\"8\" cy=\"8\" r=\"2.6\" fill=\"none\" stroke=\"var(--gold)\" stroke-width=\"1.3\"/>${[0,45,90,135,180,225,270,315].map(a=>`<rect x=\"7.1\" y=\"1.2\" width=\"1.8\" height=\"2.8\" fill=\"var(--gold)\" transform=\"rotate(${a} 8 8)\"/>`).join('')}<circle cx=\"8\" cy=\"8\" r=\"4.6\" fill=\"none\" stroke=\"var(--gold)\" stroke-width=\"1.3\"/></svg></button></div>`;",1)
assert 'tabs3' in s
css="""
body{font-variant-numeric:lining-nums tabular-nums}
.kick{line-height:12px} /* Jost "normal" line box is 3px taller than Inter; pin to v32 metric so the chart keeps its exact geometry */
.drow.d3{justify-content:space-between}.tabs3{display:flex;gap:28px;justify-content:center;flex:1}
.tabs3 button,.gear{all:unset;cursor:pointer}.tabs3 button{font:600 11px 'SM Jost';letter-spacing:.14em;text-transform:uppercase;color:var(--muted);padding:6px 2px}
.tabs3 button[aria-selected=true]{color:var(--gold);box-shadow:inset 0 -2px 0 var(--gold)}.tabs3 button:focus-visible,.gear:focus-visible{outline:2px solid var(--gold);outline-offset:2px}
.gear{display:inline-flex;padding:4px 2px}
#c,#w{transform-origin:50% 100%;transition:opacity 320ms cubic-bezier(.2,.7,.2,1),transform 320ms cubic-bezier(.2,.7,.2,1),filter 320ms cubic-bezier(.2,.7,.2,1)}
#w{position:fixed;pointer-events:none;z-index:1;margin:0!important;flex:none!important;min-height:0}
.ly-back{opacity:.07!important;transform:scaleY(.94) translateY(-6px);filter:blur(.6px)}
.ly-front{transition-delay:40ms!important}
@media (prefers-reduced-motion:reduce){#c,#w{transition:opacity 120ms linear!important;transform:none!important;filter:none!important}}
.srl{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
</style>"""
s=s.replace("</style>",css,1)
s=s.replace('<canvas id="c"></canvas>','<canvas id="c"></canvas><canvas id="w" aria-hidden="true" class="ly-back"></canvas><div class="srl" aria-live="polite" id="lv"></div>',1)
pre="""<script>
// v43 · ₿ is a prefix like $: rewrite '13.1 ₿' / '20₿' / '1.2 ₿/yr' at draw time (canvas) and in the DOM. Nothing else in v32 changes.
const PFX=t=>typeof t=='string'?t.replace(/([−+-]?)(\\d[\\d.,]*)\\s?₿/g,'$1₿$2'):t;
{const ft=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(t,a,b,m){if(t==='⚠'){const c=this.fillStyle;this.save();this.beginPath();this.moveTo(a,b-9.5);this.lineTo(a+5.6,b+0.5);this.lineTo(a-5.6,b+0.5);this.closePath();this.fill();this.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--surface').trim()||'#1e1b16';this.fillRect(a-.6,b-6.6,1.2,3.6);this.fillRect(a-.6,b-2.1,1.2,1.2);this.restore();return}return m===undefined?ft.call(this,PFX(t),a,b):ft.call(this,PFX(t),a,b,m)};
 const mt=CanvasRenderingContext2D.prototype.measureText;CanvasRenderingContext2D.prototype.measureText=function(t){return mt.call(this,PFX(t))}}
const fixDom=r=>{const w=document.createTreeWalker(r,NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode()){if(n.nodeValue.includes('₿')){const v=PFX(n.nodeValue);if(v!==n.nodeValue)n.nodeValue=v}}};
new MutationObserver(ms=>ms.forEach(m=>fixDom(m.target.nodeType==3?m.target.parentNode:m.target))).observe(document.documentElement,{subtree:true,childList:true,characterData:true});
</script>"""
s=s.replace("<body",pre+"<body",1) if s.count("<body")==1 else s
post="""<script>
// v43 · world layer (₿ price, S&P, dollar buying power) behind the v32 drawdown. Same L/R/time axis as v32 (G.lx).
(function(){const w=document.getElementById('w'),c=document.getElementById('c'),lv=document.getElementById('lv');
const NQ=18*13+1,Z=[-1.645,-.674,0,.674,1.645];
const ser=[{n:'₿ price',col:'#f7931a',w:2,m:t=>1e5*Math.exp(.32*7*(1-Math.exp(-t/7))+.04*t),s:t=>(.55*Math.exp(-t/10)+.2)*Math.sqrt(t)*.75,focus:1,dash:[]},
 {n:'$100k in S&P',col:'#cbc6bb',w:1.6,m:t=>1e5*Math.exp(.065*t),s:t=>.16*Math.sqrt(t),dash:[1.5,3.5]},
 {n:'$100k buys',col:'#b0607e',w:1.6,m:t=>1e5*Math.exp(-.03*t),s:t=>.03*Math.sqrt(t),dash:[7,4]}];
const f$=v=>v>=1e6?'$'+(+(v/1e6).toFixed(1))+'M':'$'+Math.round(v/1e3)+'k';
function drawWorld(){const g=window.GG&&GG();if(!g||!g.lx)return;const r=c.getBoundingClientRect();Object.assign(w.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});
 w.width=r.width*2;w.height=r.height*2;const x=w.getContext('2d');x.setTransform(2,0,0,2,0,0);const {L,R,T,Bt,lx}=g,lo=Math.log(3e4),hi=Math.log(3e7),ly=v=>Bt-(Bt-T)*(Math.log(Math.max(v,3e4))-lo)/(hi-lo);
 x.font="500 10px 'SM Jost'";x.fillStyle='#a99e86';x.textAlign='left';[1e5,1e6,1e7].forEach(v=>{x.strokeStyle='#3a342a';x.setLineDash([1,3]);x.beginPath();x.moveTo(L,ly(v));x.lineTo(R,ly(v));x.stroke();x.setLineDash([]);x.fillText(f$(v),R+4,ly(v)+3)});
 for(const s of [...ser].reverse()){const Q=k=>[...Array(NQ)].map((_,i)=>{const t=i/13;return s.m(t)*Math.exp(Z[k]*s.s(t))});const q=[0,1,2,3,4].map(Q);
  const band=(a,b,al)=>{x.beginPath();for(let i=0;i<NQ;i++)x.lineTo(lx(i),ly(q[a][i]));for(let i=NQ-1;i>=0;i--)x.lineTo(lx(i),ly(q[b][i]));x.globalAlpha=al;x.fillStyle=s.col;x.fill();x.globalAlpha=1};
  const line=(k,lw,al,d)=>{x.beginPath();for(let i=0;i<NQ;i++)x.lineTo(lx(i),ly(q[k][i]));x.globalAlpha=al;x.strokeStyle=s.col;x.lineWidth=lw;x.setLineDash(d);x.stroke();x.setLineDash([]);x.globalAlpha=1};
  if(s.focus){band(0,4,.10);band(1,3,.16)}else{band(1,3,.05);line(0,.75,.45,[]);line(4,.75,.45,[])}
  line(2,s.w,1,s.dash);x.font="italic 400 12px 'SM EB Garamond'";x.fillStyle=s.col;x.textAlign='right';x.fillText(s.n+' · '+f$(q[2][NQ-1]),R-4,ly(q[2][NQ-1])-8)}
 x.font="600 10px 'SM Jost'";x.fillStyle='#dcb86c';x.textAlign='left';x.fillText('THE WORLD · ₿ PRICE, S&P, WHAT $100K BUYS',L+8,T+12)}
function setLayer(k){ST.layer=k;const m=k=='m';w.classList.toggle('ly-back',!m);w.classList.toggle('ly-front',m);c.classList.toggle('ly-back',m);c.classList.toggle('ly-front',!m);
 w.setAttribute('aria-hidden',!m);c.setAttribute('aria-hidden',m);document.querySelectorAll('.tabs3 button').forEach(b=>b.setAttribute('aria-selected',b.dataset.layer==k));
 lv.textContent=m?'Showing the world: bitcoin price, S&P and what $100k buys.':k=='p'?'Showing your plan.':''}
window.setLayer=setLayer;
const r0=window.render;window.render=function(){r0.apply(this,arguments);drawWorld();const k=ST.layer||'p';if(k!='s')setLayer(k)};render=window.render;
document.addEventListener('click',e=>{const b=e.target.closest('[data-layer]');if(b){e.stopPropagation();e.preventDefault();const k=b.dataset.layer;if(k=='s'){ST.layer='s';document.querySelectorAll('.tabs3 button').forEach(x=>x.setAttribute('aria-selected',x.dataset.layer=='s'));return}setLayer(k)}},true);
addEventListener('keydown',e=>{if(document.activeElement&&/INPUT|TEXTAREA/.test(document.activeElement.tagName))return;if(e.key=='m'||e.key=='M')setLayer('m');if(e.key=='p'||e.key=='P')setLayer('p')});
addEventListener('resize',()=>setTimeout(drawWorld,0));})();
</script></body></html>"""
assert s.rstrip().endswith('</body></html>')
s=s.rstrip()[:-len('</body></html>')]+post
open('depth/v32/app.html','w').write(s)
print(sorted(set(re.findall(r"(?:Inter|JetBrains|Cormorant Garamond)",s))))
