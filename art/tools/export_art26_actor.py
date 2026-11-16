"""One calm ART26 actor; reuse image facts and deterministic whole-frame cwebp export."""
import argparse,json,subprocess,tempfile
from pathlib import Path
from export_art10_blanks import image_facts,identity,digest
ROOT=Path(__file__).resolve().parents[2]
BASE='art/production/art26'
SOURCE=BASE+'/player-loadout-idle-v1.png'
RUNTIME='web/public/art/v2/actors/player-loadout-idle-v1.webp'
FACTS=BASE+'/export-facts.json'
PRODUCER='art/tools/export_art26_actor.py'
ENCODING=['cwebp','-q','82','-m','6','-alpha_q','100','-resize','512','768','-metadata','none']
def alpha_quality(image):
 a=image.getchannel('A');h=a.histogram();w,t=a.size
 return {'zeroPixels':h[0],'core250Pixels':sum(h[250:]),'edgeMax':[a.crop(b).getextrema()[1]for b in [(0,0,w,1),(0,t-1,w,t),(0,0,1,t),(w-1,0,w,t)]]}
def produce(root,verify=False):
 from PIL import __version__ as pillow_version
 root=root.resolve();raw,source=image_facts(root,SOURCE);assert raw.width==1024 and raw.height==1536
 quality=alpha_quality(raw);assert quality['zeroPixels']>raw.width*raw.height*.3 and quality['core250Pixels']>raw.width*raw.height*.3 and max(quality['edgeMax'])<=3
 audit=json.loads((root/(BASE+'/player-loadout-idle-audit.json')).read_text());assert audit['selectedCopy']['sha256']==source['sha256']and audit['originalsKept']is True
 with tempfile.TemporaryDirectory(prefix='chenyuan-art26-export-')as folder:
  paths=[Path(folder)/'one.webp',Path(folder)/'two.webp']
  for out in paths:subprocess.run([ENCODING[0],'-quiet',*ENCODING[1:],str(root/SOURCE),'-o',str(out)],check=True)
  a,b=[p.read_bytes()for p in paths];assert a==b and len(a)<=240000
  dest=root/RUNTIME
  if verify:assert dest.read_bytes()==a,'ART26 deterministic export differs'
  else:dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(a)
 assert image_facts(root,SOURCE)[1]==source
 decoded,runtime=image_facts(root,RUNTIME);q=alpha_quality(decoded);assert runtime['dimensions']==dict(width=512,height=768)and runtime['alphaProof']['min']==0 and runtime['alphaProof']['max']>=250
 result=dict(format='chenyuan-art26-export',version=1,producer=identity(root,PRODUCER),helper=identity(root,'art/tools/export_art10_blanks.py'),source=source,runtime=runtime,sourceAlphaQuality=quality,runtimeAlphaQuality=q,audit=identity(root,BASE+'/player-loadout-idle-audit.json'),prompts=[identity(root,BASE+'/'+n)for n in ['player-loadout-idle-v1-prompt.json','player-loadout-idle-cutout-prompt.json']],encoding=ENCODING,decoder='Pillow',decoderVersion=pillow_version,encoderVersion=subprocess.check_output(['cwebp','-version'],text=True).strip(),transform=dict(uniformScale=.5,crop=False,semanticEdit=False,outputWidth=512,outputHeight=768),doubleExport=dict(bytesEqual=True,firstSHA256=digest(a),secondSHA256=digest(b),sourceUnchanged=True),userAcceptance=False)
 if verify:assert json.loads((root/FACTS).read_text())==result,'ART26 facts stale'
 else:(root/FACTS).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
 return result
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--verify',action='store_true');args=p.parse_args();r=produce(ROOT,args.verify);print(json.dumps(dict(source=r['source']['sha256'],runtime=r['runtime']['sha256'],bytes=r['runtime']['bytes'],verified=args.verify)))
