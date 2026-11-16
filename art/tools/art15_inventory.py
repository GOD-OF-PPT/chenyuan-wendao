"""Bound the readonly cultivation book and its actual App slots, not visual approval."""
from uir33_04_inventory import prior_uir3304_bytes
import hashlib
import json
import re
from pathlib import PurePosixPath
from ta09_inventory import Tags

LEDGER='art/redesign/art15.json'
NATIVE=['web/src/CultivationNotes.vue']
REFS=['docs/decisions/0043-cultivation-notes-art15-contract.md','goal-4/amendments/2026-10-27-goal-continue-art15.md','goal-4/research/art15-design-sources.json']
TOKENS=['gameFocusKey','focus.open(dialog.value,opener.value??null)','close();focus?.target(opener.value??null)',"watch(()=>props.identity,close,{flush:'sync'})",'onDeactivated(close)','onScopeDispose(()=>focus?.release(dialog.value))',"node.addEventListener('click',selectView,true)","cleanup(()=>node.removeEventListener('click',selectView,true))",'aria-haspopup="dialog"',':aria-controls="panelId"']
CALLS={
 'gate':dict(identity="core.runId+':gate:'+core.player.realm",routes=[("openHub('goal')",None),("openHub('cultivation')",None),("openHub('trial')",'store.trialRecovery')]),
 'practice':dict(identity="core.runId+core.player.realm+(step?.kind??'idle')",routes=[("openHub('cultivation')",None),("openTradeoffs('cultivation',hubTrainingMethod)",None),("act({type:'REST'})",'recoveryNeeded'),("openHub('activity')",'store.activity'),("openHub('trial')",'store.trialRecovery')])}

def validate_art15(root):
 root=root.resolve()
 if not (root/LEDGER).exists():
  assert not any((root/p).exists() for p in NATIVE),'Unrecorded ART15 module'
  return set(),0
 def local(name):
  assert type(name)is str and name and '\\'not in name and not PurePosixPath(name).is_absolute() and '..'not in PurePosixPath(name).parts,'ART15 invalid local path'
  p=(root/name).resolve();assert p.is_relative_to(root)and p.is_file(),'ART15 missing local input';return p
 def clean(name):return re.sub(r'<!--[\s\S]*?-->|/\*[\s\S]*?\*/','',prior_uir3304_bytes(name,local(name).read_bytes()).decode())
 m=json.loads(local(LEDGER).read_text())
 assert m['format']=='chenyuan-art15-notes' and m['version']==1 and type(m['maxNativeBytes'])is int and m['maxNativeBytes']==6000,'ART15 fixed module budget changed'
 assert m['userAcceptance']is False and m['sourceReferences']==REFS,'ART15 provenance/acceptance changed'
 for p in REFS:local(p)
 assert len(m['files'])==1 and set(m['files'][0])=={'path','bytes','sha256'}and m['files'][0]['path']==NATIVE[0],'ART15 native membership changed'
 row=m['files'][0];raw=prior_uir3304_bytes(NATIVE[0],local(NATIVE[0]).read_bytes());assert type(row['bytes'])is int and row['bytes']==len(raw)and row['sha256']==hashlib.sha256(raw).hexdigest(),'ART15 actual native identity mismatch'
 assert 0<local(NATIVE[0]).stat().st_size<=6000,'ART15 actual native cap exceeded'
 source=clean(NATIVE[0]);assert all(t in source for t in TOKENS),'ART15 original focus/lifecycle detached'
 assert not re.search(r'setTimeout|setInterval|requestAnimationFrame|indexedDB|localStorage|fetch\s*\(|useGame\s*\(|v-html|\beval\s*\(',source),'ART15 readonly book owns IO/clock/write'
 assert set(re.findall(r"from ['\"]([^'\"]+)['\"]",source))=={'vue','./focus'},'ART15 readonly imports changed'
 tags=Tags(source);dialogs=[i for i,(tag,a)in enumerate(tags.nodes)if tag=='dialog'and a.get('ref')=='dialog'and a.get('data-testid')=='cultivation-notes-dialog'];assert len(dialogs)==1,'ART15 unique native dialog missing'
 navs=[i for i,(tag,a)in enumerate(tags.nodes)if tag=='nav'and a.get('ref')=='options'and dialogs[0]in tags.ancestors[i]];assert len(navs)==1,'ART15 readonly selection surface detached'
 assert any(tag=='slot'and navs[0]in tags.ancestors[i]for i,(tag,a)in enumerate(tags.nodes)),'ART15 original slot outside dialog'
 assert sum(tag=='button'and a.get('data-testid')=='cultivation-notes-open'and a.get('@click')=='open'for tag,a in tags.nodes)==1,'ART15 unique book entry missing'
 app=clean('web/src/App.vue');assert "import CultivationNotes from './CultivationNotes.vue';"in app,'ART15 App import detached';tree=Tags(app)
 for stage,c in CALLS.items():
  nodes=[i for i,(tag,a)in enumerate(tree.nodes)if tag=='cultivationnotes'and a.get('data-notes-stage')==stage];assert len(nodes)==1,'ART15 actual '+stage+' consumer detached'
  index=nodes[0];assert tree.nodes[index][1].get(':identity')==c['identity'],'ART15 stage/run identity changed'
  buttons=[a for i,(tag,a)in enumerate(tree.nodes)if tag=='button'and index in tree.ancestors[i]];assert len(buttons)==len(c['routes']),'ART15 original readonly choices lost'
  for click,condition in c['routes']:
   matches=[a for a in buttons if a.get('@click')==click];assert len(matches)==1,'ART15 original view route changed';assert matches[0].get('v-if')==condition,'ART15 original view eligibility changed'
 return set(NATIVE+[LEDGER]),len(raw)
