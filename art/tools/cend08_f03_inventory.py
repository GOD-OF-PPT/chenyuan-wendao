import hashlib,json,re
from pathlib import Path
LEDGER='art/redesign/cend08-f03.json'
MANIFEST={'format': 'chenyuan-source-materials',
 'version': 1,
 'newRasterAssets': 0,
 'userAcceptance': False,
 'maxDisplayBytes': 6500,
 'maxParentTotalBytes': 15680,
 'parents': [{'path': 'web/src/SourceObject.vue',
              'before': 'goal-4/evidence/cend08-f03/before/web/src/SourceObject.vue',
              'beforeBytes': 5404,
              'beforeSHA256': 'fd8b7bc3062c935e7fce82214ceb0aa09b5cc6df49e5bd38a3f710bc3e450752',
              'bytes': 5774,
              'sha256': '8ec7be7122c5e6601de61332533fde63e0e0768cb1ecfc5dc42795b57e89defb',
              'operations': [{'old': "import {computed} from 'vue';\n",
                              'new': "import {computed,useId} from 'vue';\n",
                              'newStart': 25,
                              'newEnd': 61},
                             {'old': '',
                              'new': "import SourceMaterials from './SourceMaterials.vue';\n",
                              'newStart': 258,
                              'newEnd': 311},
                             {'old': '',
                              'new': "const prefix='source-tool-'+useId(),paint=(name:string)=>prefix+'-'+name;\n"
                                     'const '
                                     "materials=Object.fromEntries(['wood','bronze','fiber'].map(name=>['--ta08-'+name+'-fill',`url(#${paint(name)})`]));\n",
                              'newStart': 442,
                              'newEnd': 638},
                             {'old': '   <svg class="ta08-resource-tool" viewBox="0 0 320 240" aria-hidden="true" '
                                     'fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" '
                                     'stroke-linejoin="round">\n',
                              'new': '   <svg :style="materials" class="ta08-resource-tool" viewBox="0 0 320 240" '
                                     'aria-hidden="true" fill="none" stroke="currentColor" stroke-width="3" '
                                     'stroke-linecap="round" stroke-linejoin="round">\n'
                                     '    <SourceMaterials :prefix="prefix"/>\n'
                                     '    <g :filter="\'url(#\'+paint(\'surface\')+\')\'">\n',
                              'newStart': 3238,
                              'newEnd': 3519},
                             {'old': '', 'new': '    </g>\n', 'newStart': 5062, 'newEnd': 5071}]},
             {'path': 'web/src/SourceCommission.vue',
              'before': 'goal-4/evidence/cend08-f03/before/web/src/SourceCommission.vue',
              'beforeBytes': 10276,
              'beforeSHA256': '9d385a237a24f51277fa8dae9dd4c7cb7e81c563923370066c89efeea0702314',
              'bytes': 9301,
              'sha256': '07fc788df3be32fabc0f329780e81fdc240a6acd629252f4dc8302e8531be3c7',
              'operations': [{'old': '',
                              'new': "import SourceMaterials from './SourceMaterials.vue';\n",
                              'newStart': 226,
                              'newEnd': 279},
                             {'old': 'const '
                                     "materials=computed(()=>Object.fromEntries(['wood','paper','bronze','jade','stone','fiber'].map(name=>['--ta08-'+name+'-fill',`url(#${paint(name)})`])));\n",
                              'new': 'const '
                                     "materials=computed(()=>Object.fromEntries(['wood','paper','bronze','jade','stone','fiber'].map(name=>['--ta08-'+name+'-fill',`url(#${paint('material-'+name)})`])));\n",
                              'newStart': 513,
                              'newEnd': 684},
                             {'old': '    <defs>\n'
                                     '     <linearGradient :id="paint(\'wood\')" x2=".9" y2="1"><stop '
                                     'stop-color="#8a7950"/><stop offset=".3" stop-color="#5c7657"/><stop offset="1" '
                                     'stop-color="#183c36"/></linearGradient>\n'
                                     '     <linearGradient :id="paint(\'paper\')" x2=".3" y2="1"><stop '
                                     'stop-color="#c6cfad"/><stop offset=".5" stop-color="#9db69a"/><stop offset="1" '
                                     'stop-color="#567e6b"/></linearGradient>\n'
                                     '     <linearGradient :id="paint(\'bronze\')" x2="1" y2=".6"><stop '
                                     'stop-color="#4b6555"/><stop offset=".32" stop-color="#c4b780"/><stop '
                                     'offset=".48" stop-color="#e0d2a0"/><stop offset="1" '
                                     'stop-color="#384e43"/></linearGradient>\n'
                                     '     <linearGradient :id="paint(\'jade\')" x2=".8" y2="1"><stop '
                                     'stop-color="#bddbc0"/><stop offset=".25" stop-color="#69a994"/><stop offset="1" '
                                     'stop-color="#1c4d45"/></linearGradient>\n'
                                     '     <linearGradient :id="paint(\'stone\')" x2=".2" y2="1"><stop '
                                     'stop-color="#668477"/><stop offset=".4" stop-color="#3b6257"/><stop offset="1" '
                                     'stop-color="#183936"/></linearGradient>\n'
                                     '     <linearGradient :id="paint(\'fiber\')" x2="0" y2="1"><stop '
                                     'stop-color="#c1bd8b"/><stop offset=".5" stop-color="#999d69"/><stop offset="1" '
                                     'stop-color="#596e49"/></linearGradient>\n'
                                     '    </defs>\n',
                              'new': '    <SourceMaterials :prefix="paint(\'material\')"/>\n'
                                     '    <g :filter="\'url(#\'+paint(\'material-surface\')+\')\'">\n',
                              'newStart': 1854,
                              'newEnd': 1961},
                             {'old': '', 'new': '    </g>\n', 'newStart': 8578, 'newEnd': 8587}]}],
 'display': {'path': 'web/src/SourceMaterials.vue',
             'bytes': 2639,
             'sha256': '654dbd716684bdc971a9bb85143292a66960015c2b1eb909531bd03dd98acaa2'},
 'authority': {'src/full/content.ts': 'e5602fa6c0ccac95372d5f668a3234d7d6054ea5f3a4b36d72798f1b9e40878c',
               'src/full/activity.ts': '2630150966d2d6a441c36b013448ce4ccb604dd700b329df4a65997d0b7d8815',
               'src/full/engine.ts': '864cdae0c480f36e8ba305de5ff5dec04ac0607c2c9f362db34c21111ce82a73',
               'src/full/receipts.ts': '185597443e21bf88949232a97afa426410b0dcc8ce8e07cf240a08af0f2dd0ae',
               'web/src/source-choreography.ts': '665cb8c1d7bf0537b992b628720ff3be2bf0206536b36f487799bf67fe1f96f2',
               'web/src/SourcePlanner.vue': 'ea42a57110db234205d8ef8f1d46f4969802a7757ed16ede9d0ff3e33e3b9e72',
               'web/src/SourceField.vue': '0f3a665944b28a27d52843c6bbe6e05925b3e9a5aaad8e859459fa69091c36be',
               'web/src/SourceSatchel.vue': 'f28a144f928cd9358df91e600118fcb19aaef2667f9eb3cb198ccb15cc8521fd',
               'web/src/ta08-source.css': '0bcaa542dca4f1dc9bb862e63ead388dee2f996bf483507d77813710181f3522',
               'web/src/store.ts': 'cc3a373bbe09df49410de3ef9bf3233a5b9481ee187b6dfef71faf38030890b7',
               'web/src/activity-clock.ts': '21fc98e4a430464a6dc3554091c022c53b17714938ae6e05491d27e1ab3f0901',
               'web/src/full-persistence.ts': 'd2a66b5ec397b1f0a358760afa278948c113d0eccad7826a88a9b1964a0daf21',
               'web/src/activity-persistence.ts': 'a5100e6f2d84b627ef17800bfc8f17f3f533566db47f35faab3833da66bab4cf',
               'web/src/activity-effects.ts': 'dd697069d134e4e9a935c0186758ebd243d26b29dd9856f4100d21596b4a0f8b',
               'web/src/use-activity-effect.ts': 'e15a7b41b897e7d4f29e8be277703efd1f8c32d2dec11d278a41a37c89425163',
               'web/src/focus.ts': '8ae91e78a4db7a854c293fc4b1bc28f02dd0d542b3119cff383f9245b4944eea',
               'web/src/AssetImage.vue': 'ecfc476d074c16c14b181abbf62863ebc6d5c014d9473d3118e761433115a8da'},
 'oldLedgers': {'art/redesign/ta08.json': '3dacde3abdbbc6f2476213ed353bd89b5c9ddaab6b9d656f0d4e316a5270db37',
                'art/redesign/art34.json': 'aacbda4147649c7cde847ab464ef6495ca596ab754889dce041b7212a471d4e0',
                'art/redesign/ux33.json': 'ca0c3a052c3f9508957a38da9a8acada9821104c2461aa127bccd0743f27c3b8',
                'art/redesign/art02.json': '697f41e90df96108c1e1d330d511bc91b019aa36f1e1124a152f91d1946a6e9c'},
 'reusedPaintings': {'web/public/art/v2/sources/dao-cold-v1.webp': '62903f5b7056ba61b225d8294865fe9e8300334dec1b9ef5fca64946a6192edf',
                     'web/public/art/v2/sources/dew-cold-v1.webp': '5272fa6dbb7d5fdc901c3c27634b9749b230831b133eeba455ea315fc9e0da0e',
                     'web/public/art/v2/sources/herbs-cold-v1.webp': '0d111845c05e076102a788c98ace1917a2c4e87a13a6f7021eea4851918aaa73',
                     'web/public/art/v2/sources/jade-cold-v1.webp': 'decbbda3867443a679744416cc05387e19bb7bbb8e124029982af6e233462fdd',
                     'web/public/art/v2/sources/lotus-cold-v1.webp': '45a77e2ad96c2af61ad6c474d3d0bad47dbf91a6a451e932e8ee867d8040e14b',
                     'web/public/art/v2/sources/soul-cold-v1.webp': '714a6bbbd0cbff9beae1a223f2e550d970f58482bdc05ffc91cc716734f18814'},
 'sourceReferences': ['docs/decisions/0138-source-materials-cend08-f03.md',
                      'goal-4/amendments/2026-11-09-cend08-f03-input.md',
                      'goal-4/research/cend08-f03-sources.json']}
def prior_source_material_bytes(path,raw):
 name=Path(path).name
 row=next((r for r in MANIFEST['parents']if Path(r['path']).name==name),None)
 if not row or hashlib.sha256(raw).hexdigest()!=row['sha256']:return raw
 text=raw.decode()
 for step in reversed(row['operations']):
  a,b=step['newStart'],step['newEnd'];assert text[a:b]==step['new'],'SM03 exact offset surface inverse'
  text=text[:a]+step['old']+text[b:]
 assert len(text.encode())==row['beforeBytes']and hashlib.sha256(text.encode()).hexdigest()==row['beforeSHA256'],'SM03 exact whole original'
 return text.encode()
def validate_source_materials(root):
 root=Path(root).resolve()
 def local(n):
  assert type(n)is str and n and not Path(n).is_absolute() and '..'not in Path(n).parts and '\\'not in n,'SM03 local path'
  p=root/n;assert p.is_file()and not p.is_symlink()and p.resolve().is_relative_to(root),'SM03 actual local file'
  return p
 if not(root/LEDGER).exists():
  assert not(root/MANIFEST['display']['path']).exists(),'SM03 missing ledger'
  for row in MANIFEST['parents']:
   p=root/row['path'];assert not p.exists()or hashlib.sha256(p.read_bytes()).hexdigest()==row['beforeSHA256'],'SM03 missing ledger current parent'
  return set(),0
 assert json.dumps(json.loads(local(LEDGER).read_text()),sort_keys=True)==json.dumps(MANIFEST,sort_keys=True),'SM03 immutable exact ledger'
 total=0
 for row in MANIFEST['parents']:
  data=local(row['path']).read_bytes();old=local(row['before']).read_bytes()
  assert len(data)==row['bytes']and hashlib.sha256(data).hexdigest()==row['sha256'],'SM03 complete current parent'
  assert len(old)==row['beforeBytes']and hashlib.sha256(old).hexdigest()==row['beforeSHA256'],'SM03 original parent'
  assert prior_source_material_bytes(row['path'],data)==old,'SM03 complete inverse'
  assert re.findall(rb'<path\b[^>]*\bd="([^"]+)"',data)==re.findall(rb'<path\b[^>]*\bd="([^"]+)"',old),'SM03 original all silhouettes'
  assert re.findall(rb'@[\w:.-]+="[^"]*"',data)==re.findall(rb'@[\w:.-]+="[^"]*"',old),'SM03 original callbacks'
  total+=len(data)
 assert total<=MANIFEST['maxParentTotalBytes'],'SM03 actual old parent budget'
 d=MANIFEST['display'];raw=local(d['path']).read_bytes();assert len(raw)==d['bytes']and hashlib.sha256(raw).hexdigest()==d['sha256']and len(raw)<=6500,'SM03 exact pure material display'
 for field,label in [('authority','original authority'),('oldLedgers','old ledgers'),('reusedPaintings','old paintings')]:
  for n,h in MANIFEST[field].items():assert hashlib.sha256(local(n).read_bytes()).hexdigest()==h,'SM03 '+label
 for n in MANIFEST['sourceReferences']:local(n)
 return{LEDGER,d['path'],*[r['path']for r in MANIFEST['parents']],*[r['before']for r in MANIFEST['parents']],*MANIFEST['authority'],*MANIFEST['oldLedgers'],*MANIFEST['reusedPaintings'],*MANIFEST['sourceReferences']},len(raw)
