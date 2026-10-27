"""ART12 bounded CSS and real reading/dialog consumers, not pixel acceptance."""
import hashlib
import json
import re
from pathlib import PurePosixPath
from ta09_inventory import OLD_CAPS, Tags
from narrative_object_inventory import NATIVE as NARRATIVE_NATIVE

LEDGER='art/redesign/art12.json'
NATIVE=['web/src/art12-narrative.css']
REFS=['docs/decisions/0039-narrative-reading-art12-contract.md',
      'goal-4/amendments/2026-10-26-goal-continue-art12.md',
      'goal-4/research/art12-narrative-sources.json']
CAPS=OLD_CAPS+[
 dict(ledger='art/redesign/story-journey.json',key='maxNewBytes',limit=48000,
      files=['web/src/story-pages.ts','web/src/NarrativePanel.vue','web/src/FateCatalogue.vue','web/src/LifeCatalogue.vue','web/src/TrialCatalogue.vue','web/src/ReviewPages.vue','web/src/story-book.css','web/src/reading-memory.ts']),
 dict(ledger='art/redesign/narrative-objects.json',key='maxNativeBytes',limit=45000,files=NARRATIVE_NATIVE),
 dict(ledger='art/redesign/stage-r4.json',key='maxNativeBytes',limit=14000,
      files=['web/src/stage-r4.css','web/src/journal-anchors.ts','web/src/navigation.ts'])]
BINDINGS={
 'web/src/main.ts':["import './art12-narrative.css'"],
 'web/src/FateCatalogue.vue':['const events=computed(()=>availableEvents(props.game));',
   "events.value.find(e=>e.id===person.value?.next?.id)", "pending.value?.npc===person.value?.name", "personIndex=i;close()", "!enabled||busy||running||!!pendingError||!personQuote?.allowed"],
 'web/src/NarrativePanel.vue':['useReadingMemory', 'narrativeFor(props.game)', 'page=i;close()',
   "!enabled||busy||running||!!pendingError||!quote(choice.action).allowed", "emit('act',choice.action)"],
 'web/src/LifeCatalogue.vue':["const mode=ref('life')",'readingPages(lifeReadings(props.game).filter(r=>r.group===mode.value))',
   "useReadingMemory(()=>mode.value,()=>rows.value.map(r=>r.key+':'+r.part))", "pageSlice(rows.value,page.value,1)",
   "['life','来路'],['training','修行'],['decisions','因果'],['seal','收卷']", 'hasCheckpoint','pendingError'],
 'web/src/EncounterTable.vue':['art12-encounter','gameFocusKey','onDeactivated(close)',
   "watch([()=>props.game.core.runId,()=>props.mode],close)", "watch(()=>props.personId,()=>route.value?.close())"],
 'web/src/ResponseTable.vue':['art12-response','gameFocusKey','onDeactivated(close)',
   'same(props.action,cycleAction.value)','same(props.action,result.value.action)',
   'watch([()=>props.game.core.runId,()=>props.identity,()=>props.mode],close)'],
 'web/src/LifeScroll.vue':['gameFocusKey','focus?.target(opener.value??null)',
   'watch(()=>props.game.core.runId,()=>management.value?.close())',
   'onDeactivated(()=>management.value?.close())','onScopeDispose(()=>focus?.release(management.value))',
   "props.game.status==='active'?'此卷未封'", "props.game.ending==='retired'?'归隐收卷'", "props.game.ending==='lifespan'?'寿尽收卷'"],
 'web/src/story-pages.ts':['textPages(text:string,size=140)','Array.from(text)',"chars.slice(i,i+size).join('')", "group:'seal',key:'scope'", "group:'seal',key:'identity'", "group:'seal',key:'recovery-note'"],
 'web/src/reading-memory.ts':['old?.anchor','list.indexOf(old.anchor)',"flush:'post'"],
 'web/src/NarrativeStageHost.vue':['provide(narrativeStageKey,useNarrativeStage(()=>props.active))','<slot/>'],
 'web/src/narrative-effects.ts':["const operations=['EVENT','DECIDE','ANSWER_TRIAL','END','RETIRE','END_LIFE'];",'active,7',
   'narrativeTarget(a.originGame,a.plan.action)','e.result.commandId===w.commandId','p.claim(e.sequence)',
   "id===target.runId",'onDeactivated(()=>{visible.value=false;effect.value=null;owner=null;})',
   'let owner:{kind:NarrativeObjectKind;id:string}|null=null;',
   'const e=p.effect.value,k=kind(),target=id();',
   'const instance=getCurrentInstance()', "import {visibleFocusTarget} from './focus.ts';", 'const element=instance?.vnode.el;',
   'if(!(element instanceof Element)||!visibleFocusTarget(element)||!e||!valid.value||!narrativeObjectMatches(k,target,e)){effect.value=null;owner=null;return;}',
   'onMounted(claimCurrent);',
   'if(effect.value===e&&owner?.kind===k&&owner.id===target)return;',
   'if(p.claim(e.sequence)){effect.value=e;owner={kind:k,id:target};}',
   "watch([()=>p.effect.value,kind,id,valid],claimCurrent,{immediate:true,flush:'post'})",
   'onActivated(()=>{const resumed=!visible.value;visible.value=true;if(resumed)claimCurrent();})',
   'if(delivery!==sequence||claimed.has(sequence))return false;',
   'nextTick(()=>{if(delivery===e.sequence)delivery=null;})'],
 'web/src/activity-effects.ts':['a.version&&[2,3,6,extra].includes(a.version)','resolve(before,command)',
   'completeActivity(g,prior,r,','proof(expected)!==proof(a)'],
 'web/src/focus.ts':['!element.isConnected', "element.closest('[inert]')",
   "style.visibility!=='hidden'&&style.display!=='none'&&box.width>0&&box.height>0"],
 'web/src/use-activity-effect.ts':['createActivityEffectTracker(matches,extra)', '!store?.activityPausing',
   'activity.value?.ownerId','timer=setTimeout(()=>effect.value=null,1400)'],
}
DIALOGS={
 'web/src/EncounterTable.vue':[
  dict(id='fate-people-dialog',ref='people',slots=['people']),dict(id='fate-route-dialog',ref='route',slots=['route'])],
 'web/src/ResponseTable.vue':[dict(id='response-choices-dialog',ref='choices',slots=['choices'])],
 'web/src/LifeScroll.vue':[dict(id='life-manage-dialog',ref='management',slots=['management'])],
}
SLOTS={
 'web/src/FateCatalogue.vue':dict(component='encountertable',slots=['#people','#route','#decision']),
 'web/src/NarrativePanel.vue':dict(component='responsetable',slots=['#choices']),
 'web/src/LifeCatalogue.vue':dict(component='lifescroll',slots=['#heading','#management','#chapters']),
}
DEPENDENCIES=list(BINDINGS)+['web/src/App.vue']+REFS+[r['ledger'] for r in CAPS]+[p for row in CAPS for p in row['files']]


def validate_art12(root):
 root=root.resolve()
 if not (root/LEDGER).exists():
  assert not any((root/p).exists() for p in NATIVE),'Unrecorded ART12 stylesheet'
  return set(),0
 def local(name):
  assert type(name) is str and name and chr(92) not in name and not PurePosixPath(name).is_absolute() and '..' not in PurePosixPath(name).parts,'ART12 invalid relative path'
  p=(root/name).resolve();assert p.is_relative_to(root) and p.is_file(),'ART12 missing or external input';return p
 def clean(name):
  return re.sub(r'(?m)^\s*//.*$','',re.sub(r'/\*.*?\*/|<!--.*?-->','',local(name).read_text(),flags=re.S))
 m=json.loads(local(LEDGER).read_text())
 fields={'format','version','task','maxNativeBytes','newBitmapAssets','assets','files','sourceReferences','bindings','dialogs','slots','userAcceptance'}
 assert type(m) is dict and set(m)==fields,'ART12 ledger shape changed'
 assert m['format']=='chenyuan-narrative-art12' and type(m['version']) is int and m['version']==1 and m['task']=='Goal4 ART12','ART12 header changed'
 assert type(m['maxNativeBytes']) is int and m['maxNativeBytes']==14000 and type(m['newBitmapAssets']) is int and m['newBitmapAssets']==0 and m['assets']==[],'ART12 fixed budget/zero asset boundary changed'
 assert m['userAcceptance'] is False,'ART12 cannot claim human acceptance'
 assert m['sourceReferences']==REFS and m['bindings']==BINDINGS and m['dialogs']==DIALOGS and m['slots']==SLOTS,'ART12 reference/consumer contract changed'
 for name in REFS:local(name)
 assert type(m['files']) is list and len(m['files'])==1,'ART12 exactly one new stylesheet required'
 row=m['files'][0];assert type(row) is dict and set(row)=={'path','bytes','sha256'} and row['path']==NATIVE[0],'ART12 native membership changed'
 raw=local(NATIVE[0]).read_bytes();assert type(row['bytes']) is int and 0<row['bytes']==len(raw) and type(row['sha256']) is str and row['sha256']==hashlib.sha256(raw).hexdigest(),'ART12 actual native identity changed'
 assert len(raw)<=14000,'ART12 native cap exceeded'
 for prior in CAPS:
  old=json.loads(local(prior['ledger']).read_text());assert type(old.get(prior['key'])) is int and old[prior['key']]==prior['limit'] and [r['path'] for r in old['files']]==prior['files'],'ART12 cannot raise or move old budgets'
  assert sum(len(local(p).read_bytes()) for p in prior['files'])<=prior['limit'],'ART12 actual old group exceeds cap'
 for name,tokens in BINDINGS.items():assert all(t in clean(name) for t in tokens),'ART12 real consumer/reading/proof detached: '+name
 main=clean('web/src/main.ts');assert len(re.findall(r"import\s+['\"]\./art12-narrative\.css['\"]",main))==1,'ART12 stylesheet not uniquely consumed'
 css=clean(NATIVE[0]);assert all(t in css for t in ['art12-encounter','art12-response','life-scroll-bookmarks','art12-object-dialog','life-management-actions']),'ART12 actual surface rules missing'
 assert not re.search(r'@import|@font-face|https?://|file://',css),'ART12 external IO/font added'
 for name,dialogs in DIALOGS.items():
  text=clean(name);tags=Tags(text)
  assert len(re.findall(r'\buseNarrativeObject\s*\(',text))==1,'ART12 object must keep one original outcome claimant'
  assert not re.search(r'setTimeout|setInterval|requestAnimationFrame|fetch\s*\(|indexedDB|localStorage|useGame\s*\(',text),'ART12 object adds IO or independent clocks'
  for d in dialogs:
   nodes=[i for i,(tag,a) in enumerate(tags.nodes) if tag=='dialog' and a.get('data-testid')==d['id'] and a.get('ref')==d['ref']]
   assert len(nodes)==1,'ART12 actual unique readonly dialog missing'
   for slot in d['slots']:
    assert any(tag=='slot' and a.get('name')==slot and a.get(':close')=='close' and nodes[0] in tags.ancestors[i] for i,(tag,a) in enumerate(tags.nodes)),'ART12 actual readonly dialog slot detached'
 for name,c in SLOTS.items():
  tags=Tags(clean(name));parents=[i for i,(tag,a) in enumerate(tags.nodes) if tag==c['component']]
  assert len(parents)==1,'ART12 actual unique stage consumer missing'
  for slot in c['slots']:
   assert any(tag=='template' and slot in a and parents[0] in tags.ancestors[i] for i,(tag,a) in enumerate(tags.nodes)),'ART12 parent content slot detached'
 life=Tags(clean('web/src/LifeCatalogue.vue'))
 expected={'export-life':dict(click="emit('export')"),'life-receipt':dict(click="close();emit('receipt')"),
 'retire':dict(click="close();emit('end','RETIRE')",disabled="!enabled||busy||running||!!pendingError||!previewAction(game,{type:'RETIRE'}).allowed"),
 'end-life':dict(click="close();emit('end','END_LIFE')",disabled="!enabled||busy||running||!!pendingError||!previewAction(game,{type:'END_LIFE'}).allowed",condition='record.overview.remainingMonths===1'),
 'life-restore':dict(click="close();emit('restore')",disabled='!enabled||busy||!!pendingError||!hasCheckpoint'),
 'life-restart':dict(click="close();emit('restart')",disabled='!enabled||busy||!!pendingError')}
 for id,e in expected.items():
  nodes=[a for tag,a in life.nodes if tag=='button' and a.get('data-testid')==id];assert len(nodes)==1 and nodes[0].get('@click')==e['click'],'ART12 actual management action/close changed'
  if id=='export-life':assert ':disabled' not in nodes[0] and 'disabled' not in nodes[0],'ART12 readonly export cannot be globally locked'
  if 'disabled' in e:assert nodes[0].get(':disabled')==e['disabled'],'ART12 original management gates changed'
  if 'condition' in e:assert nodes[0].get('v-if')==e['condition'],'ART12 lifespan eligibility changed'
 receipt=next(a for tag,a in life.nodes if a.get('data-testid')=='life-receipt')
 assert receipt.get('v-if')=="game.status!=='active'&&store?.activity?.version===7&&store.activity.completedCycles>0&&store.activity.stopReason?.code!=='STATE_CHANGED'",'ART12 real ended receipt eligibility changed'
 app=clean('web/src/App.vue');host=re.search(r'<NarrativeStageHost\b[^>]*>(.*?)</NarrativeStageHost>',app,re.S)
 assert host and all(re.search(r'<KeepAlive\b[^>]*>\s*<'+name+r'\b',host[1]) for name in ['FateCatalogue','NarrativePanel','LifeCatalogue']),'ART12 stable host no longer owns original KeepAlive'
 assert "game.core.runId+readingGeneration+game.status+'LifeCatalogue'" in host[1],'ART12 status/run life handoff identity changed'
 return set(NATIVE+[LEDGER]),len(raw)
