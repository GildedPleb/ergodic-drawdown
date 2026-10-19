const css=k=>getComputedStyle(document.documentElement).getPropertyValue(k).trim();
// ---------- Monte Carlo (seeded) ----------
let sd=7;const rnd=()=>{sd|=0;sd=sd+0x6D2B79F5|0;let t=Math.imul(sd^sd>>>15,1|sd);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
const nrm=()=>{let u=0,v=0;while(!u)u=rnd();while(!v)v=rnd();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)};
const Y0=2026,NY=31,N=2000,AGE=38;
const S={price:[],spx:[],infl:[],rate:[],p5:[],p6:[]};
for(let i=0;i<N;i++){let pr=1,sp=1,dol=1,r=.03,a=10,b=10;const P=[1],SP=[1],D=[1],R=[],A=[10],B=[10];
 for(let t=1;t<NY;t++){pr*=Math.exp(.27*Math.exp(-t/8)+.05+(.42*Math.exp(-t/10)+.14)*nrm());sp*=Math.exp(.065+.16*nrm());
  r=Math.max(-.01,.03+.6*(r-.03)+.012*nrm());dol/=1+r;
  const px=1e5*pr;a=Math.max(0,a-9e4/dol/px);b=Math.max(0,b-1.3e5/dol/px-(t==5?6e5/dol/px:0));
  P.push(pr);SP.push(sp);D.push(dol);R.push(r);A.push(a);B.push(b)}
 S.price.push(P);S.spx.push(SP);S.infl.push(D);S.rate.push([R[0],...R]);S.p5.push(A);S.p6.push(B)}
const Q=k=>[...Array(NY)].map((_,t)=>{const v=S[k].map(s=>s[t]).sort((x,y)=>x-y);return[.05,.25,.5,.75,.95].map(q=>v[Math.floor(q*(N-1))])});
const q={price:Q('price'),spx:Q('spx'),infl:Q('infl'),rate:Q('rate'),p5:Q('p5'),p6:Q('p6')};
// ---------- formats (v41 precision) ----------
const f$=v=>v>=1e6?'$'+(+(v/1e6).toFixed(1))+'M':v>=1e3?'$'+(+(v/1e3).toFixed(v<1e4?1:0))+'k':v>=10?'$'+Math.round(v):'$'+v.toFixed(2);
const fB=v=>v<=0?'₿0':v>=1?'₿'+v.toFixed(1):'₿'+(+(+v.toPrecision(2)).toFixed(8));
const fx=v=>'×'+(v>=10?Math.round(v):v>=1?v.toFixed(1):(+v.toPrecision(2)));
const rg=(f,a,b)=>f(a)+'–'+f(b).replace(/^[₿$×]/,'');
// ---------- chart ----------
function chart(cv,o){const W=o.w,H=o.h,d=2;cv.width=W*d;cv.height=H*d;cv.style.width=W+'px';cv.style.height=H+'px';const x=cv.getContext('2d');x.scale(d,d);
 const L=o.pl??44,R=o.pr??150,T=o.pt??16,B0=o.pb??26,stripH=o.strip?Math.round((H-T-B0)/10):0,gap=o.strip?8:0,Bt=H-B0-stripH-gap;
 const X=t=>L+(W-L-R)*t/(NY-1);
 const ax=o.ax;const Yf=(a,v)=>{const lo=a.min,hi=a.max,top=a.top??T,bot=a.bot??Bt;if(a.log){v=Math.max(v,lo);return bot-(bot-top)*(Math.log(v)-Math.log(lo))/(Math.log(hi)-Math.log(lo))}return bot-(bot-top)*(v-lo)/(hi-lo)};
 if(!o.clear){x.fillStyle=css('--ground');x.fillRect(0,0,W,H)}
 // grid + axis labels
 x.font='500 11px "SM Jost"';x.textBaseline='middle';
 for(const a of ax){for(const g of a.ticks){const y=Yf(a,g);x.strokeStyle=css('--hairline');x.lineWidth=a.side=='R'?0:1;if(a.grid!==false){x.setLineDash([1,3]);x.beginPath();x.moveTo(L,y);x.lineTo(W-R,y);x.stroke();x.setLineDash([])}
  x.fillStyle=a.col||css('--ink-muted');x.textAlign=a.side=='R'?'left':'right';x.fillText(a.fmt(g),a.side=='R'?W-R+6:L-6,y)}
  if(a.title){x.save();x.font='600 10px "SM Jost"';x.fillStyle=a.col||css('--ink-muted');x.textAlign=a.side=='R'?'left':'left';x.fillText(a.title.toUpperCase().split('').join('\u200A'),a.side=='R'?W-R+6:Math.max(4,L-38),(a.top??T)-9);x.restore()}}
 // x axis
 x.fillStyle=css('--ink-muted');x.textAlign='center';for(let t=0;t<NY;t+=(o.small?10:5)){x.textAlign=t==0?'left':'center';x.fillText(t==0?'today':o.small?`age ${AGE+t}`:`you at ${AGE+t}`,t==0?X(t)-4:X(t),H-B0+13)}
 // today line
 x.strokeStyle=css('--time');x.globalAlpha=.6;x.beginPath();x.moveTo(X(0),T-6);x.lineTo(X(0),Bt);x.stroke();x.globalAlpha=1;
 // inflation bars
 if(o.bars){const bh=o.bars.h,by=o.strip?H-B0:Bt,top=by-bh,mx=.07;
  if(o.strip){x.strokeStyle=css('--hairline');x.beginPath();x.moveTo(L,top);x.lineTo(W-R,top);x.moveTo(L,by);x.lineTo(W-R,by);x.stroke()}
  const bw=(W-L-R)/(NY-1)*.56;for(let t=1;t<NY;t++){const [a,,m,,b]=q.rate[t];const h=v=>Math.max(0,v)/mx*bh;x.fillStyle=css('--path-infl');x.globalAlpha=o.bars.a??.28;x.fillRect(X(t)-bw/2,by-h(m),bw,h(m));x.globalAlpha=.55;x.fillRect(X(t)-.5,by-h(b),1,h(b)-h(m)>0?h(b)-h(m):0);x.globalAlpha=1}
  x.font='600 9.5px "SM Jost"';x.fillStyle=css('--path-infl');x.textAlign='left';x.fillText(o.bars.label||'PRICES RISE · %/YR',L+6,top-6>T?top-6:top+8);
  if(!o.small){x.font='500 10px "SM Jost"';x.textAlign='left';x.fillText('about '+Math.round(q.rate[10][2]*100)+'%/yr',W-R+6,by-q.rate[10][2]/mx*bh)}}
 // paths: context first, focus last
 const ser=[...o.series].sort((a,b)=>(a.focus?1:0)-(b.focus?1:0));const lab=[];
 for(const s of ser){const a=ax[s.ax||0],c=css(s.col),Yv=(t,i)=>Yf(a,s.q[t][i]*(s.k||1));
  const band=(i,j,al)=>{x.fillStyle=c;x.globalAlpha=al;x.beginPath();for(let t=0;t<NY;t++)x.lineTo(X(t),Yv(t,i));for(let t=NY-1;t>=0;t--)x.lineTo(X(t),Yv(t,j));x.fill();x.globalAlpha=1};
  const ln=(i,w,al,dash)=>{x.strokeStyle=c;x.globalAlpha=al;x.lineWidth=w;x.setLineDash(dash||[]);x.beginPath();for(let t=0;t<NY;t++)x.lineTo(X(t),Yv(t,i));x.stroke();x.setLineDash([]);x.globalAlpha=1};
  if(s.focus){band(0,4,.08);band(1,3,.12)}else{band(1,3,.04);ln(0,.75,.45);ln(4,.75,.45);ln(1,1.25,.35);ln(3,1.25,.35)}
  // casing + median
  x.strokeStyle=css('--surface');x.lineWidth=(s.w||2)+3;x.beginPath();for(let t=0;t<NY;t++)x.lineTo(X(t),Yv(t,2));x.stroke();
  ln(2,s.focus?2.5:(s.w||2),s.focus?1:.8,s.dash);
  lab.push({y:Yv(NY-1,2),s,c})}
 // end labels nudged
 lab.sort((a,b)=>a.y-b.y);for(let i=1;i<lab.length;i++)if(lab[i].y-lab[i-1].y<(o.small?14:26))lab[i].y=lab[i-1].y+(o.small?14:26);const mxY=(o.labMax??(H-B0-stripH-gap))-8;if(lab.length&&lab[lab.length-1].y>mxY){lab[lab.length-1].y=mxY;for(let i=lab.length-2;i>=0;i--)if(lab[i+1].y-lab[i].y<(o.small?14:26))lab[i].y=lab[i+1].y-(o.small?14:26)}
 for(const l of lab){const s=l.s,k=s.k||1,m=s.q[NY-1];x.fillStyle=l.c;x.textAlign='left';x.font='600 11px "SM Jost"';x.fillText(s.name+' '+s.f(m[2]*k),W-R+(o.ax.some(a=>a.side=='R')?44:8),o.small?l.y:l.y-5);
  if(!o.small){x.font='500 10px "SM Jost"';x.globalAlpha=.85;x.fillText('p5–p95 '+rg(s.f,m[0]*k,m[4]*k),W-R+(o.ax.some(a=>a.side=='R')?44:8),l.y+8);x.globalAlpha=1}}
 if(o.after)o.after(x,{X,Yf,ax,L,R,T,Bt,W,H});return cv}
// series catalogue
const SR={
 price:(f)=>({name:'₿ price',q:q.price,col:'--path-btc',w:2.5,f:f||(v=>f$(v*1e5))}),
 spx:(f)=>({name:'S&P',q:q.spx,col:'--path-spx',dash:[1.5,3.5],f:f||fx}),
 infl:()=>({name:'$1 buys',q:q.infl,col:'--path-infl',dash:[7,4],f:v=>f$(v)}),
 p5:(f)=>({name:'Orchid · live on $90k',q:q.p5,col:'--plan-5',dash:[1,3,6,3],f:f||fB}),
 p6:(f)=>({name:'Coral · $130k + house',q:q.p6,col:'--plan-6',dash:[8,3,2,3,2,3],f:f||fB})};
