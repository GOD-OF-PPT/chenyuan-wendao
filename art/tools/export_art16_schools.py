"""Export two actual school preview paintings with the existing whole-alpha producer."""
import argparse
import json
from pathlib import Path
import subprocess
import tempfile
from export_art10_blanks import digest, identity, image_facts, ENCODING
from export_art11_items import placement, ALIGNMENT

ROOT=Path(__file__).resolve().parents[2]
BASE='art/redesign/art16-schools'
IDS=('sword','talisman')
PRODUCER='art/tools/export_art16_schools.py'
FACTS=BASE+'/export-facts.json'
HELPERS=['art/tools/export_art10_blanks.py','art/tools/export_art11_items.py']

def produce(root,verify=False):
 from PIL import Image,__version__ as pillow_version
 root=root.resolve();rows=[]
 encoder=subprocess.check_output(['cwebp','-version'],text=True).strip()
 for key in IDS:
  source=f'{BASE}/{key}-station-v1.png';prompt=f'{BASE}/{key}-station-v1-prompt.json';audit=f'{BASE}/receipts/{key}-station-v1.json';runtime=f'web/public/art/v2/schools/{key}-station-v1.webp'
  image,src=image_facts(root,source);p=json.loads((root/prompt).read_text());a=json.loads((root/audit).read_text())
  assert image.width==image.height and image.width>=512 and src['mode']=='RGBA' and src['alpha']
  assert p['asset']==a['asset']==key+'-station-v1' and p['tool']==a['tool']=='image_gen.imagegen' and p['transparent_background']is True
  assert a['kind']=='local audit of actual built-in tool result; not a provider-signed receipt' and a['requestId']is None and a['model']is None
  assert a['selectedCopy']==source and a['copySHA256']==a['generatedSHA256']==src['sha256'] and a['originalKept']is True
  assert a['promptSHA256']==digest((root/prompt).read_bytes()) and a['alpha16Bbox']==src['alphaBBox16']
  assert digest((root/p['reference']).read_bytes())==p['referenceSHA256']==a['referenceSHA256']
  original=Path(a['generatedOriginal'])
  if original.exists():assert digest(original.read_bytes())==src['sha256']
  t=placement(src);scale,x,y=(t[k]for k in ['scale','translateX','translateY'])
  canvas=image.transform((512,512),Image.Transform.AFFINE,(1/scale,0,-x/scale,0,1/scale,-y/scale),resample=Image.Resampling.BICUBIC)
  with tempfile.TemporaryDirectory(prefix='chenyuan-art16-export-')as temp:
   temp=Path(temp);aligned=temp/'aligned.png';canvas.save(aligned,format='PNG');exports=[]
   for name in ['first.webp','second.webp']:
    target=temp/name;subprocess.run([ENCODING[0],'-quiet',*ENCODING[1:],str(aligned),'-o',str(target)],check=True);exports.append(target.read_bytes())
   assert exports[0]==exports[1] and len(exports[0])<=160000
   destination=root/runtime
   if verify:assert destination.read_bytes()==exports[0]
   else:destination.parent.mkdir(parents=True,exist_ok=True);destination.write_bytes(exports[0])
  _,run=image_facts(root,runtime);assert run['alpha'] and run['dimensions']==dict(width=512,height=512)
  box=run['alphaBBox1'];assert min(box[:2])>=32 and max(box[2:])<=480
  assert image_facts(root,source)[1]==src
  rows.append(dict(id=key,source=src,prompt={**identity(root,prompt),'literalSHA256':digest(p['prompt'].encode())},audit=identity(root,audit),reference=identity(root,p['reference']),runtime=run,transform={**t,'actualRuntimeAlphaBBox1':run['alphaBBox1'],'actualRuntimeAlphaBBox16':run['alphaBBox16']},exportProof=dict(firstBytes=len(exports[0]),firstSHA256=digest(exports[0]),secondBytes=len(exports[1]),secondSHA256=digest(exports[1]),bytesEqual=True,sourceUnchanged=True),visualAcceptance=False))
 assert sum(x['runtime']['bytes']for x in rows)<=320000
 facts=dict(format='chenyuan-art16-export-facts',version=1,producer=identity(root,PRODUCER),helpers=[identity(root,p)for p in HELPERS],decoder='Pillow',decoderVersion=pillow_version,encoderVersion=encoder,encoding=ENCODING,alignment=ALIGNMENT,assets=rows,userAcceptance=False,scope='Actual alpha decode/whole-body uniform placement/double export; not pixel or human acceptance')
 if verify:assert json.loads((root/FACTS).read_text())==facts
 else:(root/FACTS).write_text(json.dumps(facts,ensure_ascii=False,indent=2)+'\n')
 return facts

if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--verify',action='store_true');args=parser.parse_args();f=produce(ROOT,args.verify);print(json.dumps({'verified':args.verify,'assets':[{'id':x['id'],'bytes':x['runtime']['bytes'],'alphaBBox1':x['runtime']['alphaBBox1']}for x in f['assets']],'totalBytes':sum(x['runtime']['bytes']for x in f['assets'])},indent=2))
