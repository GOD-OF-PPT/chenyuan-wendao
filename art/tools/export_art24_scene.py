"""One opaque ART24 scene, reusing existing facts and deterministic cwebp export."""
import argparse,json,subprocess,tempfile
from pathlib import Path
from export_art10_blanks import image_facts,identity,digest
ROOT=Path(__file__).resolve().parents[2]
BASE='art/production/art24'
SOURCE=BASE+'/sanctum-v1.png'
RUNTIME='web/public/art/v2/schools/sanctum-v1.webp'
FACTS=BASE+'/export-facts.json'
PRODUCER='art/tools/export_art24_scene.py'
ENCODING=['cwebp','-q','82','-m','6','-resize','1536','0','-metadata','none']
def produce(root,verify=False):
 from PIL import __version__ as pillow_version
 root=root.resolve();raw,source=image_facts(root,SOURCE);assert source['alphaProof']['min']==source['alphaProof']['max']==255
 prompt=json.loads((root/(BASE+'/sanctum-v1-prompt.json')).read_text());audit=json.loads((root/(BASE+'/sanctum-v1-audit.json')).read_text())
 assert audit['copySHA256']==audit['generatedSHA256']==source['sha256'];assert prompt['promptSHA256']==digest(prompt['prompt'].encode());assert audit['promptSHA256']==identity(root,BASE+'/sanctum-v1-prompt.json')['sha256']
 assert raw.width/raw.height==2 and raw.width>=1536,'Selected actual2:1 source required'
 with tempfile.TemporaryDirectory(prefix='chenyuan-art24-export-')as folder:
  outputs=[Path(folder)/'one.webp',Path(folder)/'two.webp']
  for out in outputs:subprocess.run([ENCODING[0],'-quiet',*ENCODING[1:],str(root/SOURCE),'-o',str(out)],check=True)
  a,b=[p.read_bytes()for p in outputs];assert a==b and len(a)<=280000
  dest=root/RUNTIME
  if verify:assert dest.read_bytes()==a,'ART24 runtime differs from deterministic export'
  else:dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(a)
 assert image_facts(root,SOURCE)[1]==source
 _,runtime=image_facts(root,RUNTIME);assert runtime['dimensions']==dict(width=1536,height=768)and runtime['alphaProof']['min']==255
 result={'format':'chenyuan-art24-export','version':1,'producer':identity(root,PRODUCER),'helper':identity(root,'art/tools/export_art10_blanks.py'),'source':source,'runtime':runtime,'prompt':identity(root,BASE+'/sanctum-v1-prompt.json'),'audit':identity(root,BASE+'/sanctum-v1-audit.json'),'encoding':ENCODING,'decoder':'Pillow','decoderVersion':pillow_version,'encoderVersion':subprocess.check_output(['cwebp','-version'],text=True).strip(),'transform':{'uniformScale':1536/raw.width,'crop':False,'semanticEdit':False,'outputWidth':1536,'outputHeight':768},'doubleExport':{'bytesEqual':True,'firstSHA256':digest(a),'secondSHA256':digest(b),'sourceUnchanged':True},'userAcceptance':False}
 if verify:assert json.loads((root/FACTS).read_text())==result,'ART24 facts are stale'
 else:(root/FACTS).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
 return result
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--verify',action='store_true');args=parser.parse_args();r=produce(ROOT,args.verify);print(json.dumps({'source':r['source']['sha256'],'runtime':r['runtime']['sha256'],'bytes':r['runtime']['bytes'],'verified':args.verify}))
