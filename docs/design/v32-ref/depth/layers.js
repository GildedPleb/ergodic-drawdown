// shared: draw the two layers on given canvases
const DD=(cv,w,h,small)=>chart(cv,{w,h,small,clear:1,pr:small==2?6:small?92:150,pl:small?34:44,pt:small?22:16,ax:[{min:0,max:11,ticks:[0,2.5,5,7.5,10],fmt:fB,title:'your stack · ₿'}],
 series:[{...SR.p5(),name:small?'Orchid':SR.p5().name,focus:1},{...SR.p6(),name:small?'Coral':SR.p6().name}]});
const PX=(cv,w,h,small)=>chart(cv,{w,h,small,clear:1,pr:small==2?6:small?92:150,pl:small?34:44,pt:small?22:16,ax:[{log:1,min:2e4,max:2e8,ticks:small?[1e5,1e6,1e7,1e8]:[3e4,1e5,1e6,1e7,1e8],fmt:f$,title:'the world · $'}],
 series:[{...SR.price(f$),k:1e5,focus:1},{name:small?'S&P':'$100k in S&P',q:q.spx,k:1e5,col:'--path-spx',dash:[1.5,3.5],f:f$},{name:small?'buys':'$100k today buys',q:q.infl,k:1e5,col:'--path-infl',dash:[7,4],f:f$}]});
