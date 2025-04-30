import{l as w,d as o,a as r,r as a,j as e,i as l,u as j,b as m,h as k,k as p,C as y}from"./index-CAk_kTyU.js";import{h as c}from"./enter-D20OlzjC.js";const b=s=>w.includes(s),C=o.div`
  display: flex;
  justify-content: space-between;
  width: 100%;
  white-space: nowrap;
  align-items: baseline;
  gap: 0 5px;
  padding-right: 5px;
`,R=o.select`
  width: 100%;
  font-size: inherit;
`,D=()=>{const{renderDrawdownDistribution:s,setRenderDrawdownDistribution:t}=r(),i=a.useCallback(n=>{const d=n.target.value;b(d)&&t(d)},[t]);return e.jsxs(C,{children:[e.jsx("label",{htmlFor:"drawdownDistributionSelect",children:l.distributions}),e.jsx(R,{id:"drawdownDistributionSelect",onChange:i,onKeyDown:c,value:s,children:w.map(n=>e.jsx("option",{value:n,children:n},n))})]})},M=o.div`
  display: flex;
  justify-content: space-between;
  width: 100%;
  white-space: nowrap;
  align-items: baseline;
  gap: 0 5px;
  padding-right: 5px;
  flex: 0 1;
`,v=()=>{const{renderDrawdownWalks:s,setRenderDrawdownWalks:t}=r(),i=a.useCallback(n=>{t(n.target.checked)},[t]);return e.jsxs(M,{children:[e.jsx("input",{autoComplete:"off",checked:s,id:"renderDrawdown",onChange:i,onKeyDown:c,type:"checkbox"}),e.jsx("label",{htmlFor:"renderDrawdown",children:l.renderDrawdown})]})},S=o.div`
  display: flex;
  justify-content: space-between;
  width: 100%;
  white-space: nowrap;
  align-items: baseline;
  gap: 0 5px;
  padding-right: 5px;
  flex: 0 1;
`,$=()=>{const{setShowHistoric:s,showHistoric:t}=r(),i=a.useCallback(n=>{s(n.target.checked)},[s]);return e.jsxs(S,{children:[e.jsx("label",{htmlFor:"showHistoric",children:l.historic}),e.jsx("input",{autoComplete:"off",checked:t,id:"showHistoric",onChange:i,onKeyDown:c,type:"checkbox"})]})},W=o.div`
  display: flex;
  justify-content: space-between;
  width: 100%;
  white-space: nowrap;
  align-items: baseline;
  gap: 0 5px;
  padding-right: 5px;
  flex: 0 1;
`,F=()=>{const{renderModelMax:s,setRenderModelMax:t}=r(),i=a.useCallback(n=>{t(n.target.checked)},[t]);return e.jsxs(W,{children:[e.jsx("label",{htmlFor:"renderModelMax",children:l.renderModelMax}),e.jsx("input",{autoComplete:"off",checked:s,id:"renderModelMax",onChange:i,onKeyDown:c,type:"checkbox"})]})},K=o.div`
  display: flex;
  justify-content: space-between;
  width: 100%;
  white-space: nowrap;
  align-items: baseline;
  gap: 0 5px;
  padding-right: 5px;
  flex: 0 1;
`,I=()=>{const{renderModelMin:s,setRenderModelMin:t}=r(),i=a.useCallback(n=>{t(n.target.checked)},[t]);return e.jsxs(K,{children:[e.jsx("label",{htmlFor:"renderModelMin",children:l.renderModelMin}),e.jsx("input",{autoComplete:"off",checked:s,id:"renderModelMin",onChange:i,onKeyDown:c,type:"checkbox"})]})},P=o.div`
  display: flex;
  justify-content: space-between;
  width: 100%;
  white-space: nowrap;
  align-items: baseline;
  gap: 0 5px;
  padding-right: 5px;
`,H=o.select`
  width: 100%;
  font-size: inherit;
`,E=()=>{const{renderPriceDistribution:s,setRenderPriceDistribution:t}=r(),i=a.useCallback(n=>{const d=n.target.value;b(d)&&t(d)},[t]);return e.jsxs(P,{children:[e.jsx("label",{htmlFor:"distributionSelect",children:l.distributions}),e.jsx(H,{id:"distributionSelect",onChange:i,onKeyDown:c,value:s,children:w.map(n=>e.jsx("option",{value:n,children:n},n))})]})},T=o.div`
  display: flex;
  justify-content: space-between;
  width: 100%;
  white-space: nowrap;
  align-items: baseline;
  gap: 0 5px;
  padding-right: 5px;
  flex: 0 1;
`,z=()=>{const{renderPriceWalks:s,setRenderPriceWalks:t}=r(),i=a.useCallback(n=>{t(n.target.checked)},[t]);return e.jsxs(T,{children:[e.jsx("input",{autoComplete:"off",checked:s,id:"renderWalk",onChange:i,onKeyDown:c,type:"checkbox"}),e.jsx("label",{htmlFor:"renderWalk",children:l.renderWalk})]})},L=o.div`
  display: flex;
  justify-content: space-between;
  width: 100%;
  white-space: nowrap;
  align-items: baseline;
  gap: 0 5px;
  padding-right: 5px;
  flex: 0 1;
`,O=()=>{const{hideResults:s,setHideResults:t}=r(),i=a.useCallback(n=>{t(!n.target.checked)},[t]);return e.jsxs(L,{children:[e.jsx("label",{htmlFor:"showResults",children:l.showResults}),e.jsx("input",{autoComplete:"off",checked:!s,id:"showResults",onChange:i,onKeyDown:c,type:"checkbox"})]})},V=o.div`
  display: flex;
  justify-content: space-between;
  width: 100%;
  white-space: nowrap;
  align-items: center;
  gap: 0 5px;
  padding-right: 5px;
  flex: 0 1;
`,A=o.input`
  max-width: 75px;
  font-size: inherit;
`,G=()=>{const{renderDrawdownWalks:s,renderPriceWalks:t,samplesToRender:i,setSamplesToRender:n}=r(),d=a.useCallback(g=>{if(g.target.value===""){n(void 0);return}const x=Number.parseInt(g.target.value,10);x>=0&&x<=100&&n(x)},[n]),f=!(t||s);return e.jsxs(V,{children:[e.jsx("label",{htmlFor:"sampleRenderInput",children:l.samplesToRender}),e.jsx(A,{autoComplete:"off",disabled:f,id:"sampleRenderInput",max:"100",onChange:d,onKeyDown:c,type:"number",value:i})]})},N=o.fieldset`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  border: 1px solid gray;
  gap: 10px;
  padding-left: 10px;
  padding-right: 10px;
  padding-top: 5px;
  max-height: ${({$isOpen:s})=>s?"240px":"22px"};
  padding-bottom: ${({$isOpen:s})=>s?"10px":"0px"};
  margin-bottom: 5px;
  overflow: hidden;
  transition:
    max-height 0.4s ease-in-out,
    padding-bottom 0.4s ease-in-out,
    margin-bottom 0.4s ease-in-out;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  background-color: rgba(36, 36, 36, 0.5);
`,h=o.legend`
  cursor: pointer;
  padding-inline-start: 10px;
  padding-inline-end: 7px;
`,u=o.fieldset`
  max-width: min(85vw, 1000px);
  display: flex;
  border: 1px solid gray;
  padding-left: 10px;
  padding-right: 10px;
  padding-bottom: 5px;
  flex-direction: row;
  align-content: baseline;
  flex-grow: 1;
  align-self: stretch;
  justify-content: flex-start;
  gap: 0px 10px;
`,q=o.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0px 10px;
`,Q=()=>{const{setShowRender:s,showRender:t}=r(),{setShowModel:i}=j(),{setShowDrawdown:n}=m(),d=a.useCallback(()=>{k()&&(n(!!t),i(!1)),s(!t)},[n,i,s,t]);return e.jsxs(N,{$isOpen:t,children:[e.jsxs(h,{onClick:d,children:[p.render,e.jsx(y,{$isOpen:t})]}),e.jsxs(u,{children:[e.jsx(h,{children:p.model}),e.jsx($,{}),e.jsx(F,{}),e.jsx(I,{})]}),e.jsxs(u,{children:[e.jsx(h,{children:p.price}),e.jsx(z,{}),e.jsx(E,{})]}),e.jsxs(u,{children:[e.jsx(h,{children:p.drawdown}),e.jsx(v,{}),e.jsx(D,{})]}),e.jsxs(q,{children:[e.jsx(G,{}),e.jsx(O,{})]})]})};export{Q as default};
