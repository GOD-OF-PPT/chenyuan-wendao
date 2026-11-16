from check_cend07_inventory import prior_forecast_bytes
"""Exact template-only decision hierarchy; original rules, callbacks and cap remain."""
import hashlib,json,re
from pathlib import Path
LEDGER='art/redesign/uir33-08.json'
MANIFEST={'format': 'chenyuan-alchemy-arrangement-uir33-08',
 'version': 1,
 'userAcceptance': False,
 'newRasterAssets': 0,
 'newCSSBytes': 0,
 'path': 'web/src/AlchemyWorkshop.vue',
 'bytes': 12158,
 'sha256': '92c9475de4eef1d693fe78d5890e652d181056de7938bcbe8ce2f7c34f0dbf84',
 'before': 'goal-4/evidence/uir33-08/before/web/src/AlchemyWorkshop.vue',
 'beforeSHA256': 'f81b5f9ada539eb9abd229875bd4e5987d6597bf29c713134de8a1ebb209e6f8',
 'beforeBytes': 12054,
 'maxNativeBytes': 22000,
 'nativeFiles': ['web/src/AlchemyWorkshop.vue',
                 'web/src/alchemy-workshop.css',
                 'web/src/alchemy-feedback.ts'],
 'unchanged': {'web/src/alchemy-workshop.css': '26362acf00d49c9fa8a29168cc36be231d4ba6db8aba6c6c0d815926d56e6db3',
               'web/src/alchemy-feedback.ts': 'dfe2886f81b73788fc406e89f8631618ee5dadbdc24bab80db4dc5a8e4759899',
               'web/src/ProductionPlanner.vue': '6ebbc6551f6c68605b4e634196579787bf50e91d71d8fa84938bcc8cb9f1306b',
               'src/full/activity.ts': '2630150966d2d6a441c36b013448ce4ccb604dd700b329df4a65997d0b7d8815'},
 'sourceReferences': ['docs/decisions/0104-alchemy-arrangement-uir33-08-contract.md',
                      'goal-4/amendments/2026-11-05-uir33-08-input.md',
                      'goal-4/research/uir33-08-sources.json']}
OPERATIONS=[['这段炼丹 · 安排与完整预估', '{{recipe.name}} · 每炉 {{recipe.months*30}} 秒'],
 ['<p>只调整待确认安排，开炉后才执行。在线逐炉保存，刷新后主动继续；不自动采购、取材或突破。成品自动入匣，无需领取。材料不足、达到目标或触及保留量时自动停炉。</p>',
  '<p>待确认草案 · 每炉 {{recipe.stones}} 灵石，成丹1枚</p>'],
 ['</div><footer><button @click="close">保留草案 · 返回丹炉</button>',
  '</div><details '
  'class="alchemy-rules"><summary>停炉与续接规则</summary><p>只调整待确认安排，开炉后才执行。在线逐炉保存，刷新后主动继续；不自动采购、取材或突破。成品自动入匣，无需领取。材料不足、达到目标或触及保留量时自动停炉。</p></details><footer>']]
MARKER='class="alchemy-rules"'
def prior_uir3308_bytes(path,raw):
 try:raw=prior_forecast_bytes(path,raw)
 except AssertionError as error:raise AssertionError('UIR33-08 parent: '+str(error))from error
 if Path(path).name!='AlchemyWorkshop.vue' or MARKER.encode() not in raw:return raw
 assert hashlib.sha256(raw).hexdigest()==MANIFEST['sha256'],'UIR33-08 current complete source'
 text=raw.decode()
 for before,after in reversed(OPERATIONS):
  assert text.count(after)==1,'UIR33-08 unique inverse';text=text.replace(after,before,1)
 assert hashlib.sha256(text.encode()).hexdigest()==MANIFEST['beforeSHA256'],'UIR33-08 preserved complete source'
 return text.encode()
def validate_uir3308(root):
 root=Path(root).resolve()
 def local(name):
  p=root/name;assert p.is_file()and not p.is_symlink()and p.resolve().is_relative_to(root),'UIR33-08 local source';return p
 if not(root/LEDGER).exists():
  assert not(root/MANIFEST['path']).exists()or MARKER.encode()not in(root/MANIFEST['path']).read_bytes(),'UIR33-08 unrecorded source'
  return set(),0
 assert json.loads(local(LEDGER).read_text())==MANIFEST,'UIR33-08 immutable ledger'
 raw=prior_forecast_bytes(MANIFEST['path'],local(MANIFEST['path']).read_bytes());old=local(MANIFEST['before']).read_bytes()
 assert len(raw)==MANIFEST['bytes']and hashlib.sha256(raw).hexdigest()==MANIFEST['sha256'],'UIR33-08 actual source'
 assert len(old)==MANIFEST['beforeBytes']and hashlib.sha256(old).hexdigest()==MANIFEST['beforeSHA256'],'UIR33-08 preserved source'
 assert prior_uir3308_bytes(MANIFEST['path'],raw)==old,'UIR33-08 full inverse'
 assert re.findall(rb'<script setup.*?</script>',raw,re.S)==re.findall(rb'<script setup.*?</script>',old,re.S),'UIR33-08 original controller'
 for n,h in MANIFEST['unchanged'].items():assert hashlib.sha256(local(n).read_bytes()).hexdigest()==h,'UIR33-08 original ownership'
 total=sum(local(n).stat().st_size for n in MANIFEST['nativeFiles']);assert total<=22000,'UIR33-08 actual original cap'
 for n in MANIFEST['sourceReferences']:local(n)
 return{LEDGER,MANIFEST['path'],MANIFEST['before'],*MANIFEST['unchanged'],*MANIFEST['sourceReferences']},total
