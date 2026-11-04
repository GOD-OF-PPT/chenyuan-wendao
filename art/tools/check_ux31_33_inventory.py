"""Exact alchemy forecast display evolution; original script, events and caps stay owned."""
from uir33_01_inventory import prior_uir3301_bytes
import hashlib,json,re
from pathlib import Path
LEDGER='art/redesign/check-ux31-33.json'
EDITS='art/redesign/check-ux31-33-edits.json'
MANIFEST={'format': 'chenyuan-ux31-33-combination-check',
 'version': 1,
 'userAcceptance': False,
 'newRasterAssets': 0,
 'newCSSBytes': 0,
 'files': [{'path': 'web/src/AlchemyWorkshop.vue',
            'bytes': 12054,
            'sha256': 'f81b5f9ada539eb9abd229875bd4e5987d6597bf29c713134de8a1ebb209e6f8'}],
 'before': {'path': 'goal-4/evidence/check-ux31-33/before/web/src/AlchemyWorkshop.vue',
            'bytes': 11982,
            'sha256': 'cff2e34bbfa34726fab08e763180e90b9401559dcf06f05142a50b8d5d36d803'},
 'maxNativeBytes': 22000,
 'nativeFiles': ['web/src/AlchemyWorkshop.vue',
                 'web/src/alchemy-workshop.css',
                 'web/src/alchemy-feedback.ts'],
 'oldLedgers': {'art/redesign/ux33.json': 'ca0c3a052c3f9508957a38da9a8acada9821104c2461aa127bccd0743f27c3b8',
                'art/redesign/alchemy-workshop.json': 'bf770f33e405cea888c33c6f4485b014f8b29b11d83614745758f7240c29a12f'},
 'sourceReferences': ['docs/decisions/0095-ux31-33-combination-check.md',
                      'goal-4/amendments/2026-11-04-check-ux31-33-input.md',
                      'goal-4/research/check-ux31-33-sources.json',
                      'goal-4/evidence/check-ux31-33/before/web/src/AlchemyWorkshop.vue',
                      'art/redesign/check-ux31-33-edits.json']}
OPERATIONS=[['<strong>预计 {{quote.cycles}} 炉 · 灵石消耗 {{quote.stones}} · {{quote.months}} '
  '游戏月</strong>',
  '<strong '
  'v-if="quote.failure">暂不可开炉：{{quote.failure.message}}</strong><strong '
  'v-else>预计 {{quote.cycles}} 炉 · 灵石消耗 {{quote.stones}} · {{quote.months}} '
  '游戏月</strong>'],
 ["<small>耗材：{{costText(quote.spentItems)||'暂无'}}；成品 "
  "{{costText(quote.items)||'暂无'}}</small>",
  '<small v-if="!quote.failure">耗材：{{costText(quote.spentItems)||\'暂无\'}}；成品 '
  "{{costText(quote.items)||'暂无'}}</small>"],
 ["<small>{{quote.failure?'暂不可安排：'+quote.failure.message:quote.stopReason?'预计停止：'+quote.stopReason.message:''}}</small>",
  '<small v-if="!quote.failure && '
  'quote.stopReason">预计停止：{{quote.stopReason.message}}</small>']]
MARKER='<strong v-if="quote.failure">暂不可开炉：'
def prior_check_ux3133_bytes(path,raw):
 raw=prior_uir3301_bytes(path,raw)
 if Path(path).name!='AlchemyWorkshop.vue' or MARKER.encode() not in raw:return raw
 assert hashlib.sha256(raw).hexdigest()==MANIFEST['files'][0]['sha256'], 'CHECK95 current whole display source changed'
 text=raw.decode()
 for before,after in reversed(OPERATIONS):
  assert text.count(after)==1, 'CHECK95 unique inverse span'
  text=text.replace(after,before,1)
 assert hashlib.sha256(text.encode()).hexdigest()==MANIFEST['before']['sha256'], 'CHECK95 original complete source'
 return text.encode()
def validate_check_ux3133(root):
 root=Path(root).resolve();source=root/MANIFEST['files'][0]['path']
 def local(name):
  p=root/name
  assert p.is_file() and not p.is_symlink() and p.resolve().is_relative_to(root), 'CHECK95 local source'
  return p
 if not(root/LEDGER).exists():
  assert not source.exists() or MARKER.encode() not in source.read_bytes(), 'CHECK95 unrecorded change'
  return set(),0
 assert json.loads(local(LEDGER).read_text())==MANIFEST, 'CHECK95 exact ledger cannot be resigned'
 assert json.loads(local(EDITS).read_text())==OPERATIONS, 'CHECK95 exact display edits'
 raw=local(MANIFEST['files'][0]['path']).read_bytes();before=local(MANIFEST['before']['path']).read_bytes()
 assert len(raw)==MANIFEST['files'][0]['bytes'] and hashlib.sha256(raw).hexdigest()==MANIFEST['files'][0]['sha256'], 'CHECK95 current source'
 assert len(before)==MANIFEST['before']['bytes'] and hashlib.sha256(before).hexdigest()==MANIFEST['before']['sha256'], 'CHECK95 preserved prior source'
 assert prior_check_ux3133_bytes(source,raw)==before, 'CHECK95 full inverse'
 for pattern in [rb'<script setup.*?</script>',rb'<style.*?</style>',rb'@[\w:.-]+="[^"]*"']:
  assert re.findall(pattern,raw,re.S)==re.findall(pattern,before,re.S), 'CHECK95 original script/styles/callbacks'
 for name,pin in MANIFEST['oldLedgers'].items():assert hashlib.sha256(local(name).read_bytes()).hexdigest()==pin, 'CHECK95 immutable old ledger'
 assert sum(local(name).stat().st_size for name in MANIFEST['nativeFiles'])<=22000, 'CHECK95 original regional cap'
 for name in MANIFEST['sourceReferences']:local(name)
 return {LEDGER,*MANIFEST['sourceReferences'],*MANIFEST['nativeFiles'],*MANIFEST['oldLedgers']},len(raw)
