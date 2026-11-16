"""Deterministic full-frame ART33 alpha exports using the existing image-facts helper."""
import argparse,json,subprocess,tempfile
from pathlib import Path
from export_art10_blanks import image_facts,identity,digest
ROOT=Path(__file__).resolve().parents[2]
BASE='art/redesign/art33'
PRODUCER='art/tools/export_art33_opening.py'
ENCODING=['cwebp','-q','82','-m','6','-alpha_q','100','-resize','512','0','-metadata','none']
SPECS={'shen-offering':(768,210000),'medicine-case':(384,180000)}
def produce(root,verify=False):
 from PIL import __version__ as pillow_version
 root=root.resolve();prompts=json.loads((root/BASE/'prompts.json').read_text());selected=json.loads((root/BASE/'selected-sources.json').read_text());audit=json.loads((root/BASE/'tool-audit.json').read_text());assert audit['localAuditNotProviderReceipt']is True and audit['model']is None and audit['requestId']is None
 assert prompts['tool']=='built-in image_gen'and set(prompts['assets'])==set(SPECS)
 rows={}
 for key,(height,limit)in SPECS.items():
  source_path=BASE+'/'+key+'-v1.png';runtime_path='web/public/art/v2/opening/'+key+'-v1.webp';raw,source=image_facts(root,source_path);p=prompts['assets'][key];selection=selected[key]
  assert source['mode']=='RGBA'and source['alpha']and source['alphaProof']['transparentPixels']>10000 and source['alphaProof']['solidPixels']>10000
  assert raw.width/raw.height==512/height and p['transparentBackground']is True and p['selectedSource']==source_path and p['generatedPath']==selection['originalGeneratedPath']
  assert digest(p['prompt'].encode())==p['promptSHA256']and selection['copiedUnchanged']is True and source['sha256']==selection['sha256']and selection['model']is None and selection['requestId']is None
  for reference in p['referenceImages']:assert identity(root,reference['path'])['sha256']==reference['sha256']
  with tempfile.TemporaryDirectory(prefix='chenyuan-art33-export-')as folder:
   outputs=[Path(folder)/'one.webp',Path(folder)/'two.webp']
   for output in outputs:subprocess.run([ENCODING[0],'-quiet',*ENCODING[1:],str(root/source_path),'-o',str(output)],check=True)
   a,b=[output.read_bytes()for output in outputs];assert a==b and len(a)<=limit
   dest=root/runtime_path
   if verify:assert dest.read_bytes()==a,'ART33 deterministic bytes differ'
   else:dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(a)
  _,runtime=image_facts(root,runtime_path);assert runtime['dimensions']==dict(width=512,height=height)and runtime['alpha']and runtime['alphaProof']['solidPixels']>10000 and image_facts(root,source_path)[1]==source
  rows[key]={'source':source,'runtime':runtime,'promptSHA256':p['promptSHA256'],'references':p['referenceImages'],'transform':{'uniformScale':512/raw.width,'crop':False,'padding':False,'semanticEdit':False,'outputWidth':512,'outputHeight':height},'doubleExport':{'bytesEqual':True,'firstSHA256':digest(a),'secondSHA256':digest(b),'sourceUnchanged':True}}
 assert sum(row['runtime']['bytes']for row in rows.values())<=350000
 facts={'format':'chenyuan-art33-export','version':1,'producer':identity(root,PRODUCER),'helper':identity(root,'art/tools/export_art10_blanks.py'),'prompts':identity(root,BASE+'/prompts.json'),'selectedSources':identity(root,BASE+'/selected-sources.json'),'toolAudit':identity(root,BASE+'/tool-audit.json'),'encoding':ENCODING,'decoder':'Pillow','decoderVersion':pillow_version,'encoderVersion':subprocess.check_output(['cwebp','-version'],text=True).strip(),'assets':rows,'userAcceptance':False}
 dest=root/BASE/'export-facts.json'
 if verify:assert json.loads(dest.read_text())==facts,'ART33 recorded export facts differ'
 else:dest.write_text(json.dumps(facts,ensure_ascii=False,indent=2)+'\n')
 return facts
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--verify',action='store_true');args=parser.parse_args();facts=produce(ROOT,args.verify);print(json.dumps({'verified':args.verify,'assets':{key:{'bytes':row['runtime']['bytes'],'sha256':row['runtime']['sha256'],'alphaBBox16':row['runtime']['alphaBBox16']}for key,row in facts['assets'].items()}}))
