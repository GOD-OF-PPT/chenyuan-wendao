"""Export one opaque ART29 plate using the established image facts and cwebp recipe."""
import argparse,json,subprocess,tempfile
from pathlib import Path
from export_art10_blanks import image_facts,identity,digest
ROOT=Path(__file__).resolve().parents[2]
BASE='art/production/art29'
SOURCE=BASE+'/inventory-scene-v1.png'
RUNTIME='web/public/art/v2/workshops/inventory-v1.webp'
FACTS=BASE+'/export-facts.json'
PRODUCER='art/tools/export_art29_scene.py'
ENCODING=['cwebp','-q','82','-m','6','-resize','1536','0','-metadata','none']
def produce(root,verify=False):
 from PIL import __version__ as pillow_version
 root=root.resolve();raw,source=image_facts(root,SOURCE);assert source['alphaProof']['min']==source['alphaProof']['max']==255
 audit=json.loads((root/(BASE+'/inventory-scene-audit.json')).read_text());assert audit['selectedCopy']=={k:source[k]for k in ['path','bytes','sha256']}
 prompts=[]
 for row in audit['calls']:
  p=row['prompt']['path'];literal=json.loads((root/p).read_text());assert literal['promptSHA256']==digest(literal['prompt'].encode());assert identity(root,p)==row['prompt'];assert identity(root,row['candidate']['path'])==row['candidate'];assert row['candidate']['sha256']==row['generatedSHA256'];prompts.append(identity(root,p))
 assert audit['calls'][-1]['generatedSHA256']==source['sha256']and raw.width/raw.height==2 and raw.width>=1536
 with tempfile.TemporaryDirectory(prefix='chenyuan-art29-export-')as folder:
  outputs=[Path(folder)/'one.webp',Path(folder)/'two.webp']
  for out in outputs:subprocess.run([ENCODING[0],'-quiet',*ENCODING[1:],str(root/SOURCE),'-o',str(out)],check=True)
  a,b=[p.read_bytes()for p in outputs];assert a==b and len(a)<=280000
  dest=root/RUNTIME
  if verify:assert dest.read_bytes()==a,'ART29 deterministic bytes differ'
  else:dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(a)
 assert image_facts(root,SOURCE)[1]==source
 _,runtime=image_facts(root,RUNTIME);assert runtime['dimensions']==dict(width=1536,height=768)and runtime['alphaProof']['min']==runtime['alphaProof']['max']==255
 result={'format':'chenyuan-art29-export','version':1,'producer':identity(root,PRODUCER),'helper':identity(root,'art/tools/export_art10_blanks.py'),'source':source,'runtime':runtime,'prompts':prompts,'audit':identity(root,BASE+'/inventory-scene-audit.json'),'encoding':ENCODING,'decoder':'Pillow','decoderVersion':pillow_version,'encoderVersion':subprocess.check_output(['cwebp','-version'],text=True).strip(),'transform':{'uniformScale':1536/raw.width,'crop':False,'semanticEdit':False,'outputWidth':1536,'outputHeight':768},'doubleExport':{'bytesEqual':True,'firstSHA256':digest(a),'secondSHA256':digest(b),'sourceUnchanged':True},'userAcceptance':False}
 if verify:assert json.loads((root/FACTS).read_text())==result,'ART29 facts stale'
 else:(root/FACTS).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
 return result
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--verify',action='store_true');args=p.parse_args();r=produce(ROOT,args.verify);print(json.dumps({'source':r['source']['sha256'],'runtime':r['runtime']['sha256'],'bytes':r['runtime']['bytes'],'verified':args.verify}))
