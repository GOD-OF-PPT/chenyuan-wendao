from uir35_02_inventory import prior_uir3502_bytes
"""Exact presentation-only status deduplication; old controllers, full pages and caps stay strict."""
import hashlib,json
from pathlib import Path
LEDGER='art/redesign/uir34-07.json'
MANIFEST={'format': 'chenyuan-uir34-07-fate-status-dedup',
 'version': 1,
 'userAcceptance': False,
 'files': {'FateCatalogue.vue': {'path': 'web/src/FateCatalogue.vue',
                                 'bytes': 9660,
                                 'sha256': '308b57a3a1a606ae81972cf0babc9009cc729af0e955520994a8fa0181fe2017',
                                 'before': 'goal-4/evidence/uir34-07/before/web/src/FateCatalogue.vue',
                                 'beforeBytes': 9627,
                                 'beforeSHA256': 'da3efbc6ebfd68d042a07ce3e89343299b94094ad3d2590f77005e61780763a2',
                                 'operations': [[3452,
                                                 '',
                                                 'heading({key,title}:Reading){const label=person.value?.label;return '
                                                 "mode.value==='people'?label==='未识'&&['summary','temple'].includes(key)?key==='summary'?'':title:label+(title!==label?' "
                                                 "· '+title:''):title;}\n"
                                                 'function '],
                                                [4652, '" :recorded="person?.label!==\'未识\'', ''],
                                                [7928, '" class="reading-category">{{', '&&('],
                                                [7978, "?'", ')" class="reading-category">'],
                                                [8012, "':person?.label==='未识'?'人物图鉴':'已记来往'}}", ''],
                                                [8026, '', ' v-if="heading(row)"'],
                                                [8123, 'mo', 'hea'],
                                                [8127, "e==='people'?perso", 'i'],
                                                [8129, '?.label:', 'g('],
                                                [8134, '.title', ')'],
                                                [8137,
                                                 '<template v-if="mode===\'people\'&&row.title!==person?.label"> · '
                                                 '{{row.title}}</template>',
                                                 '']]},
           'EncounterTable.vue': {'path': 'web/src/EncounterTable.vue',
                                  'bytes': 5389,
                                  'sha256': '6da716adb6fd242ec6c6f7e6d9741521cb77116e1f8f4358d55fb403b96aeb8b',
                                  'before': 'goal-4/evidence/uir34-07/before/web/src/EncounterTable.vue',
                                  'beforeBytes': 5468,
                                  'beforeSHA256': '0c73263444112e4d6bc010201750dd836aaef36d03ee612868124afe8033ccf7',
                                  'operations': [[599, ':boolean;recorded?', ''],
                                                 [2923, '', ' v-if="mode!==\'people\'||pending"'],
                                                 [2974, '(pending?', ''],
                                                 [2992, ":recorded?'已记来往 · 翻读实际事实':'人物图鉴 · 尚无正式来往')", '']]}},
 'caps': {'story-journey': 48000, 'narrative-objects': 45000},
 'newRasterAssets': 0,
 'unchanged': {'web/src/App.vue': '5e6a59b75b7021914ab4bdd356ef6608ec3f391d3522c9ac6eb8272698e7146a',
               'web/src/store.ts': 'cc3a373bbe09df49410de3ef9bf3233a5b9481ee187b6dfef71faf38030890b7',
               'web/src/full-persistence.ts': 'd2a66b5ec397b1f0a358760afa278948c113d0eccad7826a88a9b1964a0daf21',
               'web/src/activity-persistence.ts': 'a5100e6f2d84b627ef17800bfc8f17f3f533566db47f35faab3833da66bab4cf',
               'web/src/activity-clock.ts': '21fc98e4a430464a6dc3554091c022c53b17714938ae6e05491d27e1ab3f0901',
               'web/src/reading-memory.ts': '8e7a0718edb07113e30f817df5ea98180455e1ea4a7f481a10c72b3657357808',
               'web/src/story-pages.ts': 'cdeff2da61fc28199b529c3394c3e881570eb0fe0bcee69770af871e8a104c9c',
               'web/src/play-flow.ts': 'ec31aeb151728b37a6de4f65f17df9020fed7407194cd02df1330a0e69ad0e76',
               'web/src/navigation.ts': 'f97fb271e8928fe48d981b4bcbeba7d655ed2a1b9036693a202a8cc433b558fc',
               'web/src/focus.ts': '8ae91e78a4db7a854c293fc4b1bc28f02dd0d542b3119cff383f9245b4944eea',
               'web/src/narrative-effects.ts': 'ca77c93e636c43fc5c57b1f7b7a3f85bef58aa00f135affe217919b64470b615',
               'web/src/use-activity-effect.ts': 'e15a7b41b897e7d4f29e8be277703efd1f8c32d2dec11d278a41a37c89425163',
               'web/src/ActionFeedbackStage.vue': '627baf033129c973a3eec1f9902914b436f2ca37ae4b45f239ef02037f8dcad2',
               'src/full/engine.ts': '864cdae0c480f36e8ba305de5ff5dec04ac0607c2c9f362db34c21111ce82a73',
               'src/full/queries.ts': 'eab721ecd066440d8babe11f36664300d21df2d1cf15f10d1160c7cb2a880d48',
               'src/full/story-context.ts': '9a4106925e7b798e7549b1062a21a74c6c08ba050971a33f95ba315ee0f79950',
               'src/full/content.ts': 'e5602fa6c0ccac95372d5f668a3234d7d6054ea5f3a4b36d72798f1b9e40878c',
               'src/full/activity.ts': '2630150966d2d6a441c36b013448ce4ccb604dd700b329df4a65997d0b7d8815'},
 'sourceReferences': ['docs/decisions/0114-fate-status-deduplication.md', 'goal-4/amendments/2026-11-06-uir34-07-input.md']}
def prior_uir3407_bytes(path,raw):
 raw=prior_uir3502_bytes(path,raw)
 name=Path(path).name
 if name not in MANIFEST['files']:return raw
 r=MANIFEST['files'][name]
 if hashlib.sha256(raw).hexdigest()==r['beforeSHA256']:return raw
 assert len(raw)==r['bytes']and hashlib.sha256(raw).hexdigest()==r['sha256'],'ART30 ART31 ART32 UIR34-07 exact complete display source'
 text=raw.decode()
 for at,old,new in reversed(r['operations']):
  assert text[at:at+len(new)]==new,'ART30 ART31 ART32 UIR34-07 exact display span'
  text=text[:at]+old+text[at+len(new):]
 assert hashlib.sha256(text.encode()).hexdigest()==r['beforeSHA256'],'ART30 ART31 ART32 UIR34-07 original whole inverse'
 return text.encode()
def validate_uir3407(root):
 root=Path(root).resolve()
 def local(n):
  p=root/n;assert p.is_file()and not p.is_symlink()and p.resolve().is_relative_to(root),'UIR34-07 local source';return p
 if not(root/LEDGER).exists():
  assert b'function heading('not in local('web/src/FateCatalogue.vue').read_bytes(),'UIR34-07 unrecorded heading'
  return set(),0
 canon=lambda j:json.dumps(j,sort_keys=True,separators=(',',':'),ensure_ascii=False)
 assert canon(json.loads(local(LEDGER).read_text()))==canon(MANIFEST),'UIR34-07 immutable typed scope'
 for r in MANIFEST['files'].values():
  raw=local(r['path']).read_bytes();old=local(r['before']).read_bytes();assert len(raw)==r['bytes']and hashlib.sha256(raw).hexdigest()==r['sha256'],'UIR34-07 actual source';assert len(old)==r['beforeBytes']and hashlib.sha256(old).hexdigest()==r['beforeSHA256'],'UIR34-07 original preserved';assert prior_uir3407_bytes(r['path'],raw)==old,'UIR34-07 inverse'
 totals={}
 for n,cap in MANIFEST['caps'].items():
  d=json.loads(local('art/redesign/'+n+'.json').read_text());total=sum(local(r['path']).stat().st_size for r in d['files']);assert total<=cap,'UIR34-07 actual original group cap';totals[n]=total
 for n,h in MANIFEST['unchanged'].items():assert hashlib.sha256(prior_uir3502_bytes(n,local(n).read_bytes())).hexdigest()==h,'UIR34-07 original model clock memory effects or authority'
 for n in MANIFEST['sourceReferences']:local(n)
 return{LEDGER,*[r[k]for r in MANIFEST['files'].values()for k in ['path','before']],*MANIFEST['unchanged'],*MANIFEST['sourceReferences']},totals['story-journey']
