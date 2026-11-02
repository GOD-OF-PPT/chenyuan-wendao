"""Pack generated ART37 materials; only transparent canvas trim, resize and encoding."""
from pathlib import Path
from PIL import Image
import hashlib,json
ROOT=Path(__file__).resolve().parents[2]
SPECS=[('dialog-ink-rim',(512,512),False),('action-jade-plaque',(512,144),True)]
def export(root=ROOT):
 rows=[]
 for key,size,trim in SPECS:
  source=root/'art/production/art37'/f'{key}-source.png';output=root/'web/public/art/v2/ui'/f'{key}-art37-v1.webp'
  with Image.open(source)as im:
   assert im.mode=='RGBA'and im.getchannel('A').getextrema()==(0,255)
   box=im.getchannel('A').getbbox()if trim else(0,0,*im.size)
   # The discarded canvas has zero alpha; no painted pixel is removed.
   normalized=im.crop(box).resize(size,Image.Resampling.LANCZOS)
  output.parent.mkdir(parents=True,exist_ok=True);normalized.save(output,'WEBP',quality=82,method=6,exact=True)
  with Image.open(output)as shipped:assert shipped.getchannel('A').tobytes()==normalized.getchannel('A').tobytes()
  rows.append(dict(source=str(source.relative_to(root)),sourceSHA256=hashlib.sha256(source.read_bytes()).hexdigest(),path=str(output.relative_to(root)),sha256=hashlib.sha256(output.read_bytes()).hexdigest(),bytes=output.stat().st_size,size=list(size),crop=list(box),alphaPreservedExactlyAfterPacking=True,settings=dict(quality=82,method=6,exact=True,resize='LANCZOS; only zero-alpha exterior trim for plaque')))
 old=json.loads((root/'art/redesign/art18.json').read_text());assert sum(r['bytes']for r in old['runtimeAssets'])+sum(r['bytes']for r in rows)<=144000,'Original ART18 combined material cap'
 target=root/'art/production/art37/exports.json';target.write_text(json.dumps(dict(format='chenyuan-art37-ui-exports',version=1,rows=rows),indent=2)+'\n');return rows
if __name__=='__main__':print(json.dumps(export()))
