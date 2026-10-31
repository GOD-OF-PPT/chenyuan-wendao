"""ART35: trim transparent padding, uniformly fit, and deterministically encode eight props."""
import argparse,json,subprocess,tempfile
from pathlib import Path
from export_art10_blanks import image_facts,identity,digest

ROOT=Path(__file__).resolve().parents[2]
BASE='art/production/art35'
NAMES=['heart','blade','scroll','knot','seal','fan','manual','leaf']
PRODUCER='art/tools/export_art35_props.py'
ENCODING=['cwebp','-q','82','-m','6','-alpha_q','100','-metadata','none']

def produce(root,verify=False):
 from PIL import Image,__version__ as pillow_version
 rows=[]
 for name in NAMES:
  cleaned=name in ['heart','blade']
  source_path=f'{BASE}/{name}-source'+('-v2'if cleaned else'')+'.png'
  raw,source=image_facts(root,source_path)
  alpha=raw.getchannel('A');assert alpha.getextrema()==(0,255),'ART35 source must have real alpha'
  box=alpha.point(lambda value:255 if value>1 else 0).getbbox()
  assert box and box[2]>box[0] and box[3]>box[1]
  borders=[(0,0,raw.width,box[1]),(0,box[3],raw.width,raw.height),(0,box[1],box[0],box[3]),(box[2],box[1],raw.width,box[3])]
  removed_max=max([alpha.crop(r).getextrema()[1]for r in borders if r[2]>r[0]and r[3]>r[1]]or[0])
  assert removed_max<=1,'ART35 may only trim effectively transparent outer residue'
  target=(128,512)if name=='leaf'else(512,512);padding=4 if name=='leaf'else 16
  scale=min((target[0]-padding*2)/(box[2]-box[0]),(target[1]-padding*2)/(box[3]-box[1]))
  size=(max(1,round((box[2]-box[0])*scale)),max(1,round((box[3]-box[1])*scale)))
  offset=((target[0]-size[0])//2,(target[1]-size[1])//2)
  fitted=raw.crop(box).resize(size,Image.Resampling.LANCZOS)
  canvas=Image.new('RGBA',target,(0,0,0,0));canvas.paste(fitted,offset)
  with tempfile.TemporaryDirectory(prefix='chenyuan-art35-export-')as temp:
   temp=Path(temp);png=temp/'fit.png';canvas.save(png)
   outputs=[temp/'one.webp',temp/'two.webp']
   for dest in outputs:subprocess.run([ENCODING[0],'-quiet',*ENCODING[1:],str(png),'-o',str(dest)],check=True)
   a,b=[p.read_bytes()for p in outputs];assert a==b and len(a)<=(40000 if name=='leaf'else 100000)
   first_sha,second_sha=digest(a),digest(b)
   runtime_path=f'web/public/art/v2/study/{name}-v1.webp';dest=root/runtime_path
   if verify:assert dest.read_bytes()==a,'ART35 deterministic output differs'
   else:dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(a)
  decoded,runtime=image_facts(root,runtime_path)
  a=decoded.getchannel('A');w,h=decoded.size
  edges=[a.crop(r).getextrema()[1]for r in [(0,0,w,1),(0,h-1,w,h),(0,0,1,h),(w-1,0,w,h)]]
  assert max(edges)==0 and a.getextrema()==(0,255),'ART35 complete transparent runtime margin'
  audit=f'{BASE}/{name}'+('-clean'if cleaned else'')+'-audit.json'
  record=json.loads((root/audit).read_text());assert record['selectedCopy']==identity(root,source_path)
  assert image_facts(root,source_path)[1]==source,'ART35 source mutated'
  rows.append(dict(name=name,source=source,runtime=runtime,audit=identity(root,audit),prompt=record['prompt'],transform=dict(cropOuterAlphaAtMost=1,cropBox=list(box),removedOuterMaxAlpha=removed_max,uniformScale=scale,resized=list(size),offset=list(offset),canvas=list(target),semanticEdit=False),runtimeEdgeMax=edges,doubleExport=dict(bytesEqual=True,firstSHA256=first_sha,secondSHA256=second_sha,sourceUnchanged=True)))
 result=dict(format='chenyuan-study-rest-art35-export',version=1,producer=identity(root,PRODUCER),helper=identity(root,'art/tools/export_art10_blanks.py'),encoding=ENCODING,decoder='Pillow',decoderVersion=pillow_version,encoderVersion=subprocess.check_output(['cwebp','-version'],text=True).strip(),assets=rows,userAcceptance=False)
 assert sum(r['runtime']['bytes']for r in rows)<=740000
 dest=root/(BASE+'/export-facts.json')
 if verify:assert json.loads(dest.read_text())==result,'ART35 facts differ'
 else:dest.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
 return result

if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--verify',action='store_true');args=parser.parse_args()
 result=produce(ROOT,args.verify);print(json.dumps(dict(assets=len(result['assets']),bytes=sum(r['runtime']['bytes']for r in result['assets']),verified=args.verify)))
