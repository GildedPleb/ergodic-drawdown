import math,glob,os,sys
from fontTools.ttLib import TTFont
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen
from PIL import Image,ImageDraw,ImageFont
LSB=float(os.environ.get('LSB','1'));RSBK=float(os.environ.get('RSBK','0.5'));OUT=os.environ.get('OUT','.');os.makedirs(OUT,exist_ok=True)
RATIO={'EBGaramond':.58,'CormorantGaramond':float(sys.argv[1]) if len(sys.argv)>1 else .58,'Jost':.62}
def add_arrow(f,gs,cmap):
    # → built from Jost's own minus: same bar thickness and height, head strokes at the bar's thickness, 40° arms
    mg=cmap[0x2212];bp=BoundsPen(gs);gs[mg].draw(bp);x0,y0,x1,y1=bp.bounds;th=y1-y0;yc=(y0+y1)/2;adv=f['hmtx'][mg][0]
    W=round(adv*1.3);L=round(x0);R=W-L;hl=th*5.2;a=math.radians(40);p=TTGlyphPen(gs)
    def quad(pts):
        pts=[(round(x),round(y)) for x,y in pts];p.moveTo(pts[0]);[p.lineTo(q) for q in pts[:0:-1]];p.closePath()
    quad([(L,y0),(R-th*.6,y0),(R-th*.6,y1),(L,y1)])
    for sgn in (1,-1):
        dx,dy=-math.cos(a)*hl,sgn*math.sin(a)*hl;nx,ny=-math.sin(a)*th/2*sgn,-math.cos(a)*th/2  # normal
        nx,ny=(math.sin(a)*sgn*th/2, math.cos(a)*th/2*(-1 if sgn>0 else 1)) if False else (dy/hl*th/2, -dx/hl*th/2)
        tip=(R,yc);end=(R+dx,yc+dy)
        quad([(tip[0]+nx,tip[1]+ny),(end[0]+nx,end[1]+ny),(end[0]-nx,end[1]-ny),(tip[0]-nx,tip[1]-ny)][::(1 if sgn>0 else -1)])
    f['glyf']['arrowright']=p.glyph();f['hmtx']['arrowright']=(W,L)
    if 'arrowright' not in f.getGlyphOrder(): f.setGlyphOrder(f.getGlyphOrder()+['arrowright'])
    for st in f['cmap'].tables:
        if st.isUnicode(): st.cmap[0x2192]='arrowright'
for fn in sorted(glob.glob('src/*.ttf')):
    base=os.path.basename(fn)[:-4];key,wt=base.split('-');it=wt.endswith('i')
    f=TTFont(fn);upm=f['head'].unitsPerEm;gs=f.getGlyphSet();cmap=f.getBestCmap();gB=cmap[ord('B')]
    bp=BoundsPen(gs);gs[gB].draw(bp);x0,y0,x1,cap=bp.bounds
    ang=f['post'].italicAngle;t=math.tan(math.radians(-ang))
    # raster scan at y=0.3*cap (font units == px at size upm)
    S=upm;im=Image.new('L',(int(S*1.6),int(S*1.6)),0);d=ImageDraw.Draw(im);ft=ImageFont.truetype(fn,S);BX,BY=200,int(S*1.2)
    d.text((BX,BY),'B',font=ft,fill=255,anchor='ls');ys=int(cap*.3);row=[im.getpixel((x,BY-ys)) for x in range(im.width)]
    ink=[i for i,v in enumerate(row) if v>128];L=ink[0];stem=0
    for v in row[L:]:
        if v>128: stem+=1
        else: break
    R=ink[-1];L-=BX;R-=BX
    light=wt.rstrip('i') in ('400','500');bw=stem*RATIO[key]*(1.08 if light and key!='Jost' else 1);ext=cap*(.18 if light else .14)
    xa_s=L+stem*.78;xb_s=L+(R-L)*.58  # centres at scan height ys
    adv,lsb=f['hmtx'][gB];dx=0 if it else round(lsb*(1-LSB))  # italic keeps full LSB: f and quote overhangs collide with the top tick
    X=lambda xc,y:xc+(y-ys)*t-dx
    pen=TTGlyphPen(gs);gs[gB].draw(TransformPen(pen,(1,0,0,1,-dx,0)))
    for xc in (xa_s,xb_s):
        for ya,yb in ((cap-12,cap+ext),(-ext,12)):
            pts=[(X(xc,ya)-bw/2,ya),(X(xc,ya)+bw/2,ya),(X(xc,yb)+bw/2,yb),(X(xc,yb)-bw/2,yb)]
            pts=[(round(a),round(b)) for a,b in pts]
            pen.moveTo(pts[0]);[pen.lineTo(p) for p in pts[:0:-1]];pen.closePath()  # counter-clockwise? reversed for TT (clockwise outer)
    NN=float(os.environ.get('NN','0.5'))
    g=pen.glyph();name='bitcoin'
    f['glyf'][name]=g;# RSB: move the ₿'s right sidebearing RSBK of the way toward the font's own $ (₿ is now a prefix like $)
    def rsb(gn):
        bp=BoundsPen(gs);gs[gn].draw(bp);return f['hmtx'][gn][0]-bp.bounds[2]
    dr=round(RSBK*(rsb(cmap[ord('$')])-rsb(gB)));dr=max(dr,-30)
    f['hmtx'][name]=(adv-dx+dr,lsb-dx)
    if key=='Jost' and 0x2192 not in cmap: add_arrow(f,gs,cmap)
    if 0x202F not in cmap:
        sp=cmap[0x20];w=round(f['hmtx'][sp][0]*.6);f['glyf']['uni202F']=TTGlyphPen(gs).glyph();f['hmtx']['uni202F']=(w,0)
        if 'uni202F' not in f.getGlyphOrder(): f.setGlyphOrder(f.getGlyphOrder()+['uni202F'])
        for st in f['cmap'].tables:
            if st.isUnicode(): st.cmap[0x202F]='uni202F'
    if NN: f['hmtx'][f.getBestCmap()[0x202F]]=(round(f['hmtx'][cmap[0x20]][0]*NN),0)
    order=f.getGlyphOrder();
    if name not in order: f.setGlyphOrder(order+[name])
    if 'maxp' in f: f['maxp'].numGlyphs=len(f.getGlyphOrder())
    for st in f['cmap'].tables:
        if st.isUnicode(): st.cmap[0x20BF]=name
    if 'hdmx' in f: del f['hdmx']
    if 'LTSH' in f: del f['LTSH']
    newfam={'CormorantGaramond':('Cormorant Garamond','SM Cormorant','SMCormorant'),'Jost':('Jost','SM Jost','SMJost'),'EBGaramond':('EB Garamond','SM EB Garamond','SMEBGaramond')}[key]
    for r in f['name'].names:
        try:s=r.toUnicode()
        except:continue
        s2=s.replace(newfam[0].replace(' ',''),newfam[2]) if r.nameID==6 else s.replace(newfam[0],newfam[1])
        if r.platformID==1: r.platformID,r.platEncID,r.langID=1,0,0
        if r.nameID in(1,3,4,6,16,17,21) and s2!=s:r.string=s2
    out=os.path.join(OUT,f"{newfam[2]}-{wt}");f.save(out+'.ttf');f.flavor='woff2';f.save(out+'.woff2')
    print(out,'stem',stem,'bar',round(bw),'angle',ang)
