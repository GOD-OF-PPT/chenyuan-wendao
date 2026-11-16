"""Bound one opaque school-stage background and its real illustration-only consumers."""
import hashlib,json,re
from pathlib import PurePosixPath
from ta09_inventory import Tags
LEDGER='art/redesign/art24.json'
FILES=['web/src/LoadoutConstellation.vue','web/src/art16-schools.css']
BASE='art/production/art24'
RUNTIME='web/public/art/v2/schools/sanctum-v1.webp'
REFS=['docs/decisions/0058-school-sanctum-art24-contract.md','goal-4/amendments/2026-10-29-goal-continue-art24.md','goal-4/research/art24-design-sources.json']
BUDGETS=dict(backgroundAssets=1,maxRuntimeBytes=280000,maxRuntimeWidth=1536,maxRuntimeHeight=1024,oldNativeCap=45000,schoolCssCap=12000)
ENCODING=['cwebp','-q','82','-m','6','-resize','1536','0','-metadata','none']
def validate_art24(root,image_reader):
 root=root.resolve()
 if not(root/LEDGER).exists():
  assert not(root/RUNTIME).exists(),'Unrecorded ART24 scene'
  return set(),0,0
 def local(p):
  assert type(p)is str and not PurePosixPath(p).is_absolute()and'..'not in PurePosixPath(p).parts and '\\'not in p,'ART24 local path'
  q=root/p;assert q.is_file()and not q.is_symlink()and q.resolve().is_relative_to(root),'ART24 missing input';return q
 def identity(row,path=None):
  assert type(row)is dict and all(k in row for k in ['path','bytes','sha256']);assert path is None or row['path']==path
  p=local(row['path']);b=p.read_bytes();assert type(row['bytes'])is int and row['bytes']==len(b)and row['sha256']==hashlib.sha256(b).hexdigest(),'ART24 actual identity';return b
 m=json.loads(local(LEDGER).read_text());assert m['format']=='chenyuan-school-sanctum-art24'and type(m['version'])is int and m['version']==1 and m['userAcceptance']is False,'ART24 header'
 assert m['budgets']==BUDGETS and all(type(v)is int for v in m['budgets'].values()),'ART24 fixed typed cap'
 assert [r['path']for r in m['files']]==FILES and m['sourceReferences']==REFS,'ART24 exact membership'
 for r in m['files']:identity(r)
 for p in REFS:local(p)
 f=m['asset'];facts=json.loads(local(BASE+'/export-facts.json').read_text());assert facts==f and f['format']=='chenyuan-art24-export'and f['version']==1 and f['userAcceptance']is False,'ART24 real export facts'
 identity(f['producer'],'art/tools/export_art24_scene.py');identity(f['helper'],'art/tools/export_art10_blanks.py');assert f['encoding']==ENCODING,'ART24 exact encoder'
 for k,p in [('source',BASE+'/sanctum-v1.png'),('runtime',RUNTIME)]:
  row=f[k];raw=identity(row,p);dims,_,fmt=image_reader(raw,local(p).suffix);assert dims==row['dimensions']and fmt==row['format'],'ART24 dimensions/header'
  a=row['alphaProof'];assert a['min']==a['max']==255 and a['transparentPixels']==a['intermediatePixels']==0 and a['solidPixels']==dims['width']*dims['height'],'ART24 actual opacity facts'
  assert re.fullmatch('[a-f0-9]{64}',row['rgbaSHA256']),'ART24 decoded image hash'
 source=f['source'];runtime=f['runtime'];assert source['dimensions']['width']==source['dimensions']['height']*2 and runtime['dimensions']==dict(width=1536,height=768),'ART24 actual2:1 export'
 assert runtime['bytes']<=280000 and f['transform']==dict(uniformScale=1536/source['dimensions']['width'],crop=False,semanticEdit=False,outputWidth=1536,outputHeight=768),'ART24 runtime bounds and uniform whole-scene export'
 e=f['doubleExport'];assert e==dict(bytesEqual=True,firstSHA256=runtime['sha256'],secondSHA256=runtime['sha256'],sourceUnchanged=True),'ART24 deterministic export'
 identity(f['prompt'],BASE+'/sanctum-v1-prompt.json');identity(f['audit'],BASE+'/sanctum-v1-audit.json');p=json.loads(local(f['prompt']['path']).read_text());a=json.loads(local(f['audit']['path']).read_text())
 assert p['tool']=='image_gen.imagegen'and p['mode']=='built-in'and p['transparent_background']is False and p['promptSHA256']==hashlib.sha256(p['prompt'].encode()).hexdigest(),'ART24 actual literal prompt'
 assert a['kind']=='local audit of actual built-in tool result; not a provider-signed receipt'and a['model']is None and a['requestId']is None and a['originalKept']is True,'ART24 honest audit'
 assert a['selectedCopy']==source['path']and a['copySHA256']==a['generatedSHA256']==source['sha256']and a['promptSHA256']==f['prompt']['sha256']and a['generatedOriginal']==p['generatedOriginal'],'ART24 original copy provenance'
 old=json.loads(local('art/redesign/art03.json').read_text());assert old['maxNativeBytes']==45000 and sum(local(r['path']).stat().st_size for r in old['files'])<=45000,'ART24 original module cap'
 css=local(FILES[1]).read_text();assert len(css.encode())<=12000 and not re.search(r'@import|@font-face|https?://|file://',css),'ART24 old school CSS cap/external IO'
 assert '.school-sanctum' in css and 'prefers-reduced-motion'in css and 'hub-reduced'in css,'ART24 style and reduction consumer'
 tree=Tags(local(FILES[0]).read_text());nodes=[(i,v)for i,(tag,v)in enumerate(tree.nodes)if tag=='assetimage'and v.get('asset-id')=='school-sanctum'];assert len(nodes)==1,'ART24 actual scene consumer'
 i,v=nodes[0];assert v.get('path')=='art/v2/schools/sanctum-v1.webp'and v.get('aria-hidden')=='true'and any(tree.nodes[j][1].get('class')=='school-picker art16-school-picker'for j in tree.ancestors[i]),'ART24 school-only decorative scene'
 assert any(tag=='span'and v.get('class')=='school-sanctum-fallback'and i in tree.ancestors[j]for j,(tag,v)in enumerate(tree.nodes)),'ART24 failed-scene fallback'
 return {LEDGER,*FILES,*REFS,BASE+'/export-facts.json',BASE+'/sanctum-v1.png',RUNTIME,BASE+'/sanctum-v1-prompt.json',BASE+'/sanctum-v1-audit.json','art/tools/export_art24_scene.py'},1,runtime['bytes']
