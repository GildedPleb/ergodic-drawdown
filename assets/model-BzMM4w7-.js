import{d as p,b as k,u as x,r as u,j as r,i as j,m as b,c as B,e as L,W as d,f,g as R,a as N,h as P,k as _,C as U}from"./index-CAk_kTyU.js";import{h as w}from"./enter-D20OlzjC.js";import{L as G}from"./loading-Dj6wbtuU.js";const H=p.div`
  display: flex;
  width: 100%;
  white-space: nowrap;
  align-items: baseline;
  padding-right: 5px;
  justify-content: flex-start;
  gap: 0px 10px;
`,Y=()=>{const{setLoadingVolumeData:t}=k(),{clampBottom:a,clampTop:n,setClampBottom:s,setClampTop:i,setLoadingPriceData:o}=x(),e=u.useCallback(c=>{i(c.target.checked),o(!0),t(!0)},[i,o,t]),l=u.useCallback(c=>{s(c.target.checked)},[s]);return r.jsxs(H,{children:[r.jsx("span",{children:j.clamp}),r.jsx("input",{autoComplete:"off",checked:n,id:"clampTop",onChange:e,onKeyDown:w,type:"checkbox"}),r.jsx("label",{htmlFor:"clampTop",children:j.clampTop}),r.jsx("input",{autoComplete:"off",checked:a,id:"clampBottom",onChange:l,onKeyDown:w,type:"checkbox"}),r.jsx("label",{htmlFor:"clampBottom",children:j.clampBottom})]})},X=p.div`
  display: flex;
  justify-content: space-between;
  width: 100%;
  white-space: nowrap;
  align-items: baseline;
  gap: 0 5px;
  padding-right: 5px;
`,q=p.input`
  max-width: 75px;
  font-size: inherit;
`,J=()=>{const{setLoadingVolumeData:t}=k(),{epochCount:a,setEpochCount:n,setLoadingPriceData:s}=x(),i=u.useCallback(e=>{const l=Number.parseInt(e.target.value,10);l>=1&&l<=100&&(n(l),s(!0),t(!0))},[n,s,t]),o=u.useMemo(()=>` (~${a*4} years)`,[a]);return r.jsxs(X,{children:[r.jsx("label",{htmlFor:"numberInput",children:j.epoch}),r.jsx(q,{autoComplete:"off",id:"numberInput",max:"30",min:"1",onChange:i,onKeyDown:w,type:"number",value:a}),o]})},Q=p.div`
  display: flex;
  justify-content: space-between;
  width: 100%;
  white-space: nowrap;
  align-items: baseline;
  gap: 0 5px;
`,Z=p.select`
  width: 100%;
  font-size: inherit;
`,E=p.input`
  max-width: 75px;
  font-size: inherit;
  width: 55px;
  min-width: 1px;
  flex-grow: 1;
  text-align: right;
`,W=p.div`
  flex-shrink: 1;
  display: flex;
  gap: 5px;
`,ee=()=>{const{setLoadingVolumeData:t}=k(),{minMaxMultiple:a,model:n,setMinMaxMultiple:s,setModel:i,setVariable:o,setLoadingPriceData:e,variable:l}=x(),c=u.useCallback(()=>{e(!0),t(!0)},[e,t]),h=u.useCallback(g=>{const m=g.target.value;n!==m&&(c(),i(m),b[m].varInput!==""&&o(b[m].default))},[n,c,i,o]),v=u.useCallback(g=>{const m=Number.parseFloat(g.target.value);m<=b[n].rangeMax&&m>=b[n].rangeMin&&(o(m),c())},[c,o]),y=u.useCallback(g=>{const m=Number.parseFloat(g.target.value);m<1.01?s(1.01):s(m),c()},[c,o]),O=b[n].varInput!=="",T=b[n].varRange;return r.jsxs(Q,{children:[r.jsx(Z,{id:"modelInput",onChange:h,onKeyDown:w,value:n,children:B.map(g=>r.jsx("option",{value:g.modelType,children:g.modelType},g.modelType))}),r.jsxs(W,{children:[O&&r.jsxs(r.Fragment,{children:[r.jsx("label",{htmlFor:"modelVariable",children:b[n].varInput}),r.jsx(E,{autoComplete:"off",id:"modelVariable",onChange:v,onKeyDown:w,step:"1",type:"number",value:l,min:b[n].rangeMin,max:b[n].rangeMax})]}),T&&r.jsxs(r.Fragment,{children:[r.jsx("label",{htmlFor:"minMaxMultiple",children:"+/-"}),r.jsx(E,{autoComplete:"off",id:"minMaxMultiple",onChange:y,onKeyDown:w,step:".1",min:"1.01",type:"number",value:a})]})]})]})},ne=p.div`
  display: flex;
  justify-content: space-between;
  width: 100%;
  white-space: nowrap;
  align-items: baseline;
  gap: 0 5px;
  padding-right: 5px;
`,te=p.input`
  max-width: 75px;
  font-size: inherit;
`,ae=()=>{const{setLoadingVolumeData:t}=k(),{samples:a,setLoadingPriceData:n,setSamples:s}=x(),i=u.useCallback(o=>{if(o.target.value===""){s(1e3);return}const e=Number.parseInt(o.target.value,10);e>=0&&e<=L&&(n(!0),t(!0),s(e))},[n,t,s]);return r.jsxs(ne,{children:[r.jsx("label",{htmlFor:"sampleInput",children:j.samples}),r.jsx(te,{autoComplete:"off",id:"sampleInput",max:L,min:"1",onChange:i,onKeyDown:w,type:"number",value:a})]})},oe=p.div`
  display: flex;
  justify-content: space-between;
  width: 100%;
  white-space: nowrap;
  align-items: baseline;
  gap: 0 5px;
  padding-right: 5px;
`,se=p.input`
  max-width: 75px;
  font-size: inherit;
`,le=()=>{const{setLoadingVolumeData:t}=k(),{setLoadingPriceData:a,setVolatility:n,volatility:s,walk:i}=x(),o=u.useCallback(l=>{const c=Number.parseFloat(l.target.value);c>=0&&c<=1&&(a(!0),t(!0),n(c))},[a,t,n]),e=u.useMemo(()=>i==="Bubble"?.005:.001,[i]);return r.jsxs(oe,{children:[r.jsx("label",{htmlFor:"volInput",children:j.vol}),r.jsx(se,{autoComplete:"off",id:"volInput",max:"1",min:"0",onChange:o,onKeyDown:w,step:e,type:"number",value:s})]})};let C=0,I=!1,M=0,D=1;const ie=({clampBottom:t=!1,clampTop:a=!1,start:n=.5,startWeek:s=0,volatility:i=.1})=>{const o=i*2,e=new Float64Array(d);e[s]=n;let l=n;M=t?M=0:M=-Math.random()*o,D=a?D=1:D=1+Math.random()*o,I||(C=(l-.5)*.01);for(let c=s+1;c<d;c++){const h=(Math.random()-.5)*i;if(l<=M||l>=D){I=!0,l=l<=M?M:D;const y=.02*(1+Math.abs(l-.5));C=l<.5?y:-y,t||(M=-Math.random()*o),a||(D=1+Math.random()*o)}I?(C*=.95,Math.abs(l-.5)<.01&&Math.abs(C)<.001&&(I=!1,C=Math.random()>.5?.001:-.001)):C+=(l-.5)*.01,l+=C+h,a&&l>1&&(l=1),t&&l<0&&(l=0),e[c]=l}return e},$=d/4,S=5e-4,K=S*$,re=({clampBottom:t=!1,clampTop:a=!1,start:n=0,startWeek:s=0,volatility:i=.07})=>{const o=new Float64Array(d);o[s]=n;let e=n;const l=s/$;let c=l<1?"ascent":l<3?"descent":"base",h=c==="ascent"?s*S:c==="descent"?K-S*(s-$):0;for(let v=s+1;v<d;v++){const y=(Math.random()-.5)*i;switch(c){case"base":{e+=y,e<.3&&(e+=.01),e>.1&&(e-=.01);break}case"ascent":{e+=h+y,h+=S,e>=1&&(h=K/3,c="descent");break}case"descent":{e-=Math.abs(h)+y,e<=0&&(c="base",h=0);break}}a&&e>1&&(e=1),t&&e<0&&(e=0),o[v]=e}return o},ce=({clampBottom:t=!1,clampTop:a=!1,start:n=0,startWeek:s=0,volatility:i=.07})=>{const o=new Float64Array(d);o[s]=n;let e=n,l=0;s<f?n<1&&(l=(1-n)/(f-s)):s<f*2?n>0&&(l=(0-n)/(f-s%f)):n<1&&(l=(1-n)/(f*4-s));for(let c=s+1;c<d;c++)c===f&&e>0?l=(0-e)/f:c===f*2&&e<1&&(l=(1-e)/(f*3)),l>0&&e>1&&(l=0),l<0&&e<0&&(l=0),e+=l+(Math.random()-.5)*i,a&&e>1&&(e=1),t&&e<0&&(e=0),o[c]=e;return o},de=({clampBottom:t=!1,clampTop:a=!1,start:n=0,startWeek:s=0,volatility:i=.07})=>{const o=new Float64Array(d);o[s]=n;let e=n;const l=.003;for(let c=s+1;c<d;c++){const h=(Math.random()-.5)*i;e-=h+l,a&&e>1&&(e=1),t&&e<0&&(e=0),o[c]=e,e<=0&&(e=1)}return o};let V="descent";const pe=({clampBottom:t=!1,clampTop:a=!1,start:n=0,startWeek:s=0,volatility:i=.07})=>{const o=new Float64Array(d);o[s]=n;let e=n;for(let l=s+1;l<d;l++){const c=(Math.random()-.5)*i;switch(V){case"ascent":{e+=c+Math.random()*.005,e>=1&&(V="descent");break}case"descent":{e-=c+Math.random()*.005,e<=0&&(V="ascent");break}}a&&e>1&&(e=1),t&&e<0&&(e=0),o[l]=e}return o},ue=({clampBottom:t=!1,clampTop:a=!1,start:n=0,startWeek:s=0,volatility:i=.07})=>{const o=new Float64Array(d);o[s]=n;let e=n;for(let l=s+1;l<d;l++){const c=(Math.random()-.5)*i;e+=c,a&&e>1&&(e=1),t&&e<0&&(e=0),o[l]=e}return o},he=({clampBottom:t=!1,clampTop:a=!1,start:n=0,startWeek:s=0,volatility:i=.07})=>{const o=new Float64Array(d);o[s]=n;let e=n,l=.01;for(let c=s+1;c<d;c++)l=.0025+(Math.random()-.5)*i,e+=l,(e>=1+i*100*Math.random()||a&&e>=1)&&(e=t?0:0-i*10*Math.random()),a&&e>1&&(e=1),t&&e<0&&(e=0),o[c]=e;return o};let F=1.025;const me=({clampBottom:t=!1,clampTop:a=!1,start:n=0,startWeek:s=0,volatility:i=.1})=>{const o=new Float64Array(d);o[s]=n;let e=n;for(let l=s+1;l<d;l++){const c=(Math.random()-.5)*i;e*=F,e+=c,e>=1+i*10*Math.random()||a&&e>1?F=.975:e<=.001&&(e=-e,F=1.025),a&&e>1&&(e=1),t&&e<0&&(e=0),o[l]=e}return o},fe=({clampBottom:t=!1,clampTop:a=!1,start:n=.5,startWeek:s=0,volatility:i=.07})=>{const o=new Float64Array(d);o[s]=n;let e=n,l=.01;for(let c=s+1;c<d;c++){const h=(Math.random()-.5)*i;l=.01*Math.sin(2*Math.PI*c/d)+h,e+=l,a&&e>1&&(e=1),t&&e<0&&(e=0),o[c]=e}return o},A={Bubble:re,Momentum:ie,Pong:pe,Random:ue,Saw:he,Shark:me,Sin:fe,"Vote Count":de,"🟢🟢🟢🔴":ce},xe=p.div`
  display: flex;
  justify-content: space-between;
  width: 100%;
  white-space: nowrap;
  align-items: baseline;
  gap: 0 5px;
  padding-right: 5px;
`,ge=p.select`
  width: 100%;
  font-size: inherit;
`,be=()=>{const{setLoadingVolumeData:t}=k(),{setLoadingPriceData:a,setWalk:n,walk:s}=x(),i=u.useCallback(o=>{const e=o.target.value;Object.keys(A).includes(e)&&(n(e),a(!0),t(!0))},[a,t,n]);return r.jsxs(xe,{children:[r.jsx("label",{htmlFor:"walkInput",children:j.walk}),r.jsx(ge,{id:"walkInput",onChange:i,onKeyDown:w,value:s,children:Object.keys(A).map(o=>r.jsx("option",{value:o,children:o},o))})]})},we=t=>{var s;let a=0;const n=8;for(const i of t)a+=(((s=i.label)==null?void 0:s.length)??0)*2,i.yAxisID!==void 0&&(a+=i.yAxisID.length*2),a+=n,a+=n,i.borderWidth!==void 0&&(a+=n),i.borderDash!==void 0&&(a+=i.borderDash.length*n),a+=i.data.length*(n*2),typeof i.fill=="string"?a+=i.fill.length*2:typeof i.fill=="boolean"&&(a+=4);return a/(1024*1024)},ye=()=>{const{dataProperties:t}=R(),{epochCount:a,samples:n}=x();return u.useMemo(()=>8*d*a*n*2/(1024*1024)+we((t==null?void 0:t.datasets)??[]),[t==null?void 0:t.datasets,a,n])},Ce=p.span`
  color: ${({$memoryUsageMB:t})=>t>1024?"red":t>256?"yellow":"inherit"};
`,z=()=>{const{dataLength:t}=R(),{loadingPriceData:a,samples:n}=x(),s=n*t*2,i=ye(),o=`${s.toLocaleString()} data points @`,e=`~${i.toFixed(0)} MB`;return a||n===0?r.jsx(G,{}):r.jsxs(r.Fragment,{children:[r.jsx("span",{children:o}),r.jsx(Ce,{$memoryUsageMB:i,children:e})]})},Me=p.div`
  display: flex;
  gap: 0 5px;
  justify-content: flex-end;
  color: grey;
  font-size: small;
  margin-top: -19px;
  padding-right: 4px;

  z-index: 12;
`,je=({isExpanded:t})=>{const{model:a,walk:n}=x(),[s,i]=u.useState(r.jsx(z,{}));return u.useEffect(()=>{const o=setTimeout(()=>{const e=`${a} • ${n}`;i(t?r.jsx(z,{}):r.jsx("span",{children:e}))},200);return()=>{clearTimeout(o)}},[t,a,n]),r.jsx(Me,{children:s})},ke=p.div``,ve=p.fieldset`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-around;
  border: 1px solid gray;
  gap: 10px;
  padding-left: 10px;
  padding-right: 10px;
  padding-top: 5px;
  max-height: ${({$isOpen:t})=>t?"220px":"22px"};
  padding-bottom: ${({$isOpen:t})=>t?"10px":"0px"};
  margin-bottom: ${({$isOpen:t})=>t?"20px":"0px"};
  overflow: hidden;
  transition:
    max-height 0.4s ease-in-out,
    padding-bottom 0.4s ease-in-out,
    margin-bottom 0.4s ease-in-out,
    -webkit-backdrop-filter 0.4s ease-in-out,
    backdrop-filter 0.4s ease-in-out;
  backdrop-filter: blur(${({$isOpen:t})=>t?"4px":"0px"});
  -webkit-backdrop-filter: blur(${({$isOpen:t})=>t?"4px":"0px"});
  background-color: rgba(36, 36, 36, 0.5);
`,De=p.legend`
  cursor: pointer;
  padding-inline-start: 10px;
  padding-inline-end: 7px;
`,Fe=()=>{const{setShowModel:t,showModel:a}=x(),{setShowRender:n,showRender:s}=N(),{setShowDrawdown:i}=k(),o=u.useCallback(()=>{a?P()&&i(!0):P()&&(s&&n(!1),i(!1)),t(!a)},[a,t,i,s,n]);return r.jsxs(ke,{$isOpen:a,children:[r.jsxs(ve,{$isOpen:a,children:[r.jsxs(De,{onClick:o,children:[_.model,r.jsx(U,{$isOpen:a})]}),r.jsx(ee,{}),r.jsx(be,{}),r.jsx(Y,{}),r.jsx(le,{}),r.jsx(J,{}),r.jsx(ae,{})]}),r.jsx(je,{isExpanded:a})]})};export{Fe as default};
