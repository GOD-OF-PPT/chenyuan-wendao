"""Exact source-state display inverse; original writers and animation proof remain strict."""
import hashlib,json,re
from pathlib import Path
LEDGER='art/redesign/check-ui35-source.json'
MANIFEST={'format': 'chenyuan-check-ui35-source-state',
 'version': 1,
 'userAcceptance': False,
 'maxAddedBytes': 300,
 'actualTA08Cap': 42000,
 'path': 'web/src/SourceSatchel.vue',
 'before': 'goal-4/evidence/check-uir35-03-04-cend06/before/web/src/SourceSatchel.vue',
 'beforeBytes': 5817,
 'beforeSha256': 'cd93826c381eb6877e073b9eba885b5505fe1e9745de451511ce8ceac65010c4',
 'bytes': 5930,
 'sha256': 'f28a144f928cd9358df91e600118fcb19aaef2667f9eb3cb198ccb15cc8521fd',
 'operations': [[3828, '实际持有 · 已保', '当前库'],
                [3832, '本段', ''],
                [4029, '', '<template v-if="totals&&totals.cycles>0">'],
                [4094, '', "</template><template v-else>{{totals?'首轮尚无成果':'本次尚未安排'}}</template>"]],
 'unchanged': {'web/src/source-choreography.ts': '665cb8c1d7bf0537b992b628720ff3be2bf0206536b36f487799bf67fe1f96f2',
               'web/src/ta08-source.css': '0bcaa542dca4f1dc9bb862e63ead388dee2f996bf483507d77813710181f3522',
               'web/src/SourceField.vue': '0f3a665944b28a27d52843c6bbe6e05925b3e9a5aaad8e859459fa69091c36be',
               'web/src/SourcePlanner.vue': '7b433cef8f834a2ae98ff63dbca9339c9d5012385b6cb69ca7ed21199255fac5',
               'web/src/App.vue': '9f3f6c4596d9c8d4801e5ff0fecd1f9cda7a0842a13f3083ae4613d58e14e78f',
               'web/src/store.ts': 'cc3a373bbe09df49410de3ef9bf3233a5b9481ee187b6dfef71faf38030890b7',
               'web/src/activity-clock.ts': '21fc98e4a430464a6dc3554091c022c53b17714938ae6e05491d27e1ab3f0901',
               'web/src/activity-persistence.ts': 'a5100e6f2d84b627ef17800bfc8f17f3f533566db47f35faab3833da66bab4cf',
               'web/src/full-persistence.ts': 'd2a66b5ec397b1f0a358760afa278948c113d0eccad7826a88a9b1964a0daf21',
               'src/full/activity.ts': '2630150966d2d6a441c36b013448ce4ccb604dd700b329df4a65997d0b7d8815',
               'src/full/engine.ts': '864cdae0c480f36e8ba305de5ff5dec04ac0607c2c9f362db34c21111ce82a73'},
 'sourceReferences': ['docs/decisions/0124-check-ui35-source-state-contract.md',
                      'goal-4/amendments/2026-11-06-check-uir35-03-04-cend06-input.md']}
def prior_check_ui35_source_bytes(path,raw):
 if Path(path).name!=Path(MANIFEST['path']).name or '当前库存'.encode() not in raw:return raw
 assert len(raw)==MANIFEST['bytes']and hashlib.sha256(raw).hexdigest()==MANIFEST['sha256'],'CHECK-UI35-SOURCE complete current source'
 text=raw.decode()
 for at,before,after in reversed(MANIFEST['operations']):
  assert text[at:at+len(after)]==after,'CHECK-UI35-SOURCE exact display span'
  text=text[:at]+before+text[at+len(after):]
 assert hashlib.sha256(text.encode()).hexdigest()==MANIFEST['beforeSha256'],'CHECK-UI35-SOURCE complete original source'
 return text.encode()
def validate_check_ui35_source(root):
 root=Path(root).resolve()
 def local(n):
  p=root/n;assert p.is_file()and not p.is_symlink()and p.resolve().is_relative_to(root),'CHECK-UI35-SOURCE local source';return p
 if not(root/LEDGER).exists():
  assert not(root/MANIFEST['path']).exists()or '当前库存'.encode()not in(root/MANIFEST['path']).read_bytes(),'CHECK-UI35-SOURCE missing ledger'
  return set(),0
 assert json.loads(local(LEDGER).read_text())==MANIFEST,'CHECK-UI35-SOURCE immutable scope and budgets'
 raw=local(MANIFEST['path']).read_bytes();old=local(MANIFEST['before']).read_bytes()
 assert len(raw)==MANIFEST['bytes']and hashlib.sha256(raw).hexdigest()==MANIFEST['sha256'],'CHECK-UI35-SOURCE current source'
 assert len(old)==MANIFEST['beforeBytes']and hashlib.sha256(old).hexdigest()==MANIFEST['beforeSha256'],'CHECK-UI35-SOURCE original source'
 assert prior_check_ui35_source_bytes(MANIFEST['path'],raw)==old,'CHECK-UI35-SOURCE complete inverse'
 assert len(raw)-len(old)<=300,'CHECK-UI35-SOURCE added bytes'
 assert raw.split(b'</script>')[0]==old.split(b'</script>')[0],'CHECK-UI35-SOURCE unchanged script and proof'
 assert re.findall(rb'@[\w:.-]+="[^"]*"',raw)==re.findall(rb'@[\w:.-]+="[^"]*"',old),'CHECK-UI35-SOURCE original callbacks'
 for n,h in MANIFEST['unchanged'].items():assert hashlib.sha256(local(n).read_bytes()).hexdigest()==h,'CHECK-UI35-SOURCE original rules clocks stores source identity and styling'
 ta=json.loads(local('art/redesign/ta08.json').read_text());total=sum(local(r['path']).stat().st_size for r in ta['files']);assert ta['budgets']['nativeBytes']==42000 and total<=42000,'CHECK-UI35-SOURCE actual original TA08 cap'
 for n in MANIFEST['sourceReferences']:local(n)
 return {LEDGER,MANIFEST['path'],MANIFEST['before'],*MANIFEST['unchanged'],*MANIFEST['sourceReferences']},total
