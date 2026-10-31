from ux29_inventory import normalize_ux29_planner
"""UX28 exact display evolution; original whole RecoveryPlanner remains pinned."""
import hashlib
BASELINE_SHA256='478733b74bf51b209901a7e7328ea92269a77a30ab41c56c400ddd8b40ef78a9'
EDITS=[['previewActivity,type PreparationPlan', 'previewActivity,ADVENTURE_CYCLE_MS,type PreparationPlan'], ['调整本段安排 ›', '单次{{quote.cycleMs/1000}}秒 · 调整 ›'], [' · 有限安排</h3>', ' · 单次{{quote.cycleMs/1000}}秒</h3>'], ['前往听雨洞府 · 不自动疗养', '前往听雨洞府 · {{ADVENTURE_CYCLE_MS.travel/1000}}秒 · 不自动疗养'], ["<small>{{mode==='rest'?'仅一次正式恢复，不分段重复耗月。':'只对当前不足恢复，达标即停；战中服丹占回合，另在斗法安排。'}}</small>", '<small v-if="mode===\'use\'">战中服丹占回合，另在斗法安排。</small>'], ['只调整本段恢复草案，关闭保留参数；返回后另行确认才用药或疗养。', '只改本段恢复草案，关闭保留；返回后确认才用药或疗养。']]
def normalize_ux28_recovery(text):
 text=normalize_ux29_planner(text)
 if EDITS[0][1] in text:
  for before,after in reversed(EDITS):
   assert text.count(after)==1,'UX28 unique approved display fragment'
   text=text.replace(after,before,1)
 assert hashlib.sha256(text.encode()).hexdigest()==BASELINE_SHA256,'UX28 original complete recovery controller'
 return text
