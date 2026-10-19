from PIL import Image,ImageChops
import sys
REF='/cursor/stores/store-bd958ffa-9f6e-41dc-9328-5f25b76e8f28/grok-bot/agents/e8dc8b2b-e405-4009-822b-3314f56ec996/attachments/01M598CW73GVN5Q1QB16YTHPDA.png'
def L(p):return Image.open(p).convert('RGB').resize((1024,646),Image.LANCZOS)
def cmp(a,b,name,regions):
    A,B=L(a),L(b);d=ImageChops.difference(A,B).convert('L');d.point(lambda v:min(255,v*5)).save(f'v32/diff/{name}.png')
    tot=sum(d.histogram()[25:]);print(f'{name}: pixels differing >24/255: {tot} of {1024*646} ({tot/1024/646*100:.2f}%)')
    for rn,box in regions.items():
        h=d.crop(box).histogram();n=sum(h[25:]);print(f'   {rn:28s} {n:6d} px ({n/((box[2]-box[0])*(box[3]-box[1]))*100:.2f}%)')
R={'header+headline (0-90)':(0,0,1024,90),'chart (90-580)':(0,90,1024,580),'chart excl. labels':(60,110,960,570),'dock (580-646)':(0,580,1024,646)}
cmp('v32/diff/orig-home.png','v32-plans.png','plans-vs-orig-v32-home',R)
R2={'header+headline (0-90)':(0,0,1024,90),'chart (90-500)':(0,90,1024,500),'chart excl. labels':(60,110,960,490),'sheet (500-646)':(0,500,1024,646)}
cmp(REF,'v32/diff/orig-search.png','orig-v32-search-vs-reference',R2)
cmp(REF,'v32/diff/new-search.png','new-search-vs-reference',R2)
cmp('v32/diff/orig-search.png','v32/diff/new-search.png','new-search-vs-orig-v32-search',R2)
