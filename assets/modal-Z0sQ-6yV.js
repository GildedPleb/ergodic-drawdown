import{d as t,r as d,ab as c,j as o}from"./index-CAk_kTyU.js";const l={close:"×"},p=t.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`,x=t.div`
  background-color: rgba(36, 36, 36, 0.5);
  padding: 20px;
  border-radius: 2px;
  width: calc(100vw - 70px);
  max-width: 400px;
  border: 1px solid grey;
  display: flex;
  flex-direction: column;
  gap: 20px;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
`,b=t.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`,u=t.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  text-decoration: none;
  padding: 0;
`,g=({children:n,heading:r,isOpen:i,onClose:e})=>{const s=d.useCallback(a=>{a.stopPropagation()},[]);if(i)return c.createPortal(o.jsx(p,{onClick:e,children:o.jsxs(x,{onClick:s,children:[o.jsxs(b,{children:[o.jsx("h2",{children:r}),o.jsx(u,{onClick:e,children:l.close})]}),n]})}),document.body)};export{g as M};
