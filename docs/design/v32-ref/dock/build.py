# dock/app.html = depth/v32/app.html (locked v32 + SM fonts + ₿ prefix + tabs/gear + world layer) + side-dock option. Chart code untouched.
s=open('depth/v32/app.html').read()
pre="<script>window.__SIDE=(()=>{const q=new URLSearchParams(location.search).get('side');if(q==='b')return null;if(q==='l'||q==='r')return q;return (innerWidth>innerHeight&&innerHeight<=500)?'r':null})();</script>"
s=s.replace('href="../../type/type.css"','href="../type/type.css"');s=s.replace("<body",pre+"<body",1)
for a,b in [("const NC=()=>","const NC=()=>window.__SIDE?4:"),("body.classList.toggle('lo',","body.classList.toggle('lo',!window.__SIDE&&")]:
    assert a in s,a;s=s.replace(a,b,1)
css="""
/* v45 side dock: the sheet becomes a full-height side panel; the chart column keeps header, headline, chart, scrubber */
body.sd{--pw:64px}body.sd.sd-open{--pw:40vw}
body.sd-r{padding-right:var(--pw)!important}body.sd-l{padding-left:var(--pw)!important}
body.sd{box-sizing:border-box}
body.sd canvas#c{margin:0!important;width:100%!important}
body.sd .sheet{position:fixed!important;top:0;bottom:0;width:var(--pw)!important;max-height:none!important;height:auto!important;margin:0!important;border-radius:0!important;border-top:0!important;display:flex;flex-direction:column;overflow:hidden;z-index:5;box-sizing:border-box;padding:8px 12px 12px}
body.sd-r .sheet{right:0;border-left:1px solid var(--rule)!important}body.sd-l .sheet{left:0;border-right:1px solid var(--rule)!important}
body.sd .sheet .body,body.sd .sheet .cols,body.sd .sheet .sgc{flex:1;overflow:auto;min-height:0;grid-template-columns:1fr!important}
/* closed: vertical rail · search top, three tabs, gear bottom */
body.sd:not(.sd-open) .sheet{padding:10px 4px}
body.sd:not(.sd-open) .sheet>*:not(.drow){display:none!important}
body.sd:not(.sd-open) .drow.d3{flex-direction:column;height:100%;justify-content:flex-start;gap:6px}
body.sd:not(.sd-open) .drow.d3 .mag{margin:4px 0 10px!important}
body.sd:not(.sd-open) .tabs3{flex-direction:column;flex:0;gap:2px;align-items:center}
body.sd:not(.sd-open) .tabs3 button{font-size:9.5px;letter-spacing:.1em;padding:12px 4px;min-height:24px}
body.sd:not(.sd-open) .tabs3 button[aria-selected=true]{box-shadow:inset 0 -2px 0 var(--gold)}
body.sd:not(.sd-open) .gear{margin-top:auto}
body.sd .grab-edge{position:absolute;top:50%;width:14px;height:44px;transform:translateY(-50%);display:flex;align-items:center;justify-content:center}
body.sd-r .grab-edge{left:-8px}body.sd-l .grab-edge{right:-8px}
body.sd .sheet .gb{display:none!important}
body.sd .sheet{overflow:visible!important}body.sd .sheet>.ce{display:none!important}
body.sd .sheet>.grab.edge{display:none!important} /* the panel seam is the handle: drag it or tap a tab */
body.sd.sd-open{--pw:min(40vw,460px)}
</style>"""
s=s.replace("</style>",css,1)
post="""<script>
(function(){const S=window.__SIDE;if(!S)return;const b=document.body;
const sync=()=>{b.classList.add('sd','sd-'+S);b.classList.toggle('sd-open',!!(ST.drawer||ST.editI!=null||ST.search));
 const L=ST.layer||'p',want={p:['Plan'],m:['Model','View'],s:['Stats']}[L]||['Plan'];
 document.querySelectorAll('.sheet .cols>.col').forEach(c=>{const h=c.querySelector('h4');c.style.display=!h||want.some(w=>h.textContent.trim().startsWith(w))?'':'none'})};
const r1=window.render;window.render=function(){sync();r1.apply(this,arguments);sync();window.dispatchEvent(new Event('resize-world'))};render=window.render;document.fonts.ready.then(()=>setTimeout(()=>render(),30));
document.addEventListener('click',e=>{const t=e.target.closest('[data-layer]');if(t){ST.drawer=1;setTimeout(()=>render(),0)}},true);
})();
</script></body></html>"""
s=s.rstrip()[:-len('</body></html>')]+post
open('dock/app.html','w').write(s)
