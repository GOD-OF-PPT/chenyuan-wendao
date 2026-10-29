"""Bind the single decorative workshop to unchanged controls and original artifact coordinates."""
import hashlib,json,re
from ta09_inventory import Tags
LEDGER='art/redesign/art27.json'
FILES=['web/src/RelicAtelier.vue', 'web/src/art03-equipment.css', 'web/src/art10-equipment.css', 'web/src/RelicInscription.vue']
REFS=['docs/decisions/0062-relic-workshop-art27-contract.md', 'goal-4/amendments/2026-10-29-goal-continue-art27.md', 'goal-4/research/art27-design-sources.json', 'goal-4/evidence/art27/relic-atelier-before.vue.txt', 'goal-4/evidence/art27/legacy-painted-bounds.json', 'goal-4/evidence/art27/art03-before.css.txt', 'goal-4/evidence/art27/art10-before.css.txt', 'goal-4/evidence/art27/relic-inscription-before.vue.txt']
BASE='art/production/art27'
RUNTIME='web/public/art/v2/workshops/relic-v1.webp'
BUDGETS={'oldNativeCap': 45000, 'oldCssCap': 12000, 'oldTA09Cap': 30000, 'oldProductionCap': 26000, 'oldPreparationCap': 60000, 'newRasterAssets': 1, 'maxRuntimeBytes': 280000, 'runtimeWidth': 1536, 'runtimeHeight': 768, 'paintedNormalMinimum': 280}
BASELINES={'atelier': {'path': 'goal-4/evidence/art27/relic-atelier-before.vue.txt', 'bytes': 15892, 'sha256': 'b8778d1bfc24accf379accdb858aef58070525d03cc688cfcbbbece8775921b3'}, 'art03': {'path': 'goal-4/evidence/art27/art03-before.css.txt', 'bytes': 12672, 'sha256': '48024f8b89c4a3a95c892ccec3b6dc66478eaee65b3876e598d22bdb0a05b334'}, 'art10': {'path': 'goal-4/evidence/art27/art10-before.css.txt', 'bytes': 11992, 'sha256': 'eef8cc1311779a60a78a38614d7c09c9628d1e93dab594031fe10e22152f4b3a'}, 'inscription': {'path': 'goal-4/evidence/art27/relic-inscription-before.vue.txt', 'bytes': 6366, 'sha256': '5d5b01878021f13621cf33ea1ba9aa5337c38ff695c031bb2db28d79a6f769a2'}}
UNCHANGED={'web/src/ProductionPlanner.vue': '6ebbc6551f6c68605b4e634196579787bf50e91d71d8fa84938bcc8cb9f1306b', 'web/src/EquipmentPanel.vue': '31e8c9c3562fd53c1669601d6be90ab6fc3ace637513233fa75b5a92be06fc91', 'web/src/JadeStudyScene.vue': '434b16c05e5e6870cb67dc1f6611a81637864b0e20463c8bfd93e4c395d675ed', 'web/src/LoadoutConstellation.vue': '57988cafc499981c9bef0cb1f708eca59dfe61a5fd508195bf253a0df0045b95', 'web/src/equipment-effects.ts': '0946c3b6b76e5ea39ebd80571175e2835ce49abe94fe6499f480b1635a934888', 'web/src/equipment-choreography.ts': '871e41e7555f640fecbc8f26706fac34a5249225a6acb5f1db9c63789a8011bb', 'web/src/ConfigurationDialog.vue': 'cc50327d03b19836dc9e41df9ff0e36185e2f64b846d510b795b6aad671f8b52', 'web/src/ConfigurationOutlook.vue': '72768df4cb3d226c5efc029dfa73e68324cfb0fd5962ca6d9348964224619e20'}
BOUNDS_SHA='676131d109d9c5c9c8dd7b72912bed243672e34128ae90fe086b9263133cfc01'
SOURCE_SHA='7de63c37eb5b8907482e8307db4fe14c3798c50e027b44aa22488ddbe558cc7a'
RUNTIME_SHA='8712d5e770eda38a0a4e7ce06dd5f137ed7ca9760f2a9fa7cada96db70bb1c86'
ENCODING=['cwebp','-q','82','-m','6','-resize','1536','0','-metadata','none']
SCENE_TAG='  <AssetImage class="study-sanctum relic-sanctum" path="art/v2/workshops/relic-v1.webp" asset-id="relic-workshop" eager aria-hidden="true"><span class="study-sanctum-fallback"/></AssetImage>\n'
def validate_art27(root,image_reader):
 root=root.resolve()
 if not(root/LEDGER).exists():
  assert not(root/FILES[0]).exists()or'asset-id="relic-workshop"'not in(root/FILES[0]).read_text(),'ART27 unrecorded scene'
  return set(),0,0
 def local(n):
  assert type(n)is str and not n.startswith('/')and'..'not in n.split('/')and'\\'not in n,'ART27 local path'
  p=root/n;assert p.is_file()and not p.is_symlink()and p.resolve().is_relative_to(root),'ART27 missing input';return p
 def digest(n):return hashlib.sha256(local(n).read_bytes()).hexdigest()
 def identity(r):
  assert type(r['bytes'])is int and r['bytes']==local(r['path']).stat().st_size and r['sha256']==digest(r['path']),'ART27 actual identity'
  return local(r['path']).read_bytes()
 m=json.loads(local(LEDGER).read_text());assert m['format']=='chenyuan-relic-workshop-art27'and type(m['version'])is int and m['version']==1 and m['userAcceptance']is False,'ART27 header'
 assert m['budgets']==BUDGETS and all(type(v)is int for v in m['budgets'].values()),'ART27 fixed typed cap'
 assert [r['path']for r in m['files']]==FILES and m['sourceReferences']==REFS and m['baselines']==BASELINES and m['unchanged']==UNCHANGED,'ART27 exact members/baselines'
 for r in m['files']:identity(r)
 for n in REFS:local(n)
 for r in BASELINES.values():identity(r)
 assert all(digest(n)==h for n,h in UNCHANGED.items()),'ART27 unchanged renderer/controller/proof'
 actor=local(FILES[0]).read_text();assert actor.count(SCENE_TAG)==1 and actor.replace(SCENE_TAG,'').encode()==identity(BASELINES['atelier']),'ART27 template-only decorative addition'
 renderer=local(FILES[3]).read_text();original=local(BASELINES['inscription']['path']).read_text();opening=next(x for x in original.splitlines(True)if x.startswith('  <button class="relic-object-inspect"'))
 assert renderer.count(opening)==1,'ART27 original inspect event'
 normalized=renderer.replace('aria-hidden="true" :data-form="shape"',':data-form="shape"',1).replace(opening,'').replace('   <div class="relic-form-surface"',opening+'   <div class="relic-form-surface"',1).replace('.relic-form-surface{position:absolute;left:0;top:0;','.relic-form-surface{position:relative;',1)
 normalized=normalized.replace('.relic-form-surface[data-form=sword] .relic-sealing{translate:0 -28px}\n','',1)
 assert normalized==original,'ART27 visual/inspect separation exceeds exact presentation change'
 tree=Tags(actor);nodes=[i for i,(t,a)in enumerate(tree.nodes)if t=='assetimage'and a.get('asset-id')=='relic-workshop'];assert len(nodes)==1,'ART27 unique actual scene'
 i=nodes[0];a=tree.nodes[i][1];assert a.get('path')=='art/v2/workshops/relic-v1.webp'and a.get('aria-hidden')=='true'and a.get('class')=='study-sanctum relic-sanctum','ART27 decorative scene role'
 assert any(tree.nodes[j][1].get('data-testid')=='relic-atelier'for j in tree.ancestors[i])and not any(tree.nodes[j][0]=='button'for j in tree.ancestors[i]),'ART27 real stage parent'
 assert any(t=='span'and v.get('class')=='study-sanctum-fallback'and i in tree.ancestors[j]for j,(t,v)in enumerate(tree.nodes)),'ART27 real fallback'
 css03=local(FILES[1]).read_text();old03=local(BASELINES['art03']['path']).read_text();assert css03.split('.relic-heading',1)[0]==old03.split('.relic-heading',1)[0],'ART27 other object styles'
 assert css03.split('.jade-empty-art',1)[1].split('\n#app .art10-relic-stage .relic-form-surface',1)[0]==old03.split('.jade-empty-art',1)[1],'ART27 other ending styles'
 css10=local(FILES[2]).read_text();old10=local(BASELINES['art10']['path']).read_text();assert css10.split('#app .art10-relic-stage',1)[0].replace(',[data-section=relics]','')==old10.split('#app .art10-relic-stage',1)[0],'ART27 study styles'
 for n in FILES[1:]:assert not re.search(r'@import|@font-face|https?://|file://',local(n).read_text()),'ART27 external style IO'
 for ledger,key,cap in [('art03','maxNativeBytes',45000),('art10','nativeBytes',12000),('ta09','nativeBytes',30000),('idle-production','maxNativeBytes',26000),('idle-preparation','maxNativeBytes',60000)]:
  prior=json.loads(local('art/redesign/'+ledger+'.json').read_text());assert prior.get('budgets',{}).get(key,prior.get(key))==cap and sum(local(r['path']).stat().st_size for r in prior['files'])<=cap,'ART27 old cap'
 identity(m['legacyBounds']);assert m['legacyBounds']['path']==REFS[4]and m['legacyBounds']['sha256']==BOUNDS_SHA,'ART27 original alpha facts'
 legacy=json.loads(local(REFS[4]).read_text());assert len(legacy)==8
 for p,r in legacy.items():assert r['path']=='web/public/'+p and digest(r['path'])==r['sha256']and r['dimensions']==[512,512],'ART27 original artifact bytes'
 f=json.loads(local(BASE+'/export-facts.json').read_text());assert m['asset']==f and f['format']=='chenyuan-art27-export'and type(f['version'])is int and f['version']==1 and f['userAcceptance']is False,'ART27 export facts'
 identity(f['producer']);identity(f['helper']);assert f['producer']['path']=='art/tools/export_art27_scene.py'and f['helper']['path']=='art/tools/export_art10_blanks.py'and f['encoding']==ENCODING,'ART27 exact exporter'
 for key,expected in [('source',SOURCE_SHA),('runtime',RUNTIME_SHA)]:
  r=f[key];raw=identity(r);dims,alpha,fmt=image_reader(raw,local(r['path']).suffix);assert r['sha256']==expected and dims==r['dimensions']and alpha==r['alpha']and fmt==r['format']and r['alphaProof']['min']==r['alphaProof']['max']==255,'ART27 actual opaque image'
 assert f['source']['dimensions']==dict(width=1774,height=887)and f['runtime']['path']==RUNTIME and f['runtime']['dimensions']==dict(width=1536,height=768)and f['runtime']['bytes']<=280000,'ART27 runtime bounds'
 assert f['transform']==dict(uniformScale=1536/1774,crop=False,semanticEdit=False,outputWidth=1536,outputHeight=768)and f['doubleExport']==dict(bytesEqual=True,firstSHA256=RUNTIME_SHA,secondSHA256=RUNTIME_SHA,sourceUnchanged=True),'ART27 whole-frame deterministic export'
 identity(f['audit']);audit=json.loads(local(f['audit']['path']).read_text());assert audit['kind']=='local audit of actual built-in tool result; not a provider-signed receipt'and audit['model']is None and audit['requestId']is None and audit['originalsKept']is True and audit['userAcceptance']is False,'ART27 honest actual audit'
 identity(audit['reference']);identity(audit['selectedCopy']);assert audit['selectedCopy']=={k:f['source'][k]for k in ['path','bytes','sha256']}and len(audit['calls'])==2 and m['candidates']==[r['candidate']for r in audit['calls']],'ART27 candidate chain'
 for row,prompt in zip(audit['calls'],f['prompts']):
  identity(row['candidate']);identity(prompt);assert prompt==row['prompt']and row['candidate']['sha256']==row['generatedSHA256']and row['requestedTransparent']is False,'ART27 actual copies'
  p=json.loads(local(prompt['path']).read_text());assert p['tool']=='image_gen.imagegen'and p['mode']=='built-in'and p['transparent_background']is False and p['promptSHA256']==hashlib.sha256(p['prompt'].encode()).hexdigest()and p['generatedOriginal']==row['generatedOriginal'],'ART27 literal prompt'
 recorded={LEDGER,*FILES,*REFS,*UNCHANGED,BASE+'/export-facts.json',f['source']['path'],RUNTIME,f['producer']['path'],f['helper']['path'],f['audit']['path'],audit['reference']['path'],*[r['path']for r in f['prompts']],*[r['path']for r in m['candidates']],*[r['path']for r in legacy.values()]}
 return recorded,1,f['runtime']['bytes']
