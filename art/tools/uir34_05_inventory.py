"""Exact presentation-only evolution for the original trial and life confirmations."""
import hashlib,json
from pathlib import Path
LEDGER='art/redesign/uir34-05.json'
MANIFEST={'format': 'chenyuan-uir34-05-trial-life-focus',
 'version': 1,
 'userAcceptance': False,
 'path': 'web/src/App.vue',
 'bytes': 159630,
 'sha256': '5e6a59b75b7021914ab4bdd356ef6608ec3f391d3522c9ac6eb8272698e7146a',
 'before': 'goal-4/evidence/uir34-05/before/web/src/App.vue',
 'beforeSHA256': 'ecffa3d113dd0980f272b56e809c379d8fe87842f80aef7298db234dd3e97ec0',
 'operations': [[140094, '    ', ''],
                [140144, '', ' closure-focus'],
                [140276, '      ', ''],
                [140305, '        ', ''],
                [140448, '        ', ''],
                [140590, '', 'details class="milestone-notes"><summary>此生记录与保存说明</summary><'],
                [140744, '', 'details></'],
                [140781, '        ', ''],
                [140987, '        ', ''],
                [141103, '        ', ''],
                [141154, '        ', ''],
                [141166, '        ', ''],
                [141188, '', '不耗物，'],
                [141211, '        ', ''],
                [141304, '        ', ''],
                [141384, '        ', ''],
                [141530, '        ', ''],
                [141630, '        ', ''],
                [141891, '      ', ''],
                [141903, '    ', ''],
                [141913, '    ', ''],
                [141968, '', ' closure-focus'],
                [142101, '      ', ''],
                [142135, '        ', ''],
                [142234, '        ', ''],
                [142355, '本次', ''],
                [142358, '在线完成并保存后', '·不耗物，'],
                [142370, '，不再继续', '。'],
                [142375, '或', '与'],
                [142378, '。当前物品、配装与人物记录保留', '结束'],
                [142382, '新增道具或上界玩法', '能继续此卷'],
                [142391, '', '><details class="milestone-notes"><summary>此生来路与保存说明</summary'],
                [142553, '', 'p>本次12秒在线完成并保存后以所选结尾封卷，不再继续本卷修炼或战斗。当前物品、配装与人物记录保留，不新增道具或上界玩法。</p></details><'],
                [142657, '        ', ''],
                [142864, '        ', ''],
                [142953, '        ', ''],
                [143024, '        ', ''],
                [143566, '        ', ''],
                [143578, '        ', ''],
                [143681, '        ', ''],
                [143766, '        ', ''],
                [143928, '        ', ''],
                [144038, '        ', ''],
                [144263, '      ', ''],
                [144275, '    ', ''],
                [146323, '    ', ''],
                [146374, '', ' closure-focus'],
                [146513, '      ', ''],
                [146543, '        ', ''],
                [146633, '        ', ''],
                [146744, '。安排不扣物；', ' · '],
                [146752, '完', '</p><p>登台后先问心，再迎三关；此举只入场，不代表渡劫'],
                [146783, '后，扣物、', '功。</p><details class="milestone-notes"><summary>'],
                [146836, '问心同次保存成功才进', ''],
                [146837, '。', '场说明'],
                [146842, 'p', 'summary'],
                [146945, '', 'p>安排不扣物；在线15秒完成后，扣物、完整准备与问心同次保存成功才进入。</p></details><'],
                [147025, '        ', ''],
                [147279, '        ', ''],
                [147401, '        ', ''],
                [147619, '        ', ''],
                [147744, '        ', ''],
                [148125, '        ', ''],
                [148171, '        ', ''],
                [148183, '        ', ''],
                [148284, '        ', ''],
                [148371, '        ', ''],
                [148527, '        ', ''],
                [148635, '        ', ''],
                [148831, '      ', ''],
                [148843, '    ', ''],
                [149074, '', '<style src="./closure-focus.css"></style>']],
 'css': {'path': 'web/src/closure-focus.css', 'bytes': 871, 'sha256': '06bad1b43bf9290050ebcd77bb51ef2572d78601410a9d8a7b4de1c84e0a38a0'},
 'originalAppCap': 159635,
 'maxNewCssBytes': 2200,
 'newRasterAssets': 0,
 'unchanged': {'web/src/store.ts': 'cc3a373bbe09df49410de3ef9bf3233a5b9481ee187b6dfef71faf38030890b7',
               'web/src/full-persistence.ts': 'd2a66b5ec397b1f0a358760afa278948c113d0eccad7826a88a9b1964a0daf21',
               'web/src/activity-persistence.ts': 'a5100e6f2d84b627ef17800bfc8f17f3f533566db47f35faab3833da66bab4cf',
               'web/src/activity-clock.ts': '21fc98e4a430464a6dc3554091c022c53b17714938ae6e05491d27e1ab3f0901',
               'web/src/milestone-view.ts': 'af1a2045781e806806140092349b2ecde690524436b254a0c1f326a94e108efd',
               'web/src/focus.ts': '8ae91e78a4db7a854c293fc4b1bc28f02dd0d542b3119cff383f9245b4944eea',
               'web/src/ReviewPages.vue': '174210329c8aa9af93839f2a54cac0d8d76c50362c862bbc79096ecfeb92e7e2',
               'src/full/engine.ts': '864cdae0c480f36e8ba305de5ff5dec04ac0607c2c9f362db34c21111ce82a73',
               'src/full/activity.ts': '2630150966d2d6a441c36b013448ce4ccb604dd700b329df4a65997d0b7d8815',
               'src/full/queries.ts': 'eab721ecd066440d8babe11f36664300d21df2d1cf15f10d1160c7cb2a880d48',
               'web/src/idle-milestones.css': '496d9959423622607290aab8f8d8ce35f04c1361310a7a2f9545e17fcbf03054'},
 'sourceReferences': ['docs/decisions/0112-trial-life-confirmation-focus.md', 'goal-4/amendments/2026-11-06-uir34-05-input.md']}
def prior_uir3405_bytes(path,raw):
 if Path(path).name!='App.vue' or b'closure-focus' not in raw:return raw
 assert len(raw)==MANIFEST['bytes'] and hashlib.sha256(raw).hexdigest()==MANIFEST['sha256'],'UIR34-01 UIR34-05 exact complete source'
 text=raw.decode()
 for at,old,new in reversed(MANIFEST['operations']):
  assert text[at:at+len(new)]==new,'UIR34-01 UIR34-05 exact presentation span'
  text=text[:at]+old+text[at+len(new):]
 assert hashlib.sha256(text.encode()).hexdigest()==MANIFEST['beforeSHA256'],'UIR34-01 UIR34-05 complete original inverse'
 return text.encode()
def validate_uir3405(root):
 root=Path(root).resolve()
 def local(n):
  p=root/n;assert p.is_file() and not p.is_symlink() and p.resolve().is_relative_to(root),'UIR34-05 local source';return p
 if not(root/LEDGER).exists():
  assert b'closure-focus' not in local(MANIFEST['path']).read_bytes(),'UIR34-05 unrecorded view'
  return set(),0
 assert json.loads(local(LEDGER).read_text())==MANIFEST,'UIR34-05 immutable scope'
 raw=local(MANIFEST['path']).read_bytes();old=local(MANIFEST['before']).read_bytes()
 assert len(raw)==MANIFEST['bytes'] and hashlib.sha256(raw).hexdigest()==MANIFEST['sha256'],'UIR34-05 actual source'
 assert hashlib.sha256(old).hexdigest()==MANIFEST['beforeSHA256'] and prior_uir3405_bytes(MANIFEST['path'],raw)==old,'UIR34-05 original complete preserved'
 assert len(raw)<=159635,'UIR34-05 original App cap'
 css=local(MANIFEST['css']['path']).read_bytes();assert len(css)==MANIFEST['css']['bytes'] and hashlib.sha256(css).hexdigest()==MANIFEST['css']['sha256'],'UIR34-05 actual CSS'
 assert len(css)<=2200,'UIR34-05 local style cap'
 for n,h in MANIFEST['unchanged'].items():assert hashlib.sha256(local(n).read_bytes()).hexdigest()==h,'UIR34-05 original writer clock or reading'
 for n in MANIFEST['sourceReferences']:local(n)
 return {LEDGER,MANIFEST['path'],MANIFEST['before'],MANIFEST['css']['path'],*MANIFEST['unchanged'],*MANIFEST['sourceReferences']},len(css)
