from uir34_04_inventory import prior_uir3404_bytes
from uir34_01_inventory import prior_uir3401_bytes
"""Exact positioning/decorative cleanup and duplicate visible stop removal."""
import hashlib,json,re
from pathlib import Path
LEDGER='art/redesign/check-uir33-02.json'
MANIFEST={'format': 'chenyuan-check-uir33-02',
 'version': 1,
 'userAcceptance': False,
 'files': {'ActionFeedbackStage.vue': {'path': 'web/src/ActionFeedbackStage.vue',
                                       'before': 'goal-4/evidence/check-uir33-02/before/web/src/ActionFeedbackStage.vue',
                                       'bytes': 11070,
                                       'beforeBytes': 10909,
                                       'sha256': '627baf033129c973a3eec1f9902914b436f2ca37ae4b45f239ef02037f8dcad2',
                                       'beforeSHA256': 'c0430cb6202624a1f4135556cfadfb17541fa38ca7d8bf29c8079080bc8ffcdb',
                                       'operations': [[' const '
                                                       "op=next.operation,family=next.family,cast=witness.forNotice(next),spot=op==='BATTLE'?battleSpot(cast):null;\n",
                                                       ' const '
                                                       "op=next.operation,family=next.family,cast=witness.forNotice(next),spot=op==='BATTLE'?battleSpot(cast):null;\n"
                                                       " if(family==='equipment'){await nextTick();await new "
                                                       'Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r())));if(owner!==generation||store.busy||store.error||document.hidden)return;}\n'],
                                                      [' const '
                                                       "selector=battle?'.enemy-art':['equipment','recovery'].includes(family)?'.character-portrait':family==='closure'?'.book-canvas':'.hub-stage,.center-column "
                                                       ".scene,[data-primary-region]';\n",
                                                       ' const '
                                                       "selector=battle?'.enemy-art':family==='equipment'?'.ta09-jade,.relic-inscription-object':family==='recovery'?'.character-portrait':family==='closure'?'.book-canvas':'.hub-stage,.center-column "
                                                       ".scene,[data-primary-region]';\n"],
                                                      ['  <span v-for="(n,index) in floats" '
                                                       ':key="notice?.key+\'-\'+index" class="action-number" '
                                                       ':class="{damage:n.value<0}" '
                                                       ':style="{left:n.x+\'px\',top:n.y+\'px\'}" '
                                                       'aria-hidden="true" :data-target="n.target" '
                                                       'data-testid="action-number">{{n.value>0?\'+\':\'\'}}{{n.value}}<small>{{n.label}}</small></span>\n'
                                                       '  <div v-if="state===\'error\'" '
                                                       'class="action-failure-glow" aria-hidden="true"/>\n',
                                                       '  <span v-for="(n,index) in floats" '
                                                       ':key="notice?.key+\'-\'+index" class="action-number" '
                                                       ':class="{damage:n.value<0}" '
                                                       ':style="{left:n.x+\'px\',top:n.y+\'px\'}" '
                                                       'aria-hidden="true" :data-target="n.target" '
                                                       'data-testid="action-number">{{n.value>0?\'+\':\'\'}}{{n.value}}<small>{{n.label}}</small></span>\n']]},
           'action-motion.css': {'path': 'web/src/action-motion.css',
                                 'before': 'goal-4/evidence/check-uir33-02/before/web/src/action-motion.css',
                                 'bytes': 11588,
                                 'beforeBytes': 11896,
                                 'sha256': 'fa4dbd48ff59877a2de4ab60ff348aba77659c520f900f2ba2f0ca119096664a',
                                 'beforeSHA256': 'b14bcc27fa59527b32e817a164ca7f546337f4520aa02f4cb7001895460bd495',
                                 'operations': [['.action-number.damage{color:#ffd3bb}.action-number '
                                                 'small{display:block;text-align:center;font-size:var(--ui14);font-weight:400;line-height:1.3;color:inherit}\n'
                                                 '.action-failure-glow{position:fixed;inset:72px 5% '
                                                 '100px;border:1px solid '
                                                 '#dba18b77;border-radius:14px;box-shadow:inset 0 0 28px '
                                                 '#c57e6233;pointer-events:none;animation:failure-ink .9s '
                                                 'ease-out both}\n',
                                                 '.action-number.damage{color:#ffd3bb}.action-number '
                                                 'small{display:block;text-align:center;font-size:var(--ui14);font-weight:400;line-height:1.3;color:inherit}\n'],
                                                ['@keyframes '
                                                 'action-number{from{opacity:0;margin-top:8px}15%,65%{opacity:1}to{opacity:0;margin-top:-45px}}\n'
                                                 '@keyframes '
                                                 'failure-ink{from{opacity:0}30%{opacity:1}to{opacity:0}}\n',
                                                 '@keyframes '
                                                 'action-number{from{opacity:0;margin-top:8px}15%,65%{opacity:1}to{opacity:0;margin-top:-45px}}\n'],
                                                ['@media(prefers-reduced-motion:reduce){.action-motion,.action-number,.action-failure-glow{display:none!important}.action-feedback-toast.hub-pulse,.command-pending,.command-success,.command-error,.actor-impact,.actor-arrival,.scene-arrival{animation:none!important}}\n'
                                                 '.hub-reduced '
                                                 ':is(.action-motion,.action-number,.action-failure-glow){display:none!important}.hub-reduced '
                                                 ':is(.action-feedback-toast,.command-pending,.command-success,.command-error,.actor-impact,.actor-arrival,.scene-arrival){animation:none!important}\n',
                                                 '@media(prefers-reduced-motion:reduce){.action-motion,.action-number{display:none!important}.action-feedback-toast.hub-pulse,.command-pending,.command-success,.command-error,.actor-impact,.actor-arrival,.scene-arrival{animation:none!important}}\n'
                                                 '.hub-reduced '
                                                 ':is(.action-motion,.action-number){display:none!important}.hub-reduced '
                                                 ':is(.action-feedback-toast,.command-pending,.command-success,.command-error,.actor-impact,.actor-arrival,.scene-arrival){animation:none!important}\n']]},
           'TrainingActivity.vue': {'path': 'web/src/TrainingActivity.vue',
                                    'before': 'goal-4/evidence/check-uir33-02/before/web/src/TrainingActivity.vue',
                                    'bytes': 7743,
                                    'beforeBytes': 7716,
                                    'sha256': '153c7621131e635df954f2467776c060ad90daf73d9c91ba82b0e2ed3e5e843a',
                                    'beforeSHA256': 'cf52d3aa3d5063585ac52dd4b0eb1ff8afc46d088c911ed6b5939ce6601e544c',
                                    'operations': [['  <small v-if="rail" class="rail-count">已完成 '
                                                    '{{a.completedCycles}} / {{a.plan.maxCycles}} '
                                                    "{{view.unit}} · {{a.version===7?'本次':'每轮'}} "
                                                    '{{a.cycleMs/1000}} 秒</small><div v-if="!rail" '
                                                    'class="training-totals" '
                                                    'data-testid="training-totals"><span>已完成 '
                                                    '{{a.completedCycles}} / {{a.plan.maxCycles}} '
                                                    '{{view.unit}}</span><span v-for="(row,index) in '
                                                    'compact&&a.version===6?brief:view.rows" '
                                                    ':key="index">{{row}}</span></div>\n',
                                                    '  <small v-if="rail" class="rail-count">已完成 '
                                                    '{{a.completedCycles}} / {{a.plan.maxCycles}} '
                                                    "{{view.unit}} · {{a.version===7?'本次':'每轮'}} "
                                                    '{{a.cycleMs/1000}} 秒</small><div v-if="!rail" '
                                                    'class="training-totals" '
                                                    'data-testid="training-totals"><span>已完成 '
                                                    '{{a.completedCycles}} / {{a.plan.maxCycles}} '
                                                    '{{view.unit}}</span><span v-for="(row,index) in '
                                                    'compact&&a.version===6?brief:view.rows.filter(row=>row!==stopped)" '
                                                    ':key="index">{{row}}</span></div>\n']]}},
 'originalLedgers': {'action-feedback': '9bef4b2288f3321a5da90870b778377afd3f407df9a0abf318034cdbc7704c75',
                     'idle-cultivation': 'b1443902e2ed89bcfd861b9704ec1a544ac1c3a0c7de7161e64d5553a3838f39'},
 'unchanged': {'web/src/action-feedback.ts': 'af4f938bd1dae6b00ed089e1fbc44eb0c3b2751cbe67786713b06d95030d88df',
               'web/src/store.ts': 'cc3a373bbe09df49410de3ef9bf3233a5b9481ee187b6dfef71faf38030890b7',
               'web/src/activity-clock.ts': '21fc98e4a430464a6dc3554091c022c53b17714938ae6e05491d27e1ab3f0901',
               'web/src/full-persistence.ts': 'd2a66b5ec397b1f0a358760afa278948c113d0eccad7826a88a9b1964a0daf21',
               'web/src/ActivityHistory.vue': '9ed8e4f3410289a33184b38182c23d2f55f71ca629a1ff0d7f5edec8a0b6e178',
               'web/src/milestone-view.ts': 'af1a2045781e806806140092349b2ecde690524436b254a0c1f326a94e108efd',
               'web/src/App.vue': '2549b27003e11cf12f44e2ba41a1053b2de996c3636110f277ac84babd1dd4fd'},
 'sourceReferences': ['docs/decisions/0103-uir33-stage-feedback-check.md',
                      'goal-4/amendments/2026-11-05-check-uir33-02-input.md']}
def prior_check_uir3302_bytes(path,raw):
 raw=prior_uir3404_bytes(path,raw)
 raw=prior_uir3401_bytes(path,raw)
 name=Path(path).name
 if name not in MANIFEST['files']:return raw
 f=MANIFEST['files'][name]
 if name=='TrainingActivity.vue' and b'.filter(row=>row!==stopped)'not in raw:return raw
 if name=='ActionFeedbackStage.vue' and b"family==='equipment'?'.ta09-jade"not in raw:return raw
 if name=='action-motion.css' and b'action-failure-glow'in raw:return raw
 if hashlib.sha256(raw).hexdigest()==f['beforeSHA256']:return raw
 # Unknown/mutated sources are never silently normalized.
 assert hashlib.sha256(raw).hexdigest()==f['sha256'],'CHECK UIR02 current complete source'
 s=raw.decode()
 for old,new in reversed(f['operations']):
  assert new and s.count(new)==1,'CHECK UIR02 unique inverse';s=s.replace(new,old,1)
 assert hashlib.sha256(s.encode()).hexdigest()==f['beforeSHA256'],'CHECK UIR02 complete original'
 return s.encode()
def validate_check_uir3302(root):
 root=Path(root).resolve()
 def local(n):
  p=root/n;assert p.is_file()and not p.is_symlink()and p.resolve().is_relative_to(root),'CHECK UIR02 local';return p
 if not(root/LEDGER).exists():return set(),0
 assert json.loads(local(LEDGER).read_text())==MANIFEST,'CHECK UIR02 exact scope'
 for name,f in MANIFEST['files'].items():
  raw=prior_uir3404_bytes(f['path'],local(f['path']).read_bytes());old=local(f['before']).read_bytes();assert len(raw)==f['bytes']and hashlib.sha256(raw).hexdigest()==f['sha256'],'CHECK UIR02 facts';assert hashlib.sha256(old).hexdigest()==f['beforeSHA256'],'CHECK UIR02 old preserved';assert prior_check_uir3302_bytes(name,raw)==old,'CHECK UIR02 inverse'
  if name=='TrainingActivity.vue':assert re.search(rb'<script.*?</script>',raw,re.S).group()==re.search(rb'<script.*?</script>',old,re.S).group(),'CHECK UIR02 original activity controller'
  if name.endswith('.vue'):assert re.findall(rb'@[\w:.-]+="[^"]*"',raw)==re.findall(rb'@[\w:.-]+="[^"]*"',old),'CHECK UIR02 events'
 for name,cap in [('action-feedback',34000),('idle-cultivation',22000)]:
  ledger=local('art/redesign/'+name+'.json');assert hashlib.sha256(ledger.read_bytes()).hexdigest()==MANIFEST['originalLedgers'][name],'CHECK UIR02 old ledger';assert sum(local(r['path']).stat().st_size for r in json.loads(ledger.read_text())['files'])<=cap,'CHECK UIR02 actual cap'
 for n,h in MANIFEST['unchanged'].items():assert hashlib.sha256(prior_uir3401_bytes(n,local(n).read_bytes())).hexdigest()==h,'CHECK UIR02 immutable owner'
 for n in MANIFEST['sourceReferences']:local(n)
 return {LEDGER,*[f[k]for f in MANIFEST['files'].values()for k in ['path','before']],*MANIFEST['unchanged'],*MANIFEST['sourceReferences']},sum(f['bytes']for f in MANIFEST['files'].values())
