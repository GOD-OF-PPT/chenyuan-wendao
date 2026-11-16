"""Exact two-source display disclosure; original writing authority and all old caps remain."""
import hashlib,json,re
from pathlib import Path
LEDGER='art/redesign/cend08-study.json'
MANIFEST={'format': 'chenyuan-cend08-study-intent',
 'version': 1,
 'userAcceptance': False,
 'maxNativeDeltaBytes': 0,
 'newRasterAssets': 0,
 'files': {'web/src/LearningPlanner.vue': {'before': 'goal-4/evidence/cend08/before/web/src/LearningPlanner.vue',
                                           'beforeBytes': 18498,
                                           'beforeSha256': '8ab818e7af414ad482854c504d9438db11e9bde66b11252a5ed8f163238fdcf3',
                                           'bytes': 18483,
                                           'sha256': '02cae4c97de4b054acb1208fe7801b370019a08a05d9a844d9c8f245f009a503',
                                           'operations': [[9848,
                                                           'mall '
                                                           'v-if="!manualComplete">破庙交易已获得同一启迪时，不重复收费。</small><s',
                                                           ''],
                                                          [13005, '仅参悟一次 · ', ''],
                                                          [13375,
                                                           '',
                                                           ' '
                                                           'v-if="quote?.stopReason?.code!==\'CYCLES_COMPLETE\'"'],
                                                          [13444, '}}</small><small>{{planningNote', ''],
                                                          [15686,
                                                           '',
                                                           'small '
                                                           'v-if="mode===\'manual\'">破庙交易已获得同一启迪时，不重复收费。</small><'],
                                                          [17074, '完成调整 · ', '']]},
           'web/src/JadeStudyScene.vue': {'before': 'goal-4/evidence/cend08/before/web/src/JadeStudyScene.vue',
                                          'beforeBytes': 5241,
                                          'beforeSha256': '01f2ee3390241cd4edd6769fdc1a563a185c2b1f938e2290d7d4de7b50aee52f',
                                          'bytes': 5230,
                                          'sha256': 'e561a38bbdf4b4a5cb814263b541dbe1f129a8e82c140717abfc73fe145488ba',
                                          'operations': [[2420, '安排后逐卷研习', ''],
                                                         [3658, '', 'status&&('],
                                                         [3693, '', ')']]}},
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
 'sourceReferences': ['docs/decisions/0135-cend08-ui-mainline-review.md',
                      'goal-4/amendments/2026-11-09-cend08-f01-optimization.md']}
def prior_study_intent_bytes(path,raw):
 names=[n for n in MANIFEST['files']if Path(n).name==Path(path).name]
 if not names:return raw
 row=MANIFEST['files'][names[0]]
 if hashlib.sha256(raw).hexdigest()==row['beforeSha256']:return raw
 # Older historical snapshots still pass through; modified current snapshots must be exact.
 marker=b'quote?.stopReason?.code!=='if str(path).endswith('LearningPlanner.vue')else b'status&&(manual||'
 if marker not in raw:return raw
 assert len(raw)==row['bytes']and hashlib.sha256(raw).hexdigest()==row['sha256'],'SI08 complete current display source'
 text=raw.decode()
 for at,before,after in reversed(row['operations']):
  assert text[at:at+len(after)]==after,'SI08 exact display span';text=text[:at]+before+text[at+len(after):]
 assert hashlib.sha256(text.encode()).hexdigest()==row['beforeSha256'],'SI08 complete original source'
 return text.encode()
def validate_study_intent(root):
 root=Path(root).resolve()
 def local(n):
  p=root/n;assert p.is_file()and not p.is_symlink()and p.resolve().is_relative_to(root),'SI08 local source';return p
 if not(root/LEDGER).exists():
  assert all(not(root/n).exists()or hashlib.sha256((root/n).read_bytes()).hexdigest()==r['beforeSha256']for n,r in MANIFEST['files'].items()),'SI08 missing ledger';return set(),0
 m=json.loads(local(LEDGER).read_text());assert m==MANIFEST and all(type(m[k])is int for k in ['version','newRasterAssets','maxNativeDeltaBytes'])and m['userAcceptance']is False,'SI08 immutable scope/caps'
 total=0
 for n,row in MANIFEST['files'].items():
  raw=local(n).read_bytes();old=local(row['before']).read_bytes()
  assert len(raw)==row['bytes']and hashlib.sha256(raw).hexdigest()==row['sha256'],'SI08 current source'
  assert len(old)==row['beforeBytes']and hashlib.sha256(old).hexdigest()==row['beforeSha256'],'SI08 original source'
  assert prior_study_intent_bytes(n,raw)==old,'SI08 full inverse';total+=len(raw)-len(old)
  assert re.findall(rb'@[\w:.-]+="[^"]*"',raw)==re.findall(rb'@[\w:.-]+="[^"]*"',old),'SI08 original view/writing callbacks'
  assert re.findall(rb':disabled="[^"]*"',raw)==re.findall(rb':disabled="[^"]*"',old),'SI08 original action gates'
  script=raw.split(b'</script>')[0];original=old.split(b'</script>')[0]
  if n.endswith('JadeStudyScene.vue'):script=script.replace("?'此卷仅供查看 · 原安排见当前活动':''".encode(),"?'此卷仅供查看 · 原安排见当前活动':'安排后逐卷研习'".encode(),1)
  assert script==original,'SI08 original controller clock and atomic authority'
 assert total<=0,'SI08 actual native delta cap'
 for g in MANIFEST['groups'].values():
  assert hashlib.sha256(local(g['ledger']).read_bytes()).hexdigest()==g['ledgerSha256'],'SI08 original regional ledger'
  assert sum(local(n).stat().st_size for n in g['files'])<=g['cap'],'SI08 actual original regional cap'
 for n in MANIFEST['sourceReferences']:local(n)
 return {LEDGER,*MANIFEST['files'],*[r['before']for r in MANIFEST['files'].values()],*MANIFEST['sourceReferences']},total
