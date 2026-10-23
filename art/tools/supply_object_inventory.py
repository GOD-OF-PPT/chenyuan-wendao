"""ART04 code identity/budget and real consumers; no visual or human-acceptance claim."""
import hashlib,json

NATIVE=['web/src/InventoryStage.vue','web/src/MarketCounter.vue','web/src/RecoveryRitual.vue','web/src/supply-effects.ts']
REFS=['docs/decisions/0026-supplies-object-art-contract.md','goal-4/amendments/2026-10-23-art04.md','goal-4/research/art04-sources.json']
BINDINGS={
 'web/src/GoodsPanel.vue':['import InventoryStage', '<InventoryStage', '#directory'],
 'web/src/MarketPlanner.vue':['import MarketCounter', '<MarketCounter', '#decision'],
 'web/src/RecoveryPlanner.vue':['import RecoveryRitual', '<RecoveryRitual', '#decision'],
 'web/src/MarketCounter.vue':['useSupplyCycle', 'market-counter'],
 'web/src/RecoveryRitual.vue':['useSupplyCycle', 'recovery-ritual'],
 'web/src/supply-effects.ts':['useActivityPresentation', 'supplyActivityMatches', 'supplyCommandMatches', 'undefined,5'],
}
def validate_supply_objects(root):
 ledger=root/'art/redesign/art04.json'
 if not ledger.exists():
  assert not any((root/p).exists() for p in NATIVE),'Unrecorded supply objects'
  return 0
 m=json.loads(ledger.read_text())
 assert m['format']=='chenyuan-supply-objects' and type(m['version']) is int and m['version']==1
 assert m['maxNativeBytes']==40000 and type(m['newBitmapAssets']) is int and m['newBitmapAssets']==0 and m['userAcceptance'] is False,'Supply budget/acceptance changed'
 assert m['sourceReferences']==REFS and m['bindings']==BINDINGS,'Supply reference/consumer contract changed'
 def local(path):
  p=(root/path).resolve();assert p.is_relative_to(root.resolve()) and p.is_file(),'Invalid supply path';return p
 for ref in REFS:local(ref)
 assert [r['path'] for r in m['files']]==NATIVE,'Supply inventory incomplete'
 total=0
 for row in m['files']:
  data=local(row['path']).read_bytes();assert type(row['bytes']) is int and row['bytes']==len(data) and row['sha256']==hashlib.sha256(data).hexdigest(),'Supply source identity changed';total+=len(data)
 assert total<=40000,'Supply code budget exceeded'
 for path,fragments in BINDINGS.items():
  text=local(path).read_text()
  assert all(part in text for part in fragments),'Missing real supply consumer: '+path
 return total
