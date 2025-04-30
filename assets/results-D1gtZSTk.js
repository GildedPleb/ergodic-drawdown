import{d as b,r as o,a as H,g as E,b as O,u as _,ac as I,a5 as K,j as s,C as U}from"./index-CAk_kTyU.js";import{L as q}from"./loading-Dj6wbtuU.js";const A=b.fieldset`
  position: absolute;
  cursor: ${({$isDragging:t})=>t?"grabbing":"grab"};
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  background-color: rgba(36, 36, 36, 0.5);
  border-radius: 2px;
  border: 1px solid grey;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  z-index: 3;
  font-size: 0.8rem;
  padding-left: 10px;
  padding-right: 10px;
  padding-top: 5px;
  max-height: ${({$isOpen:t})=>t?"175px":"22px"};
  max-width: ${({$isOpen:t})=>t?"350px":"100px"};
  min-width: 100px;
  padding-bottom: ${({$isOpen:t})=>t?"10px":"0px"};
  margin-bottom: 20px;
  overflow: hidden;
  transition:
    max-height 0.4s ease-in-out,
    padding-bottom 0.4s ease-in-out,
    margin-bottom 0.4s ease-in-out,
    max-width 0.4s ease-in-out;

  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
`,J=b.div`
  position: absolute;
`,Q=b.legend`
  padding-inline-start: 10px;
  padding-inline-end: 7px;
  cursor: pointer;
  font-size: 1rem;
`,Z=b.div`
  padding-right: 4px;
`,oe=()=>{const[t,N]=o.useState({x:window.innerWidth/8,y:window.innerHeight/2}),[i,w]=o.useState(!1),r=o.useRef(null),{hideResults:R,setShowResults:v,showResults:u}=H(),{simulationStats:$,volumeStats:d,zeroCount:k}=E(),l=d===null?0:d.average,h=d===null?0:d.median,y=k===null?0:k.zero,{bitcoin:p,inflation:M,loadingVolumeData:x}=O(),{model:C,samples:c,walk:D}=_(),L=I(),{dataLength:z}=E(),a=new Date(L+z*K).toDateString().slice(-4),P=o.useMemo(()=>x||c===0?s.jsx(q,{}):`${(100-y/c*100).toFixed(2)}% chance of not exhausting bitcoin holdings ${a===""?a:"by "+a}
        with an average of ${Number.isNaN(l)?p:l.toFixed(4)} Bitcoin left
        (median ${Number.isNaN(h)?p:h.toFixed(4)}),
        expecting ${M}% inflation per year,
        assuming ${C} modeling and a ${D} walk strategy.`,[x,y,a,l,p,h,M,C,D,c]),S=(Number.isNaN(l)?p:l)*($===null?0:$.average),T=o.useMemo(()=>x||c===0?s.jsx("div",{}):`Remaining average worth $${Number(S.toFixed(2)).toLocaleString()}
        in ${a} dollars`,[S,a,x,c]),g=o.useCallback((e,n)=>{w(!0),r.current={x:e-t.x,y:n-t.y}},[t.x,t.y]),m=o.useCallback((e,n)=>{i&&r.current!==null&&N({x:e-r.current.x,y:n-r.current.y})},[i]),f=o.useCallback(()=>{w(!1),r.current=null},[]),F=o.useCallback(e=>{e.preventDefault(),e.stopPropagation(),g(e.clientX,e.clientY)},[g]);o.useEffect(()=>{const e=j=>{m(j.clientX,j.clientY)},n=()=>{f()};return i&&(window.addEventListener("mousemove",e),window.addEventListener("mouseup",n)),()=>{window.removeEventListener("mousemove",e),window.removeEventListener("mouseup",n)}},[i,m,f]);const V=o.useCallback(e=>{e.stopPropagation();const n=e.touches[0];g(n.clientX,n.clientY)},[g]),W=o.useCallback(e=>{const n=e.touches[0];m(n.clientX,n.clientY)},[m]),X=o.useCallback(e=>{e.stopPropagation(),e.preventDefault()},[]),Y=o.useCallback(e=>{e.stopPropagation(),e.preventDefault(),v(!u)},[u,v]),G=o.useMemo(()=>({left:`${t.x}px`,top:`${t.y}px`}),[t.x,t.y]),B="Results";return R?s.jsx(J,{}):s.jsxs(A,{$isDragging:i,$isOpen:u,onMouseDown:F,onTouchEnd:f,onTouchMove:W,onTouchStart:V,style:G,children:[s.jsxs(Q,{onClick:Y,onMouseDown:X,children:[B,s.jsx(U,{$isOpen:u})]}),s.jsxs(Z,{children:[s.jsx("span",{children:P}),s.jsx("br",{}),s.jsx("br",{}),s.jsx("span",{children:T})]})]})};export{oe as default};
