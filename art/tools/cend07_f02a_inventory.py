from cend08_study_inventory import prior_study_intent_bytes
"""Exact three-source power-study hierarchy, with original callbacks and caps."""
import hashlib,json,re
from pathlib import Path
LEDGER='art/redesign/cend07-f02a.json'
MANIFEST={'format': 'chenyuan-cend07-f02a-power-focus',
 'version': 1,
 'userAcceptance': False,
 'newRasterAssets': 0,
 'maxNativeDeltaBytes': 0,
 'files': {'web/src/JadeEngraving.vue': {'before': 'goal-4/evidence/cend07-f02a/before/web/src/JadeEngraving.vue',
                                         'beforeBytes': 6933,
                                         'beforeSha256': 'f08b03fa397ec566a6ff51ebeb181c7a93e8e6e7974f0c7c6397bd36e7d6814b',
                                         'bytes': 6947,
                                         'sha256': '028859e4652c0af684e3d4b94ad73d7df0671003a1b17fa6993e05991931c141',
                                         'operations': [[6810, '', ' v-if="manual"']]},
           'web/src/JadeStudyScene.vue': {'before': 'goal-4/evidence/cend07-f02a/before/web/src/JadeStudyScene.vue',
                                          'beforeBytes': 5284,
                                          'beforeSha256': '750a2ced6b1f307e42b44417b430a0069af792c286e324474c412b5f731453d0',
                                          'bytes': 5241,
                                          'sha256': '01f2ee3390241cd4edd6769fdc1a563a185c2b1f938e2290d7d4de7b50aee52f',
                                          'operations': [[2171, 'props.manual?', ''],
                                                         [2186, "':equipped.value?'静心展读':'已掌握 · 无需重复研习", ''],
                                                         [3659, '', 'v-if="manual||state!==\'mastered\'" ']]},
           'web/src/LearningPlanner.vue': {'before': 'goal-4/evidence/cend07-f02a/before/web/src/LearningPlanner.vue',
                                           'beforeBytes': 18522,
                                           'beforeSha256': 'ce4e014d1b0d692558541791da82a48f33208f5623103482e0ad1fb12395d58b',
                                           'bytes': 18498,
                                           'sha256': '8ab818e7af414ad482854c504d9438db11e9bde66b11252a5ed8f163238fdcf3',
                                           'operations': [[2368,
                                                           '',
                                                           '));\n'
                                                           'const '
                                                           'known=computed(()=>props.game.learned.includes(selected.value'],
                                                          [8866, '', 'v-if="mode===\'manual\'||queue.length" '],
                                                          [9031, "mode==='skills'&&!queue.length?'仅查看':", ''],
                                                          [9145, '', 'style="margin-left:auto" '],
                                                          [9235, 'game.lear', 'k'],
                                                          [9237, 'ed.i', 'ow'],
                                                          [9240, 'cludes(selected)', ''],
                                                          [11125, '', 'strong '],
                                                          [11133, '', 'ata-test'],
                                                          [11142, 'v class', 'd'],
                                                          [11150,
                                                           '',
                                                           '-reason">{{known?currentSlot===selected?\'当前\'+slots[skill.slot]:\'已掌握\':unit?.failure?.message}}</strong><component '
                                                           ':is="known?\'details\':\'div\'"><summary v-if="known" '
                                                           'style="m'],
                                                          [11323, '', '-hei'],
                                                          [11328, '', 'ht:44px;font'],
                                                          [11341, 'f', 'size:18px">初习资料</summ'],
                                                          [11363, 'cts"', 'ry'],
                                                          [11420, 's', '/co'],
                                                          [11424, 'all data-testid="learn-reas', 'p'],
                                                          [11427, '">{{gam', ''],
                                                          [11428, '.lear', ''],
                                                          [11429, 'ed.includes(selec', ''],
                                                          [11430,
                                                           "ed)?'已掌握，无需再次研习；可原地比较配装':unit?.failure?.message}}</small></div",
                                                           ''],
                                                          [11804, 'game.lear', 'k'],
                                                          [11806, 'ed.i', 'ow'],
                                                          [11809, 'cludes(selected)', ''],
                                                          [12208,
                                                           'trong v-else '
                                                           'class="art10-equipped-fact">此法已在当前{{slots[skill.slot]}}</strong><s',
                                                           ''],
                                                          [12219, 'game.lear', 'k'],
                                                          [12221, 'ed.i', 'ow'],
                                                          [12224, 'cludes(selected)', ''],
                                                          [12777, 'game.lear', 'k'],
                                                          [12779, 'ed.i', 'ow'],
                                                          [12782, 'cludes(selected)', '']]}},
 'groups': {'idle-preparation': {'ledger': 'art/redesign/idle-preparation.json',
                                 'ledgerSha256': 'bad1cbd7a8e23cdf505f6e055c6cf75ab4886a009a500f8f041e6ef94c58cf51',
                                 'cap': 60000,
                                 'files': ['web/src/LearningPlanner.vue',
                                           'web/src/MarketPlanner.vue',
                                           'web/src/RecoveryPlanner.vue',
                                           'web/src/ConfigurationDialog.vue',
                                           'web/src/preparation-view.ts',
                                           'web/src/idle-preparation.css']},
            'art03': {'ledger': 'art/redesign/art03.json',
                      'ledgerSha256': 'a2a078e6ee338a17286a6c159767334f26a2698cd5848767932993ad7f124cef',
                      'cap': 45000,
                      'files': ['web/src/JadeStudyScene.vue',
                                'web/src/RelicAtelier.vue',
                                'web/src/LoadoutConstellation.vue',
                                'web/src/equipment-effects.ts',
                                'web/src/art03-equipment.css']},
            'ta09': {'ledger': 'art/redesign/ta09.json',
                     'ledgerSha256': 'b52562bd4fc17b77cf00a171beec5624361a7c0ba1bb13160220299b2cfca76d',
                     'cap': 30000,
                     'files': ['web/src/JadeEngraving.vue',
                               'web/src/StudyQueueRail.vue',
                               'web/src/RelicInscription.vue',
                               'web/src/equipment-choreography.ts',
                               'web/src/ta09-equipment.css']}},
 'sourceReferences': ['docs/decisions/0129-power-study-cend07-f02a.md',
                      'goal-4/amendments/2026-11-07-cend07-f02a-input.md',
                      'goal-4/research/cend07-f02a-sources.json']}
MARKERS={'LearningPlanner.vue':b'const known=computed(', 'JadeStudyScene.vue':b'v-if="manual||state', 'JadeEngraving.vue':'<small v-if="manual">只查看卷面'.encode()}
def current_power_bytes(path,raw):
 try:return prior_study_intent_bytes(path,raw)
 except AssertionError as error:raise AssertionError("PF02 parent: "+str(error))from error
def prior_power_focus_bytes(path,raw):
 raw=current_power_bytes(path,raw)
 name=Path(path).name;names=[n for n in MANIFEST['files']if Path(n).name==name]
 if not names:return raw
 row=MANIFEST['files'][names[0]]
 if hashlib.sha256(raw).hexdigest()==row['beforeSha256']:return raw
 if MARKERS[name]not in raw:return raw
 assert len(raw)==row['bytes']and hashlib.sha256(raw).hexdigest()==row['sha256'],'PF02 complete current source'
 text=raw.decode()
 for at,before,after in reversed(row['operations']):
  assert text[at:at+len(after)]==after,'PF02 exact display span';text=text[:at]+before+text[at+len(after):]
 assert hashlib.sha256(text.encode()).hexdigest()==row['beforeSha256'],'PF02 complete original source'
 return text.encode()
def validate_power_focus(root):
 root=Path(root).resolve()
 def local(n):
  p=root/n;assert p.is_file()and not p.is_symlink()and p.resolve().is_relative_to(root),'PF02 local source';return p
 if not(root/LEDGER).exists():
  assert not any((root/n).exists()and MARKERS[Path(n).name]in(root/n).read_bytes()for n in MANIFEST['files']),'PF02 missing ledger';return set(),0
 assert json.loads(local(LEDGER).read_text())==MANIFEST,'PF02 immutable scope/caps'
 total=0
 for n,row in MANIFEST['files'].items():
  raw=current_power_bytes(n,local(n).read_bytes());old=local(row['before']).read_bytes();assert len(raw)==row['bytes']and hashlib.sha256(raw).hexdigest()==row['sha256'],'PF02 current source';assert len(old)==row['beforeBytes']and hashlib.sha256(old).hexdigest()==row['beforeSha256'],'PF02 original source';assert prior_power_focus_bytes(n,raw)==old,'PF02 full inverse';total+=len(raw)-len(old)
  assert re.findall(rb'@[\w:.-]+="[^"]*"',raw)==re.findall(rb'@[\w:.-]+="[^"]*"',old),'PF02 original view and writing callbacks'
  assert re.findall(rb'<style.*?</style>',raw,re.S)==re.findall(rb'<style.*?</style>',old,re.S),'PF02 original styles'
  if n.endswith('JadeEngraving.vue'):assert raw.split(b'</script>')[0]==old.split(b'</script>')[0],'PF02 actual object logic'
  if n.endswith('LearningPlanner.vue'):assert raw.split(b'</script>')[0].replace(b'const known=computed(()=>props.game.learned.includes(selected.value));\n',b'')==old.split(b'</script>')[0],'PF02 actual planner authority'
 assert total<=0,'PF02 native delta cap'
 for g in MANIFEST['groups'].values():
  assert hashlib.sha256(local(g['ledger']).read_bytes()).hexdigest()==g['ledgerSha256'],'PF02 unchanged regional ledger';assert sum(local(n).stat().st_size for n in g['files'])<=g['cap'],'PF02 actual original cap'
 for n in MANIFEST['sourceReferences']:local(n)
 return {LEDGER,*MANIFEST['files'],*[r['before']for r in MANIFEST['files'].values()],*MANIFEST['sourceReferences']},total
