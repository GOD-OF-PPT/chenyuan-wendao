"""Additive source and consumer binding for the three catalogue paintings."""
import hashlib,json

def validate_catalogue_art(root,image_info):
 path=root/'art/redesign/catalogue-art/manifest.json'
 if not path.exists():
  assert not (root/'web/src/catalogue-art.css').exists(),'Unrecorded catalogue art code'
  return set(),0
 m=json.loads(path.read_text());assert m['format']=='chenyuan-catalogue-art' and m['version']==1
 assert m['budgets']==dict(assets=3,maxRuntimeBytesPerAsset=120000,maxRuntimeBytes=360000,maxNativeBytes=18000)
 assert m['rights']['productionUseApproved']is True and m['rights']['userAcceptance']is False and m['rights']['distributionLicense']is None
 for ref in m['sourceReferences']+m['rights']['evidenceReferences']:
  file=(root/ref).resolve();assert file.is_relative_to(root) and file.is_file()
 assert [a['id']for a in m['assets']]==['supplies','alchemy','study']
 prompts={a['id']:a for a in json.loads((root/'art/redesign/catalogue-art/prompts.json').read_text())['assets']}
 recorded=set()
 for row in m['assets']:
  aid=row['id'];source,runtime=row['source'],row['runtime']
  assert source['path']==f'art/redesign/catalogue-art/{aid}-v1.png' and runtime['path']==f'web/public/art/v2/catalogue/{aid}-v1.webp'
  for item in [source,runtime]:
   file=(root/item['path']).resolve();assert file.is_relative_to(root) and file.is_file();data=file.read_bytes()
   assert len(data)==item['bytes'] and hashlib.sha256(data).hexdigest()==item['sha256']
   dimensions,alpha,fmt=image_info(data,file.suffix);assert dimensions==item['dimensions'] and alpha==item['alpha']is True and fmt==item['format'];recorded.add(item['path'])
  assert runtime['bytes']<=120000 and all(0<runtime['dimensions'][axis]<=source['dimensions'][axis]for axis in ['width','height'])
  assert runtime['path'].removeprefix('web/public/')in(root/'web/src/CatalogueArt.vue').read_text()
  ref=row['receipt'];assert ref['path']==f'art/redesign/catalogue-art/receipts/{aid}.json'
  raw=(root/ref['path']).read_bytes();assert hashlib.sha256(raw).hexdigest()==ref['sha256'];r=json.loads(raw)
  assert r['id']==aid and r['tool']=='built-in image_gen' and r['copiedUnchanged']is True and r['transparentBackgroundRequested']is True
  assert r['sourceSHA256']==source['sha256'] and r['sourceBytes']==source['bytes'] and r['sourceDimensions']==source['dimensions'] and r['savedPath']==source['path'] and r['runtime']==runtime
  assert r['review']==dict(actuallyViewed=True,textBaked=False,userAcceptance=False)
  assert r['promptReference']=='art/redesign/catalogue-art/prompts.json#'+aid and prompts[aid]['transparent_background']is True
  assert r['promptSHA256']==hashlib.sha256(prompts[aid]['prompt'].encode()).hexdigest()
  assert r['encoding']==['cwebp','-q','82','-m','6','-alpha_q','100','-resize','512','0','-metadata','none']
  for name,item in [('alphaProof',source),('runtimeAlphaProof',runtime)]:
   a=r[name];assert a['min']==0 and a['max']>=250 and a['transparentPixels']>10000 and a['solidPixels']>10000 and a['intermediatePixels']>=0
   assert a['transparentPixels']+a['solidPixels']+a['intermediatePixels']==item['dimensions']['width']*item['dimensions']['height']
 assert sum(a['runtime']['bytes']for a in m['assets'])<=360000
 assert [r['path']for r in m['files']]==['web/src/CatalogueArt.vue','web/src/StageOutcome.vue','web/src/catalogue-art.css']
 for r in m['files']:
  data=(root/r['path']).read_bytes();assert len(data)==r['bytes'] and hashlib.sha256(data).hexdigest()==r['sha256']
 assert sum(r['bytes']for r in m['files'])<=18000
 for file,fragments in m['bindings'].items():assert all(s in(root/file).read_text()for s in fragments)
 return recorded,3
