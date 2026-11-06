from check_cend07_inventory import prior_forecast_bytes
"""Exact neutral study-list label, with all previous controllers and proofs intact."""
import json,hashlib,re
from pathlib import Path
LEDGER='art/redesign/check-uir33-label.json'
MANIFEST={'format': 'chenyuan-check-uir33-label',
 'version': 1,
 'userAcceptance': False,
 'path': 'web/src/LearningPlanner.vue',
 'bytes': 18541,
 'sha256': 'e7667d343e251cccb822ccaf742a61ff605ffa7efdb841b4c518f65984424bd4',
 'before': 'goal-4/evidence/check-uir33-01/LearningPlanner.before.vue',
 'beforeSHA256': '428d260152e9c292a55775ba8cbdbd49a2c290c9310ef1ed3ec8edb58ee0cad9',
 'operation': ['待研卷串 {{queue.length}} 卷', '研习清单 {{queue.length}} 卷'],
 'maxNativeBytes': 60000,
 'oldLedgerSHA256': 'bad1cbd7a8e23cdf505f6e055c6cf75ab4886a009a500f8f041e6ef94c58cf51',
 'sourceReferences': ['docs/decisions/0099-uir33-combination-check.md',
                      'goal-4/amendments/2026-11-04-check-uir33-01-input.md']}
def prior_check_uir33_bytes(path,raw):
 raw=prior_forecast_bytes(path,raw)
 if Path(path).name!='LearningPlanner.vue' or MANIFEST['operation'][1].encode()not in raw:return raw
 assert hashlib.sha256(raw).hexdigest()==MANIFEST['sha256'], 'CHECK UIR exact current source'
 old,new=MANIFEST['operation'];text=raw.decode();assert text.count(new)==1,'CHECK UIR unique inverse';result=text.replace(new,old,1).encode();assert hashlib.sha256(result).hexdigest()==MANIFEST['beforeSHA256'],'CHECK UIR original complete source';return result
def validate_check_uir33(root):
 root=Path(root).resolve()
 def local(n):
  p=root/n;assert p.is_file() and not p.is_symlink() and p.resolve().is_relative_to(root),'CHECK UIR local input';return p
 if not(root/LEDGER).exists():
  assert not(root/MANIFEST['path']).exists()or MANIFEST['operation'][1].encode()not in(root/MANIFEST['path']).read_bytes(),'CHECK UIR unrecorded label';return set(),0
 assert json.loads(local(LEDGER).read_text())==MANIFEST,'CHECK UIR immutable ledger';raw=prior_forecast_bytes(MANIFEST['path'],local(MANIFEST['path']).read_bytes());old=local(MANIFEST['before']).read_bytes();assert len(raw)==MANIFEST['bytes']==len(old),'CHECK UIR same source size';assert prior_check_uir33_bytes(MANIFEST['path'],raw)==old,'CHECK UIR full inverse'
 for pattern in [rb'<script setup.*?</script>',rb'<style.*?</style>',rb'@[\w:.-]+="[^"]*"']:assert re.findall(pattern,raw,re.S)==re.findall(pattern,old,re.S),'CHECK UIR scripts styles events unchanged'
 ledger=local('art/redesign/idle-preparation.json');assert hashlib.sha256(ledger.read_bytes()).hexdigest()==MANIFEST['oldLedgerSHA256'],'CHECK UIR original budget ledger';assert sum(local(r['path']).stat().st_size for r in json.loads(ledger.read_text())['files'])<=60000,'CHECK UIR original budget'
 for ref in MANIFEST['sourceReferences']:local(ref)
 return {LEDGER,MANIFEST['path'],MANIFEST['before'],*MANIFEST['sourceReferences']},len(raw)
