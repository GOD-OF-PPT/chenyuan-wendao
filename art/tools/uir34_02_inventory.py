"""Strict finite-choice display evolution; original confirmation owners and legacy cap retained."""
import hashlib,json
from pathlib import Path
LEDGER='art/redesign/uir34-02.json'
MANIFEST={'format': 'chenyuan-finite-choice-focus-uir34-02',
 'version': 1,
 'userAcceptance': False,
 'maxNativeBytes': 30000,
 'newRasterAssets': 0,
 'files': {'MilestoneReview.vue': {'path': 'web/src/MilestoneReview.vue',
                                   'bytes': 5014,
                                   'sha256': '20de4cb9497fab63f9a4b9e4265e116d5fd05c6f7fc22c7e114e3fca2d634354',
                                   'before': 'goal-4/evidence/uir34-02/before/web/src/MilestoneReview.vue',
                                   'beforeSHA256': '8c3dd9bb9d382f102f3204195ced86b19321399b427440533e01ab6a575e3698',
                                   'operations': [[1170,
                                                   '',
                                                   'const '
                                                   "focused=computed(()=>!props.review.activity&&['CHOOSE','BREAKTHROUGH','EVENT','DECIDE','ANSWER_TRIAL'].includes(props.review.plan.action.type));\n"
                                                   'const '
                                                   "choiceEffect=computed(()=>props.review.plan.action.type==='EVENT'?`与${view.value.speaker}相见，展开「${view.value.title.replace(/^拜访 "
                                                   "· /,'')}」。`:view.value.effect);\n"
                                                   'const decisionVerb=computed(()=>{const '
                                                   'a=props.review.plan.action;return '
                                                   "a.type==='CHOOSE'?({help:'赠出回春丹',trade:'以丹换简',leave:'保留丹药'}as "
                                                   "const)[a.choice]:a.type==='EVENT'?'拜访'+view.value.speaker:a.type==='ANSWER_TRIAL'?'作答 "
                                                   "· '+view.value.title:view.value.title;});\n"],
                                                  [2017, '', '" :data-focus="focused?\'choice\':undefined'],
                                                  [2724,
                                                   '',
                                                   'div v-if="focused" '
                                                   'class="milestone-choice"><small>此举之后</small><p '
                                                   'class="milestone-effect" '
                                                   'data-testid="milestone-effect">{{choiceEffect}}</p></div><'],
                                                  [2884, '', ' v-else'],
                                                  [2949, '', ' v-if="!focused"'],
                                                  [3191, '在线 ', ''],
                                                  [3193, '', 'focused?'],
                                                  [3213, '}}', "+' 秒 · 仅本次':'在线 '+view.seconds+'"],
                                                  [3261, '', "'}}"],
                                                  [3356,
                                                   '',
                                                   '>\n'
                                                   '  <details v-if="focused" class="milestone-notes" '
                                                   'data-testid="milestone-notes"><summary>来由与执行说明</summary><ReviewPages '
                                                   ':rows="readings" :identity="review.identity"/><small>在线 '
                                                   '{{view.seconds}} 秒 · 仅一次 · '
                                                   '初值未平衡</small><small>安排保存后开始读秒；实际结算成功后才产生变化。</small></details'],
                                                  [4006, '', ' v-if="!focused"'],
                                                  [4363, '', 'focused?decisionVerb:']]},
           'idle-milestones.css': {'path': 'web/src/idle-milestones.css',
                                   'bytes': 4179,
                                   'sha256': '496d9959423622607290aab8f8d8ce35f04c1361310a7a2f9545e17fcbf03054',
                                   'before': 'goal-4/evidence/uir34-02/before/web/src/idle-milestones.css',
                                   'beforeSHA256': '4c902f46f3d7889f52409e22a9b3c22929a377b2e04e23d34521a6ba7e1db686',
                                   'operations': [[2505,
                                                   '',
                                                   '\n'
                                                   '/* Current choice first; complete original notes remain '
                                                   'one voluntary reading surface. */\n'
                                                   '.milestone-review[data-focus=choice] '
                                                   '.milestone-scene{height:auto;min-height:160px;overflow:visible;border-color:#789e8766}\n'
                                                   '.milestone-review[data-focus=choice] '
                                                   '.milestone-scene>.milestone-person{flex-basis:150px;width:150px;height:160px}\n'
                                                   '.milestone-choice{flex:1;min-width:0;padding:16px '
                                                   '20px;background:linear-gradient(90deg,#103337f5,#103337ce)}\n'
                                                   '.milestone-review .milestone-choice '
                                                   '.milestone-effect{border:0;padding:0;margin:6px '
                                                   '0;font-size:22px;line-height:1.55;color:#e5e9cc}\n'
                                                   '.milestone-review[data-focus=choice] '
                                                   '.milestone-facts{align-items:center;border-bottom:1px '
                                                   'solid #829d7b44;padding:6px 0;gap:20px}\n'
                                                   '.milestone-review[data-focus=choice] '
                                                   '.milestone-boundary{margin:8px 0}\n'
                                                   '.milestone-notes{margin:8px '
                                                   "0;color:#d3dfcd}.milestone-notes>summary{display:flex;align-items:center;min-height:44px;cursor:pointer;gap:10px;font-size:18px;list-style:none}.milestone-notes>summary::before{content:'＋';color:#b9dba7}.milestone-notes[open]>summary::before{content:'−'}.milestone-notes>summary:focus-visible{outline:2px "
                                                   'solid #c6e0a8;outline-offset:2px}\n'
                                                   '.milestone-notes .review-pages{margin:4px 0 '
                                                   '8px}.milestone-review .milestone-notes '
                                                   '.reading-text{padding:10px '
                                                   '14px!important;min-height:100px}.milestone-review '
                                                   '.milestone-notes .reading-text '
                                                   'p{font-size:18px!important;line-height:1.55}\n'
                                                   '.milestone-notes>small{display:block;margin:4px 0}\n'
                                                   '.milestone-review[data-focus=choice] '
                                                   'footer{justify-content:flex-end;margin-top:8px;padding-top:8px}.milestone-review[data-focus=choice] '
                                                   'footer button{min-width:240px;max-width:100%}\n'
                                                   '\n'
                                                   '.milestone-notes:not([open])>:not(summary){display:none}\n']]}},
 'unchanged': {'web/src/milestone-view.ts': 'af1a2045781e806806140092349b2ecde690524436b254a0c1f326a94e108efd',
               'web/src/ReviewPages.vue': '174210329c8aa9af93839f2a54cac0d8d76c50362c862bbc79096ecfeb92e7e2',
               'web/src/App.vue': 'ecffa3d113dd0980f272b56e809c379d8fe87842f80aef7298db234dd3e97ec0',
               'web/src/focus.ts': '8ae91e78a4db7a854c293fc4b1bc28f02dd0d542b3119cff383f9245b4944eea',
               'web/src/store.ts': 'cc3a373bbe09df49410de3ef9bf3233a5b9481ee187b6dfef71faf38030890b7',
               'web/src/full-persistence.ts': 'd2a66b5ec397b1f0a358760afa278948c113d0eccad7826a88a9b1964a0daf21',
               'web/src/activity-persistence.ts': 'a5100e6f2d84b627ef17800bfc8f17f3f533566db47f35faab3833da66bab4cf',
               'web/src/activity-clock.ts': '21fc98e4a430464a6dc3554091c022c53b17714938ae6e05491d27e1ab3f0901',
               'web/src/art18-ui.css': '2a536ea2393e233d0d610bb9feb1af1fd74d906592b3abd4e2b24340a639b947',
               'src/full/engine.ts': '864cdae0c480f36e8ba305de5ff5dec04ac0607c2c9f362db34c21111ce82a73',
               'src/full/queries.ts': 'eab721ecd066440d8babe11f36664300d21df2d1cf15f10d1160c7cb2a880d48',
               'src/full/activity.ts': '2630150966d2d6a441c36b013448ce4ccb604dd700b329df4a65997d0b7d8815',
               'src/full/milestones.ts': 'e91f58cf0002945f679649964b5a70e7226e0890b623719b24df2c02bac09492',
               'src/full/receipts.ts': '185597443e21bf88949232a97afa426410b0dcc8ce8e07cf240a08af0f2dd0ae'},
 'sourceReferences': ['docs/decisions/0108-finite-choice-focus-uir34-02-contract.md',
                      'goal-4/amendments/2026-11-05-uir34-02-input.md']}
def prior_uir3402_bytes(path,raw):
 name=Path(path).name
 if name not in MANIFEST['files']:return raw
 row=MANIFEST['files'][name]
 if hashlib.sha256(raw).hexdigest()==row['beforeSHA256']:return raw
 assert hashlib.sha256(raw).hexdigest()==row['sha256'],'UIR34-02 exact complete source'
 text=raw.decode()
 for at,old,new in reversed(row['operations']):
  assert text[at:at+len(new)]==new,'UIR34-02 exact display span'
  text=text[:at]+old+text[at+len(new):]
 assert hashlib.sha256(text.encode()).hexdigest()==row['beforeSHA256'],'UIR34-02 full original inverse'
 return text.encode()
def validate_uir3402(root):
 root=Path(root).resolve()
 def local(n):
  p=root/n;assert p.is_file()and not p.is_symlink()and p.resolve().is_relative_to(root),'UIR34-02 local source';return p
 if not(root/LEDGER).exists():
  assert b'data-focus="focused?'not in local('web/src/MilestoneReview.vue').read_bytes(),'UIR34-02 unrecorded focus'
  return set(),0
 assert json.loads(local(LEDGER).read_text())==MANIFEST,'UIR34-02 immutable scope'
 for name,r in MANIFEST['files'].items():
  raw=local(r['path']).read_bytes();old=local(r['before']).read_bytes();assert len(raw)==r['bytes']and hashlib.sha256(raw).hexdigest()==r['sha256'],'UIR34-02 actual complete source';assert hashlib.sha256(old).hexdigest()==r['beforeSHA256'],'UIR34-02 original preserved';assert prior_uir3402_bytes(name,raw)==old,'UIR34-02 inverse'
 total=sum(local(n).stat().st_size for n in ['web/src/MilestoneReview.vue','web/src/milestone-view.ts','web/src/idle-milestones.css']);assert total<=30000,'UIR34-02 original milestone cap'
 for n,h in MANIFEST['unchanged'].items():assert hashlib.sha256(local(n).read_bytes()).hexdigest()==h,'UIR34-02 original rules owners and style'
 for n in MANIFEST['sourceReferences']:local(n)
 return{LEDGER,*MANIFEST['sourceReferences'],*[r[k]for r in MANIFEST['files'].values()for k in ['path','before']],*MANIFEST['unchanged']},total
