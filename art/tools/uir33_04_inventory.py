"""Book hierarchy only; all originals reconstruct exactly and old budgets remain fixed."""
from check_uir33_inventory import prior_check_uir33_bytes
import hashlib,json
from pathlib import Path
LEDGER='art/redesign/uir33-04.json'
FACTS={'CultivationNotes.vue': {'path': 'web/src/CultivationNotes.vue',
                          'bytes': 4792,
                          'sha256': '737cad4a765449a05afc178f50b6f22201ae9fd4649ef550f71541e6d6692a32',
                          'before': 'goal-4/evidence/uir33-04/before/web/src/CultivationNotes.vue',
                          'beforeSHA256': 'c064e668917663c1c353862402db79098ff68900e36e3b87eaf1f8431eaa4349'},
 'JadeStudyScene.vue': {'path': 'web/src/JadeStudyScene.vue',
                        'bytes': 5284,
                        'sha256': '750a2ced6b1f307e42b44417b430a0069af792c286e324474c412b5f731453d0',
                        'before': 'goal-4/evidence/uir33-04/before/web/src/JadeStudyScene.vue',
                        'beforeSHA256': 'dda0b1d8b6dd0e87af53e6cd2a8992bae1486003e6608f8d116f51382df27e7d'},
 'LearningPlanner.vue': {'path': 'web/src/LearningPlanner.vue',
                         'bytes': 18541,
                         'sha256': '428d260152e9c292a55775ba8cbdbd49a2c290c9310ef1ed3ec8edb58ee0cad9',
                         'before': 'goal-4/evidence/uir33-04/before/web/src/LearningPlanner.vue',
                         'beforeSHA256': '53d96fb4089c2e4f6adb38e2521f25a50ca8b560229e3d6a654cf0dfcd05bb4c'}}
MANIFEST={'format': 'chenyuan-study-notes-uir33-04',
 'version': 1,
 'userAcceptance': False,
 'newRasterAssets': 0,
 'maxAddedNativeBytes': 2500,
 'added': {'path': 'web/src/StudyNotes.vue',
           'bytes': 477,
           'sha256': 'aa386bcdbe90d2d9b0b3acfaabb839f0d209b20dad4f0604d9ccda2953c8db5f'},
 'sourceReferences': ['docs/decisions/0098-study-hierarchy-uir33-04-contract.md',
                      'goal-4/amendments/2026-11-04-uir33-04-input.md',
                      'goal-4/research/uir33-04-sources.json',
                      'art/redesign/uir33-04-edits.json',
                      'goal-4/evidence/uir33-04/before/web/src/CultivationNotes.vue',
                      'goal-4/evidence/uir33-04/before/web/src/JadeStudyScene.vue',
                      'goal-4/evidence/uir33-04/before/web/src/LearningPlanner.vue'],
 'oldLedgers': {'art03': 'a2a078e6ee338a17286a6c159767334f26a2698cd5848767932993ad7f124cef',
                'idle-preparation': 'bad1cbd7a8e23cdf505f6e055c6cf75ab4886a009a500f8f041e6ef94c58cf51',
                'art15': 'f93c941d6f799a296b67c1ceec19831cf7c398d2193ba9f3241aa40c404c24ca'}}
OPERATIONS={'web/src/CultivationNotes.vue': [["purpose?:string}>(),{purpose:'安排 · 取舍 · "
                                   "回看'}",
                                   "purpose?:string;label?:string;prefix?:string;selection?:string;rich?:boolean}>(),{purpose:'安排 "
                                   '· 取舍 · '
                                   "回看',label:'修行手记',prefix:'cultivation',selection:'button',rich:false}"],
                                  ["!event.target.closest('button')",
                                   '!event.target.closest(props.selection)'],
                                  ['data-testid="cultivation-notes-open"',
                                   ':data-testid="prefix+\'-notes-open\'"'],
                                  ['<strong>修行手记</strong>',
                                   '<strong>{{label}}</strong>'],
                                  ['class="cultivation-notes-dialog" '
                                   'data-testid="cultivation-notes-dialog"',
                                   'class="cultivation-notes-dialog" '
                                   ':class="{\'notes-rich-dialog\':rich}" '
                                   ':data-testid="prefix+\'-notes-dialog\'"'],
                                  ['data-dialog-initial>修行手记</h3>',
                                   'data-dialog-initial>{{label}}</h3>'],
                                  ['data-testid="cultivation-notes-close"',
                                   ':data-testid="prefix+\'-notes-close\'"'],
                                  ['class="cultivation-notes-options" '
                                   'aria-label="修行手记条目"',
                                   'class="cultivation-notes-options" '
                                   ':class="{\'notes-rich\':rich}" '
                                   ':aria-label="label+\'条目\'"'],
                                  ['.cultivation-notes-options :deep(button){',
                                   '.cultivation-notes-options:not(.notes-rich) '
                                   ':deep(button){'],
                                  ['.cultivation-notes-options>:deep(button+button)',
                                   '.cultivation-notes-options:not(.notes-rich)>:deep(button+button)'],
                                  [':global(.hub-reduced',
                                   '.cultivation-notes-dialog.notes-rich-dialog{width:960px}\n'
                                   ':global(.hub-reduced']],
 'web/src/JadeStudyScene.vue': [['import CatalogueArt from '
                                 "'./CatalogueArt.vue';",
                                 'import CatalogueArt from '
                                 "'./CatalogueArt.vue';\n"
                                 "import StudyNotes from './StudyNotes.vue';"],
                                ["equipped.value?'此法已装配':'已经掌握",
                                 "equipped.value?'静心展读':'已经掌握"],
                                ['<StudyQueueRail class="art10-scroll-rail" '
                                 'v-if="!manual"',
                                 '<StudyNotes v-if="!manual" '
                                 ':identity="game.core.runId+game.core.player.realm+game.status"><StudyQueueRail '
                                 'class="art10-scroll-rail"'],
                                ['</template></StudyQueueRail>',
                                 '</template></StudyQueueRail></StudyNotes>'],
                                ["'择卷入席 · 安排后自动逐卷研习'", "'安排后逐卷研习'"],
                                ['已经掌握 · 无需重复研习', '已掌握 · 无需重复研习']],
 'web/src/LearningPlanner.vue': [['<div class="learning-slot">',
                                  '<div v-if="currentSlot!==selected" '
                                  'class="learning-slot">'],
                                 ["<strong>{{currentSlot?C.skills[currentSlot].name:'尚未装备'}}</strong><span>所选：{{skill.name}}</span>",
                                  "<strong>{{currentSlot?C.skills[currentSlot].name:'尚未装备'}}</strong>"]]}
CAPS={'art03': 45000, 'idle-preparation': 60000, 'art15': 6000}
MARKERS={'CultivationNotes.vue':'prefix?:string','JadeStudyScene.vue':'import StudyNotes','LearningPlanner.vue':'v-if="currentSlot!==selected"'}
def prior_uir3304_bytes(path,raw):
 raw=prior_check_uir33_bytes(path,raw)
 name=Path(path).name
 if name not in FACTS or MARKERS[name].encode() not in raw:return raw
 f=FACTS[name];assert hashlib.sha256(raw).hexdigest()==f['sha256'], 'UIR33-04 complete current parent'
 text=raw.decode()
 for before,after in reversed(OPERATIONS[f['path']]):
  assert after and text.count(after)==1, 'UIR33-04 unique inverse'
  text=text.replace(after,before,1)
 assert hashlib.sha256(text.encode()).hexdigest()==f['beforeSHA256'], 'UIR33-04 complete original parent'
 return text.encode()
def validate_uir3304(root):
 root=Path(root).resolve()
 def local(n):
  p=root/n
  assert p.is_file() and not p.is_symlink() and p.resolve().is_relative_to(root), 'UIR33-04 local source'
  return p
 if not(root/LEDGER).exists():
  assert not(root/MANIFEST['added']['path']).exists(), 'UIR33-04 unrecorded book'
  return set(),0
 assert json.loads(local(LEDGER).read_text())==MANIFEST, 'UIR33-04 exact ledger'
 assert json.loads(local('art/redesign/uir33-04-edits.json').read_text())==OPERATIONS, 'UIR33-04 exact edits'
 for name,f in FACTS.items():
  raw=prior_check_uir33_bytes(f['path'],local(f['path']).read_bytes());before=local(f['before']).read_bytes()
  assert len(raw)==f['bytes'] and hashlib.sha256(raw).hexdigest()==f['sha256'], 'UIR33-04 complete current source'
  assert hashlib.sha256(before).hexdigest()==f['beforeSHA256'], 'UIR33-04 preserved source'
  assert prior_uir3304_bytes(name,raw)==before, 'UIR33-04 complete inverse'
 v=MANIFEST['added'];raw=local(v['path']).read_bytes()
 assert len(raw)==v['bytes']<=2500 and hashlib.sha256(raw).hexdigest()==v['sha256'], 'UIR33-04 exact readonly wrapper'
 for n,cap in CAPS.items():
  p=local('art/redesign/'+n+'.json');assert hashlib.sha256(p.read_bytes()).hexdigest()==MANIFEST['oldLedgers'][n], 'UIR33-04 old ledger immutable'
  assert sum(local(r['path']).stat().st_size for r in json.loads(p.read_text())['files'])<=cap, 'UIR33-04 original actual cap'
 for n in MANIFEST['sourceReferences']:local(n)
 return {LEDGER,v['path'],*[f['path']for f in FACTS.values()],*MANIFEST['sourceReferences']},len(raw)
