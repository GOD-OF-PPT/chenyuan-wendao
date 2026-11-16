"""Deterministic size/encoding export of the two generated ART18 UI materials."""
from pathlib import Path
from PIL import Image
import hashlib,json

ROOT=Path(__file__).resolve().parents[2]
SPECS=[('dialog-jade-frame',768,96000),('action-jade-frame',512,48000)]

def export():
 rows=[]
 for key,size,budget in SPECS:
  source=ROOT/'art/production/art18'/f'{key}-source.png'
  output=ROOT/'web/public/art/v2/ui'/f'{key}-v1.webp'
  with Image.open(source)as original:
   assert original.mode=='RGBA'and original.width==original.height
   rgba=original.copy();assert rgba.getchannel('A').getextrema()==(0,255)
  normalized=rgba.resize((size,size),Image.Resampling.LANCZOS)
  output.parent.mkdir(parents=True,exist_ok=True)
  normalized.save(output,'WEBP',quality=82,method=6,exact=True)
  raw=output.read_bytes();assert len(raw)<=budget,(key,len(raw),budget)
  with Image.open(output)as shipped:
   assert shipped.size==(size,size)and shipped.mode=='RGBA'
   assert shipped.getchannel('A').tobytes()==normalized.getchannel('A').tobytes()
  rows.append({'source':str(source.relative_to(ROOT)),'sourceSHA256':hashlib.sha256(source.read_bytes()).hexdigest(),'path':str(output.relative_to(ROOT)),'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw),'maxBytes':budget,'size':[size,size],'alphaPreservedExactlyAfterNormalization':True,'settings':{'quality':82,'method':6,'exact':True,'resize':'LANCZOS, square, no crop or alpha fabrication'}})
 target=ROOT/'art/production/art18/exports.json';target.write_text(json.dumps({'format':'chenyuan-art18-ui-exports','version':1,'rows':rows},indent=2)+'\n')
 print(json.dumps(rows))

if __name__=='__main__':export()
