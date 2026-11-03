from ux30_inventory import normalize_ux30
"""UX29 exact presentation inversion; original controllers and historical proofs stay pinned."""
import hashlib
PLANNER_SHA256='5de293edd038887f4f3fd5b8b0f88b71b9bf77af06c744d0731e61f9591183f2'
PLANNER_EDITS=[["<strong>预计{{mode==='rest'?'疗养 '+quote.cycles+' 次':'使用 '+quote.cycles+' 丹'}} · {{quote.months}} 游戏月</strong><p>气血 +{{quote.hp}} · 灵力 +{{quote.mp}}</p><small>{{quote.failure?.message??(quote.stopReason?'预计停止：'+quote.stopReason.message:'')}}</small>", '<strong>{{quote.failure?.message??(\'预计\'+(mode===\'rest\'?\'疗养 \'+quote.cycles+\' 次\':\'使用 \'+quote.cycles+\' 丹\')+\' · \'+quote.months+\' 游戏月\')}}</strong><p v-if="quote.allowed">气血 +{{quote.hp}} · 灵力 +{{quote.mp}}</p><small>{{quote.stopReason?\'预计停止：\'+quote.stopReason.message:\'\'}}</small>'], ['达到目标或触及保留线后停止，成果逐次保存。', '达标或触及保留线即停，逐次保存。'], ['更换丹药或洞府疗养', '选择恢复方式']]
RITUAL_SHA256='59f0187aa56a6ef240bc231df72a8851482c9f05c9c9d823618cbd34b1e96020'
RITUAL_EDITS=[['预计单次气血 +{{one.delta?.hp??0}} · 灵力 +{{one.delta?.mp??0}}', "{{one.allowed?'预计单次气血 +'+(one.delta?.hp??0)+' · 灵力 +'+(one.delta?.mp??0):one.failure?.message}}"], ['不在洞府时，先前往洞府；抵达后另行确认恢复安排。', '不在洞府时先回洞府；抵达后再预估并确认疗养。']]
def _normalize(text,edits,pin):
 if edits[0][1] not in text:return text
 for before,after in reversed(edits):
  assert text.count(after)==1,'UX29 unique approved display fragment'
  text=text.replace(after,before,1)
 assert hashlib.sha256(text.encode()).hexdigest()==pin,'UX29 complete prior source'
 return text
def normalize_ux29_planner(text):return _normalize(normalize_ux30('RecoveryPlanner.vue',text),PLANNER_EDITS,PLANNER_SHA256)
def normalize_ux29_ritual(text):return _normalize(normalize_ux30('RecoveryRitual.vue',text),RITUAL_EDITS,RITUAL_SHA256)
