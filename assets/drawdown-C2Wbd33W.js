import{d,j as t,r as s,g as de,a5 as ue,a6 as _,b as M,a7 as L,a8 as pe,a9 as fe,i as X,h as J,aa as he,u as be,a as ge,k as xe,C as me}from"./index-CAk_kTyU.js";import{M as Q}from"./modal-Z0sQ-6yV.js";import{h as V}from"./enter-D20OlzjC.js";const P=d.button`
  align-self: flex-end;
  background-color: ${({$backgroundColor:e})=>e??"#007bff"};
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  text-decoration: none;
  padding: 10px 15px;
  font-size: 1rem;
  transition: all 0.3s ease;

  &:disabled {
    background-color: #cccccc;
    color: #666666;
    cursor: not-allowed;
    opacity: 0.7;
  }

  &:hover:not(:disabled) {
    background-color: #0056b3;
  }

  &:active:not(:disabled) {
    background-color: #004085;
  }
`,x={amountToday:"Amount Today:",amountTodayVariable:"Cost Today (USD):",annualAmount:"Annual Amount:",annualPercentChange:"Annual Percent Change:",btc:"BTC",btcWillingToSpend:"BTC Willing to Spend:",currency:"Currency:",currencyType:"Currency Type:",delay:"Delay (Weeks):",effectiveDate:"Effective Date:",endDate:"End Date (optional):",expense:"Expense:",input:{active:"Active:",close:"×",delete:"Remove",name:"Name:",placeholder:"Enter item name",save:"Save",type:"Type:"},start:"Start (%):",types:{oneOffFiatVariable:"One-Off Fiat Variable-Date",oneOffItem:"One-Off",reoccurringItem:"Reoccurring"},usd:"USD"},ye=d.div`
  display: flex;
  justify-content: space-between;
  width: 100%;
  white-space: nowrap;
  gap: 0 5px;
  padding-right: 5px;
`,we=d.label`
  display: block;
  color: white;
`,ve=d.div`
  display: flex;
  gap: 15px;
`,K=d.label`
  display: flex;
  align-items: center;
  gap: 5px;
  color: white;
  cursor: pointer;
`,H=d.input`
  cursor: pointer;
`,Z=({isFiat:e,onChange:n})=>t.jsxs(ye,{children:[t.jsx(we,{children:x.currency}),t.jsxs(ve,{children:[t.jsxs(K,{children:[t.jsx(H,{checked:e,name:"currencyType",onChange:n(!0),onKeyDown:V,type:"radio",value:"USD"}),x.usd]}),t.jsxs(K,{children:[t.jsx(H,{checked:!e,name:"currencyType",onChange:n(!1),onKeyDown:V,type:"radio",value:"BTC"}),x.btc]})]})]}),je=d.div`
  display: flex;
  justify-content: space-between;
  width: 100%;
  white-space: nowrap;
  gap: 0 5px;
  padding-right: 5px;
`,Ce=d.label`
  display: block;
  color: white;
`,ke=d.input`
  border: 1px solid grey;
  border-radius: 2px;
  background-color: #333;
  color: white;
  font-size: inherit;
  flex: 1;
  min-width: 0;
  max-width: ${({$isPercent:e,type:n})=>n===void 0?200:n==="number"&&e===!0?55:n==="number"?120:n==="date"?130:20}px;
`,k=({checked:e,isPercent:n,label:a,max:r,min:i,name:o,onChange:c,required:p,type:l,value:u})=>{const[h,y]=s.useState(!1),[v,g]=s.useState((u==null?void 0:u.toString())??""),m=s.useCallback(C=>{const N=C.target.value;g(N),c(C)},[c]),b=s.useCallback(()=>{y(!0),g((u==null?void 0:u.toString())??"")},[u]),f=s.useCallback(()=>{if(y(!1),l==="number"&&v!==""){const C=Number.parseFloat(v);if(!Number.isNaN(C)){const N=C.toString();g(N),c({target:{name:o,type:"number",value:N}})}}},[l,v,c,o]),w=l==="checkbox"?()=>{}:V,S=h?v:(u==null?void 0:u.toString())??"";return t.jsxs(je,{children:[t.jsx(Ce,{htmlFor:o,children:a}),t.jsx(ke,{$isPercent:n,checked:e,id:o,max:r,min:i,name:o,onBlur:f,onChange:m,onFocus:b,onKeyDown:w,required:p,type:l,value:S})]})},I=(e,n=0)=>{if(e===""||e===void 0)return n;const a=typeof e=="string"?Number.parseFloat(e):e;return Number.isNaN(a)?n:a},E=(e,n=!1)=>{if(e instanceof Date)return Number.isNaN(e.getTime())?n?new Date:void 0:e;if(e===void 0)return n?new Date:e;const[a,r,i]=e.split("-"),o=new Date(Number(a),Number(r)-1,Number(i));return Number.isNaN(o.getTime())?n?new Date:void 0:o},Se=(e,n,a)=>a==="checkbox"||a==="radio"&&e==="isFiat"?n:a==="number"?typeof n=="string"||typeof n=="number"?I(n):0:a==="date"?n===""||typeof n!="string"&&!(n instanceof Date)?void 0:E(n):n,Fe=(e,n)=>{const a={...e},r=new Date;r.setHours(0,0,0,0);const i=new Date(n);switch(a.type){case"oneOffFiatVariable":{const o=I(a.start,100);a.start=o<0||o>100?100:o,a.amountToday=I(a.amountToday),a.btcWillingToSpend=I(a.btcWillingToSpend);break}case"oneOffItem":{a.amountToday=I(a.amountToday);let o=E(a.effective,!0);o=o<r?r:o,o=o>i?i:o,a.effective=o;break}case"reoccurringItem":{let o=E(a.effective,!0);if(o=o<r?r:o,o=o>i?i:o,a.effective=o,console.log({end:a.end}),a.end!==void 0&&a.end!==""){let c=E(a.end,!1);c!==void 0&&(c=c<a.effective?a.effective:c,c=c>i?i:c),a.end=c}a.annualAmount=I(a.annualAmount),a.annualPercentChange=I(a.annualPercentChange);break}}return a},Te={active:!0,amountToday:0,btcWillingToSpend:0,delay:0,hash:"",id:"",name:"New Variable Item",start:100,type:"oneOffFiatVariable"},Oe={active:!0,amountToday:0,effective:new Date,expense:!0,id:"",isFiat:!0,name:"New Item",type:"oneOffItem"},De={active:!0,annualAmount:0,annualPercentChange:0,effective:new Date,expense:!0,id:"",isFiat:!0,name:"New Recurring Item",type:"reoccurringItem"},W={oneOffFiatVariable:Te,oneOffItem:Oe,reoccurringItem:De},z=e=>"annualAmount"in e?"reoccurringItem":"btcWillingToSpend"in e?"oneOffFiatVariable":"oneOffItem",Y=e=>{if(e===void 0)return W;const n=z(e),a={...W};return a[n]={...e,type:n},a},Ie=(e,n)=>{const{dataLength:a}=de(),r=Date.now()+(a-2)*ue,i=e===void 0?"oneOffFiatVariable":z(e),[o,c]=s.useState(i),[p,l]=s.useState(()=>Y(e));s.useEffect(()=>{if(e!==void 0){const g=z(e);c(g),l(Y(e))}},[e]);const u=s.useCallback(g=>{const{name:m,type:b}=g.target,f=b==="checkbox"||b==="radio"&&m==="isFiat"?g.target.checked:g.target.value;l(w=>{const S=Fe({...w[o],[m]:f},r),C=Se(m,S[m],b);return{...w,[o]:{...S,[m]:C}}})},[o]),h=s.useCallback(g=>{const m=g.target.value;c(m)},[n]),y=s.useCallback(()=>p[o],[p,o]),v=s.useCallback(()=>{l(W),c("oneOffFiatVariable")},[]);return{activeType:o,formStates:p,getActiveFormData:y,handleInputChange:u,handleTypeChange:h,resetForms:v}},Ne=d.div`
  display: flex;
  justify-content: space-between;
  width: 100%;
  white-space: nowrap;
  gap: 0 5px;
  padding-right: 5px;
`,Ve=d.label`
  display: block;
  color: white;
`,Ae=d.select`
  font-size: inherit;
  color: #ffffff;
  background-color: hsl(0, 0%, 14%);
`,Ee=({onChange:e,selectedType:n})=>t.jsxs(Ne,{children:[t.jsx(Ve,{htmlFor:"type",children:x.input.type}),t.jsx(Ae,{id:"type",name:"type",onChange:e,onKeyDown:V,value:n,children:Object.entries(x.types).map(([a,r])=>t.jsx("option",{value:a,children:r},a))})]}),Me=d.div`
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 10px;
`,Re=d.div`
  display: flex;
  justify-content: space-between;
  gap: 10px;
`,$e=d.div`
  color: grey;
  font-size: 0.8rem;
`,Be=({formData:e,handleInputChange:n})=>{var r,i;const a=s.useCallback(o=>c=>{n({...c,target:{...c.target,checked:o,name:"isFiat",type:"radio"}})},[n]);return t.jsxs(t.Fragment,{children:[t.jsx(Z,{isFiat:e.isFiat??!1,onChange:a}),t.jsx(k,{label:x.annualAmount,min:0,name:"annualAmount",onChange:n,type:"number",value:e.annualAmount}),t.jsx(k,{checked:e.expense,label:x.expense,name:"expense",onChange:n,type:"checkbox"}),t.jsx(k,{isPercent:!0,label:x.annualPercentChange,name:"annualPercentChange",onChange:n,type:"number",value:e.annualPercentChange}),t.jsx(k,{label:x.effectiveDate,name:"effective",onChange:n,required:!0,type:"date",value:(r=e.effective)==null?void 0:r.toISOString().split("T")[0]}),t.jsx(k,{label:x.endDate,name:"end",onChange:n,type:"date",value:(i=e.end)==null?void 0:i.toISOString().split("T")[0]})]})},Le=({formData:e,handleInputChange:n})=>{var r;const a=s.useCallback(i=>o=>{n({...o,target:{...o.target,checked:i,name:"isFiat",type:"radio"}})},[n]);return t.jsxs(t.Fragment,{children:[t.jsx(Z,{isFiat:e.isFiat??!1,onChange:a}),t.jsx(k,{label:x.amountToday,name:"amountToday",onChange:n,type:"number",value:e.amountToday}),t.jsx(k,{checked:e.expense,label:x.expense,name:"expense",onChange:n,type:"checkbox"}),t.jsx(k,{label:x.effectiveDate,name:"effective",onChange:n,type:"date",value:(r=e.effective)==null?void 0:r.toISOString().split("T")[0]})]})},Pe=({formData:e,handleInputChange:n})=>t.jsxs(t.Fragment,{children:[t.jsx(k,{label:x.amountTodayVariable,name:"amountToday",onChange:n,type:"number",value:e.amountToday}),t.jsx(k,{label:x.btcWillingToSpend,name:"btcWillingToSpend",onChange:n,type:"number",value:e.btcWillingToSpend}),t.jsx(k,{isPercent:!0,label:x.delay,name:"delay",onChange:n,type:"number",value:e.delay}),t.jsx(k,{isPercent:!0,label:x.start,max:100,min:0,name:"start",onChange:n,type:"number",value:e.start})]}),ee=({isOpen:e,item:n,onClose:a,onDelete:r,onSave:i})=>{const{activeType:o,formStates:c,getActiveFormData:p,handleInputChange:l,handleTypeChange:u,resetForms:h}=Ie(n),y=s.useCallback(()=>{const w=p();i(w),a(),h()},[i,p,a,h]),v=s.useCallback(()=>{r!==void 0&&r(),a(),h()},[r,a,h]),g=s.useCallback(()=>{a(),h()},[a,h]),m=n===void 0?"Add New Drawdown Event":`Edit ${x.types[o]} Drawdown Event`,b=r===void 0?t.jsx("div",{}):t.jsx(P,{$backgroundColor:"#ff005d",onClick:v,children:x.input.delete}),f=p();return t.jsxs(Q,{heading:m,isOpen:e,onClose:g,children:[t.jsxs(Me,{children:[n===void 0&&t.jsx(Ee,{onChange:u,selectedType:o}),t.jsx(k,{label:x.input.name,name:"name",onChange:l,value:f.name}),n!==void 0&&t.jsx(k,{checked:f.active,label:x.input.active,name:"active",onChange:l,type:"checkbox"}),o==="reoccurringItem"&&t.jsx(Be,{formData:c.reoccurringItem,handleInputChange:l}),o==="oneOffItem"&&t.jsx(Le,{formData:c.oneOffItem,handleInputChange:l}),o==="oneOffFiatVariable"&&t.jsx(Pe,{formData:c.oneOffFiatVariable,handleInputChange:l}),t.jsx($e,{children:_(f)})]}),t.jsxs(Re,{children:[b,t.jsx(P,{onClick:y,children:x.input.save})]})]})},We=d.div`
  display: flex;
  flex-direction: column;
  max-width: 85vw;
  overflow: scroll;
`,ze=d.div``,Ue=d.h2`
  color: #888;
`,Ke=d.div`
  display: flex;
  align-items: center;
  padding: 10px;
  border-bottom: 1px solid #333;
  overflow: hidden;
  white-space: nowrap;
`,He=d.div`
  flex-shrink: 0;
  margin-right: 10px;
`,Ye=d.div`
  display: flex;
  align-items: center;
  flex-grow: 1;
  min-width: 0;
  margin-right: 10px;
`,Ge=d.div`
  flex-shrink: 0;
`,qe=d.input.attrs({type:"checkbox"})`
  margin-right: 10px;
  flex-shrink: 0;
  cursor: pointer;
`,_e=d.span`
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #888;
  font-size: 0.8rem;
`,Xe=d.span`
  color: #f3f3f3;
  font-size: 1rem;
`,Je=d.span`
  margin-left: 8px;
`,Qe=d.button`
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.6rem;
  padding: 5px;
  flex-shrink: 0;
  text-decoration: none;
`,Ze={delete:"❌"},et=({item:e,onDelete:n,onEdit:a,onToggleActive:r})=>{const[i,o]=s.useState(!1),c=` "${_(e)}"`,p=s.useCallback(()=>{r(e.id)},[e.id,r]),l=s.useCallback(()=>{n(e.id)},[e.id,n]),u=s.useCallback(()=>{o(!0)},[]),h=s.useCallback(()=>{o(!1)},[]),y=s.useCallback(v=>{a(v),h()},[h,a]);return t.jsxs(t.Fragment,{children:[t.jsxs(Ke,{children:[t.jsx(He,{children:t.jsx(qe,{checked:e.active,onChange:p})}),t.jsx(Ye,{tabIndex:0,children:t.jsxs(_e,{onClick:u,children:[t.jsx(Xe,{children:e.name}),t.jsx(Je,{children:c})]})}),t.jsx(Ge,{children:t.jsx(Qe,{onClick:l,title:"Delete",children:Ze.delete})})]}),i&&t.jsx(ee,{isOpen:i,item:e,onClose:h,onDelete:l,onSave:y})]})},$=({items:e,onDelete:n,onEdit:a,onToggleActive:r,title:i})=>t.jsxs(ze,{children:[t.jsx(Ue,{children:i}),e.map(o=>t.jsx(et,{item:o,onDelete:n,onEdit:a,onToggleActive:r},o.id))]}),tt=()=>{const{oneOffFiatVariables:e,oneOffItems:n,reoccurringItems:a,setOneOffFiatVariables:r,setOneOffItems:i,setReoccurringItems:o}=M(),c=s.useCallback((h,y)=>({deleteItem:b=>{y(h.filter(f=>f.id!==b))},onEdit:b=>{y(h.map(f=>f.id!==b.id?f:"btcWillingToSpend"in b?{...f,...b,hash:L({amountToday:b.amountToday,btcWillingToSpend:b.btcWillingToSpend,delay:b.delay,start:b.start})}:{...f,...b}))},toggleActive:b=>{y(h.map(f=>f.id===b?{...f,active:!f.active}:f))}}),[]),p=c(a,o),l=c(n,i),u=c(e,r);return t.jsxs(We,{children:[a.length>0&&t.jsx($,{items:a,onDelete:p.deleteItem,onEdit:p.onEdit,onToggleActive:p.toggleActive,title:"Reoccurring"}),n.length>0&&t.jsx($,{items:n,onDelete:l.deleteItem,onEdit:l.onEdit,onToggleActive:l.toggleActive,title:"One-Off"}),e.length>0&&t.jsx($,{items:e,onDelete:u.deleteItem,onEdit:u.onEdit,onToggleActive:u.toggleActive,title:"Variable"})]})},nt=d.span`
  color: #ffc107;
  font-size: 20px;
`,at=d.strong`
  align-self: flex-end;
`,G=d.input`
  padding: 10px;
  margin-bottom: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
`,ot=d.div`
  background-color: rgba(255, 193, 7, 0.2);
  border: 1px solid #ffc107;
  border-radius: 4px;
  padding: 20px;
  margin-bottom: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
`,st={buttonText:"Load",heading:"Load Secure File",placeholder:"Enter Decrypt Password"},A={author:"- Lopp",message:"Your data on this app is sensitive. We do not receive, transmit, read or otherwise have access to any of this data (See Privacy Policy and review the Source Code to confirm). As such, to save your work, it must be saved locally. AES-256 encryption required.",quote:'"It is good to talk about Bitcoin. It is not good to talk about YOUR Bitcoin."',strongMessage:"Use a strong password and manage it well.",warning:"⚠️"},rt={buttonText:"Save",heading:"Save Secure File",placeholder:"Enter Encrypt Password"},it=({appState:e,mode:n,onClose:a,setAppState:r})=>{const[i,o]=s.useState(""),[c,p]=s.useState(null),l=s.useCallback(()=>{o(""),p(null),a()},[a]),u=s.useCallback(async()=>{const f=await pe(e,i??""),w=new Blob([f],{type:"application/octet-stream"}),S=URL.createObjectURL(w),C=document.createElement("a");C.href=S,C.download=`ergodic-drawdown-${new Date().toLocaleDateString()}.edw`,document.body.append(C),C.click(),C.remove(),URL.revokeObjectURL(S),l()},[e,i,l]),h=s.useCallback(async()=>{if(c!==null)try{const f=await c.arrayBuffer(),w=new Uint8Array(f),S=await fe(w,i??"");r(S),l()}catch(f){console.error("Error loading file:",f),alert("Failed to load file. Incorrect password or corrupted file.")}},[c,i,r,l]),y=s.useCallback(f=>{var S;const w=(S=f.target.files)==null?void 0:S[0];w!==void 0&&p(w)},[]),v=s.useCallback(f=>{o(f.target.value)},[]),g=n==="save"?u:h,m=n==="save"?rt:st,b=s.useCallback(()=>{g().catch(console.error)},[g]);return t.jsxs(Q,{heading:m.heading,isOpen:!!n,onClose:l,children:[n==="save"&&t.jsxs(ot,{children:[t.jsx(nt,{children:A.warning}),t.jsx("strong",{children:A.quote}),t.jsx(at,{children:A.author}),t.jsx("span",{children:A.message}),t.jsx("strong",{children:A.strongMessage})]}),n==="load"&&t.jsx(G,{accept:".edw",onChange:y,type:"file"}),t.jsx(G,{onChange:v,placeholder:m.placeholder,type:"password",value:i}),t.jsx(P,{disabled:i===""||i===void 0||n==="load"&&c===null,onClick:b,children:m.buttonText})]})},lt=d.div`
  display: flex;
  justify-content: space-between;
  white-space: nowrap;
  align-items: baseline;
  gap: 0 5px;
  padding-right: 5px;
`,ct=d.input`
  max-width: 75px;
  font-size: inherit;
`,dt=()=>{const{bitcoin:e,setBitcoin:n,setLoadingVolumeData:a}=M(),[r,i]=s.useState(e.toString());s.useEffect(()=>{e!==Number(r)&&i(String(e))},[e,r]);const o=s.useCallback(p=>{const l=p.target.value;if(i(l),l==="")return;const u=Number.parseFloat(l);!Number.isNaN(u)&&u>=0&&(n(u),a(!0))},[n,a]),c=s.useCallback(()=>{if(r===""){i("0"),n(0),a(!0);return}const p=Number.parseFloat(r);if(!Number.isNaN(p)){const l=Math.max(0,p),u=l.toString();i(u),n(l),a(!0)}},[r,n,a]);return t.jsxs(lt,{children:[t.jsx("label",{htmlFor:"totalBitcoin",children:X.totalBitcoin}),t.jsx(ct,{autoComplete:"off",id:"totalBitcoin",min:"0",onBlur:c,onChange:o,onKeyDown:V,step:".1",type:"number",value:r})]})},ut=d.div`
  display: flex;
  justify-content: space-between;
  white-space: nowrap;
  align-items: center;
  gap: 0 5px;
  padding-right: 5px;
`,pt=d.input`
  max-width: 40px;
  font-size: 1rem;
`,ft=()=>{const{inflation:e,setInflation:n,setLoadingVolumeData:a}=M(),[r,i]=s.useState(e.toString());s.useEffect(()=>{e!==Number(r)&&i(String(e))},[e,r]);const o=s.useCallback(p=>{const l=p.target.value;if(i(l),l==="")return;const u=Number.parseFloat(l);Number.isNaN(u)||(n(u),a(!0))},[n,a]),c=s.useCallback(()=>{if(r===""){i("8"),n(8),a(!0);return}const p=Number.parseFloat(r);if(!Number.isNaN(p)){const l=p.toString();i(l),n(p),a(!0)}},[r,n,a]);return t.jsxs(ut,{children:[t.jsx("label",{htmlFor:"inflation",children:X.inflation}),t.jsx(pt,{autoComplete:"off",id:"inflation",onBlur:c,onChange:o,onKeyDown:V,placeholder:"%",step:"1",type:"number",value:r})]})},ht="➕",bt="💾",gt="📂",xt=d.fieldset`
  height: calc(${J()?"50vh":"39vh"} - 117px);
  max-height: ${({$guessHeight:e,$isOpen:n})=>n?e:"20"}px;

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;

  border: 1px solid gray;
  padding-left: 10px;
  padding-right: 10px;
  padding-top: 0px;
  padding-bottom: 10px;
  margin-bottom: -1px;
  overflow: scroll;
  position: relative;
  z-index: 1;
  transition: max-height 0.4s ease-in-out;

  /* Hide scrollbar on close */
  ${({$isOpen:e})=>e?"":he`
          overflow-y: auto;
          -ms-overflow-style: none;
          scrollbar-width: none;

          &::-webkit-scrollbar {
            display: none;
          }
        `}
`,mt=d.legend`
  cursor: pointer;
  padding-inline-start: 10px;
  padding-inline-end: 7px;
`,yt=d.div`
  width: 100%;
  min-height: 10px;
  background-color: hsl(0, 0%, 14%);
  position: sticky;
  top: 0px;
  transform: translateY(-1px);
  z-index: 2;
`,te=d.section`
  display: flex;
  flex-wrap: wrap;
  flex-direction: column;
  align-items: flex-start;
  flex: 1;
  gap: 10px;
`,q=d(te)`
  flex-direction: row;
  justify-content: center;
  align-items: center;
  gap: 10px;
  position: sticky;
  top: 10px;
  background-color: hsl(0, 0%, 14%);
  padding-bottom: 10px;
  border-bottom: 1px solid #333;
  transform: translateY(-1px);
  width: 100%;
  max-height: 30px;
`,B=d.button`
  background-color: transparent;
  text-decoration: none;
  width: 30px;
  height: 30px;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0px;
  /* border: 1px solid red; */
`,Ct=()=>{const e=be(),n=M(),a=ge(),{oneOffFiatVariables:r,oneOffItems:i,reoccurringItems:o,setOneOffFiatVariables:c,setOneOffItems:p,setReoccurringItems:l,setShowDrawdown:u,showDrawdown:h}=n,{setShowRender:y}=a,{setShowModel:v}=e,g=s.useMemo(()=>({...e,...n,...a}),[n,e,a]),[m,b]=s.useState(!1),[f,w]=s.useState(null),C=(r.length+i.length+o.length)*55+240,N=s.useCallback(()=>{b(!0)},[]),U=s.useCallback(()=>{b(!1)},[]),ne=s.useCallback(F=>{const O=(j,T)=>Object.fromEntries(Object.entries(j).filter(([R])=>T.includes(R))),D=L(Date.now());switch(F.type){case"oneOffFiatVariable":{const j=O(F,["active","id","name","amountToday","btcWillingToSpend","delay","start"]);j.hash=L({amountToday:j.amountToday,btcWillingToSpend:j.btcWillingToSpend,delay:j.delay,start:j.start}),j.id=D,c(T=>[...T,j]);break}case"oneOffItem":{const j=O(F,["active","id","name","amountToday","effective","expense","isFiat"]);j.id=D,p(T=>[...T,j]);break}case"reoccurringItem":{const j=O(F,["active","id","name","annualAmount","annualPercentChange","effective","end","expense","isFiat"]);j.id=D,l(T=>[...T,j]);break}default:console.error("Unknown item type:",F)}},[c,p,l]),ae=s.useCallback(()=>{w("save")},[]),oe=s.useCallback(()=>{w("load")},[]),se=s.useCallback(()=>{w(null)},[]),re=s.useCallback(F=>{if(F.version===1)for(const O of Object.keys(F)){const D=`set${O.charAt(0).toUpperCase()+O.slice(1)}`;typeof g[D]=="function"&&g[D](F[O])}},[g]),ie=s.useMemo(()=>{const{drawdownData:F,finalVariableCache:O,simulationData:D,variableDrawdownCache:j,...T}=g;return{...Object.fromEntries(Object.entries(T).filter(([R])=>!R.startsWith("set"))),version:1}},[g]),le=s.useCallback(()=>{J()&&!h&&(y(!1),v(!1)),u(!h)},[u,v,y,h]),ce=s.useMemo(()=>({paddingRight:"2px"}),[]);return t.jsxs(xt,{$guessHeight:C,$isOpen:h,children:[t.jsxs(mt,{onClick:le,children:[xe.drawdown,t.jsx(me,{$isOpen:h})]}),t.jsx(yt,{}),t.jsxs(q,{children:[t.jsx(B,{onClick:N,style:ce,children:ht}),t.jsx(dt,{}),t.jsx(ft,{})]}),t.jsx(te,{children:t.jsx(tt,{})}),t.jsxs(q,{children:[t.jsx(B,{onClick:ae,children:bt}),t.jsx(B,{onClick:oe,children:gt})]}),m&&t.jsx(ee,{isOpen:m,item:void 0,onClose:U,onSave:ne}),t.jsx(it,{appState:ie,mode:f,onClose:se,setAppState:re})]})};export{Ct as default};
