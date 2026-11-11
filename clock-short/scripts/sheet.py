import sys
from PIL import Image
out=sys.argv[1]; files=sys.argv[2:]
ims=[Image.open(f) for f in files]; w,h=ims[0].size
cols=min(len(ims),6); rows=(len(ims)+cols-1)//cols
sh=Image.new('RGB',(w*cols,h*rows))
for i,im in enumerate(ims): sh.paste(im,((i%cols)*w,(i//cols)*h))
sh.thumbnail((2400,2400)); sh.save(out,quality=85)
