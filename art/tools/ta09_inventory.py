"""TA09 source integrity. Unconfirmed actual consumers fail closed.

No decoder, Store, rule, timer or reward workflow is introduced. The validator
checks recorded source facts and live markup; UI/native/pixel proof stays separate.
"""
import hashlib
import json
import re
from html.parser import HTMLParser
from pathlib import PurePosixPath

NATIVE = ['web/src/JadeEngraving.vue', 'web/src/StudyQueueRail.vue',
          'web/src/RelicInscription.vue', 'web/src/equipment-choreography.ts',
          'web/src/ta09-equipment.css']
LEDGER = 'art/redesign/ta09.json'
REFS = ['docs/decisions/0035-equipment-ta09-contract.md',
        'goal-4/amendments/2026-10-25-ta09.md',
        'goal-4/research/ta09-design-sources.json']
BUDGETS = dict(nativeBytes=30000, newRasterAssets=0)
SCOPE = 'Read-only equipment objects and work presentation; no Game, rules, authority, DB or timing changes; not human acceptance.'
REUSED_ASSETS = [{'id': 'frost_sword', 'source': {'path': 'art/redesign/art03-objects/frost_sword-v2.png', 'bytes': 265325, 'sha256': 'cf7036014cf3bb96583ebfb83afd94ee8d0269dd82c72699336f203da8e31d85'}, 'runtime': {'path': 'web/public/art/v2/equipment/frost_sword-v1.webp', 'bytes': 10960, 'sha256': '0054af06284f62b516d5be2802dbd69fecb4cb31ee8d56f0a7d895568df79943'}}, {'id': 'jade_seal', 'source': {'path': 'art/redesign/art03-objects/jade_seal-v1.png', 'bytes': 1985699, 'sha256': '7253c56040d0e2c4fd8888896e85c0c1999735479f4672fdf0ccfb4e2fd04b5c'}, 'runtime': {'path': 'web/public/art/v2/equipment/jade_seal-v1.webp', 'bytes': 56116, 'sha256': '81aad3db8a19ad6a39b0e54a96254d6fcc94164bdcbbbb87bd0e3f48ef43c49c'}}, {'id': 'soul_lamp', 'source': {'path': 'art/redesign/art03-objects/soul_lamp-v1.png', 'bytes': 1359219, 'sha256': '57029fb4cda9e57050640e6d338056d92768506d7d6299d9e95d8ca4dfaf17fd'}, 'runtime': {'path': 'web/public/art/v2/equipment/soul_lamp-v1.webp', 'bytes': 42144, 'sha256': 'd0345b92c5c191f50b831ffdeec27a591785b1948398948daee06df799dff1cc'}}, {'id': 'cloud_mirror', 'source': {'path': 'art/redesign/art03-objects/cloud_mirror-v1.png', 'bytes': 1055777, 'sha256': 'a7249e6ebd5e69f910b3191dd3cc8085a383f180a4d7fcf8027d401d9704eb50'}, 'runtime': {'path': 'web/public/art/v2/equipment/cloud_mirror-v1.webp', 'bytes': 27650, 'sha256': '8a8066224ee8487a226dd63ae27f8fd1760a08214cdf93826d8e8d8d7d77a008'}}]
OLD_CAPS = [{'ledger': 'art/redesign/art03.json', 'key': 'maxNativeBytes', 'limit': 45000, 'files': ['web/src/JadeStudyScene.vue', 'web/src/RelicAtelier.vue', 'web/src/LoadoutConstellation.vue', 'web/src/equipment-effects.ts', 'web/src/art03-equipment.css']}, {'ledger': 'art/redesign/idle-preparation.json', 'key': 'maxNativeBytes', 'limit': 60000, 'files': ['web/src/LearningPlanner.vue', 'web/src/MarketPlanner.vue', 'web/src/RecoveryPlanner.vue', 'web/src/ConfigurationDialog.vue', 'web/src/preparation-view.ts', 'web/src/idle-preparation.css']}, {'ledger': 'art/redesign/idle-production.json', 'key': 'maxNativeBytes', 'limit': 26000, 'files': ['web/src/ProductionPlanner.vue', 'web/src/idle-production.css', 'web/src/activity-view.ts']}, {'ledger': 'art/redesign/stage-r3.json', 'key': 'maxNativeBytes', 'limit': 18000, 'files': ['web/src/stage-r3.css']}, {'ledger': 'art/redesign/action-feedback.json', 'key': 'maxBytes', 'limit': 34000, 'files': ['web/src/action-feedback.ts', 'web/src/ActionFeedbackStage.vue', 'web/src/action-motion.css']}, {'ledger': 'art/redesign/playable-flow.json', 'key': 'maxNewBytes', 'limit': 60000, 'files': ['web/src/action-timing.ts', 'web/src/ActionExecution.vue', 'web/src/play-flow.ts', 'web/src/CataloguePager.vue', 'web/src/PreparationPanel.vue', 'web/src/ExplorePanel.vue', 'web/src/GoodsPanel.vue', 'web/src/CultivationPanel.vue', 'web/src/play-flow.css']}]
JADE_EXPECTED = {
 'sword_mind':dict(form='heart',variant='base'), 'sword_still':dict(form='heart',variant='advanced'),
 'sword_build':dict(form='blade',variant='base'), 'sword_guard':dict(form='blade',variant='advanced'),
 'sword_release':dict(form='scroll',variant='base'), 'sword_echo':dict(form='scroll',variant='advanced'),
 'talisman_mind':dict(form='knot',variant='base'), 'talisman_calm':dict(form='knot',variant='advanced'),
 'talisman_build':dict(form='seal',variant='base'), 'talisman_frost':dict(form='seal',variant='advanced'),
 'talisman_release':dict(form='fan',variant='base'), 'talisman_return':dict(form='fan',variant='advanced')}
RELIC_EXPECTED = dict(frost_sword='sword',jade_seal='seal',soul_lamp='lamp',cloud_mirror='mirror')
PROPS = {'JadeEngraving':['skillId','manual','state','progress','mastered','equipped','sequence'],
         'StudyQueueRail':['game','draft','activity','command','viewed','view'],
         'RelicInscription':['relicId','state','progress','owned','bound','sequence','saved']}
# These must be populated from actual post-baseline source, not invented tokens.
CONSUMERS_CONFIRMED = True
CONSUMERS = [{'host': 'web/src/JadeStudyScene.vue', 'component': 'JadeEngraving', 'attrs': {':skill-id': 'skillId', ':manual': 'manual', ':state': 'state', ':progress': 'progress', ':mastered': 'mastered', ':equipped': 'equipped', ':sequence': 'effect?.sequence??echo.effect.value?.sequence??0'}, 'requiredSlots': ['result']}, {'host': 'web/src/JadeStudyScene.vue', 'component': 'StudyQueueRail', 'attrs': {':game': 'game', ':draft': 'queue', ':activity': 'store?.activity??null', ':command': 'command', ':viewed': 'skillId', '@inspect': "emit('inspect',$event)", '@limits': "emit('plan')", ':view': 'queueView', '@remember': "emit('remember',$event)"}, 'requiredSlots': ['slots']}, {'host': 'web/src/RelicAtelier.vue', 'component': 'RelicInscription', 'attrs': {':relic-id': 'plan.relicId', ':state': 'state', ':progress': 'progress', ':owned': 'owned', ':bound': 'bound', ':sequence': 'effect?.sequence??0', ':saved': '!!effect', '@inspect': 'limits'}, 'requiredSlots': ['artifact']}, {'host': 'web/src/LearningPlanner.vue', 'component': 'JadeStudyScene', 'attrs': {':queue': 'queue', '@inspect': 'focusSkill', '@plan': 'openSettings', ':queue-view': 'queueView', '@remember': 'rememberQueue'}, 'requiredSlots': ['description', 'action']}]
FORM_CONSUMERS = [{'source': 'web/src/JadeEngraving.vue', 'tag': 'path', 'attrs': {'v-if': "form==='heart'", 'class': 'ta09-jade-face'}, 'domain': 'jade', 'form': 'heart'}, {'source': 'web/src/JadeEngraving.vue', 'tag': 'path', 'attrs': {'v-else-if': "form==='blade'", 'class': 'ta09-jade-face'}, 'domain': 'jade', 'form': 'blade'}, {'source': 'web/src/JadeEngraving.vue', 'tag': 'path', 'attrs': {'v-else-if': "form==='scroll'", 'class': 'ta09-jade-face'}, 'domain': 'jade', 'form': 'scroll'}, {'source': 'web/src/JadeEngraving.vue', 'tag': 'path', 'attrs': {'v-else-if': "form==='knot'", 'class': 'ta09-jade-face'}, 'domain': 'jade', 'form': 'knot'}, {'source': 'web/src/JadeEngraving.vue', 'tag': 'path', 'attrs': {'v-else-if': "form==='seal'", 'class': 'ta09-jade-face'}, 'domain': 'jade', 'form': 'seal'}, {'source': 'web/src/JadeEngraving.vue', 'tag': 'path', 'attrs': {'v-else-if': "form==='fan'", 'class': 'ta09-jade-face'}, 'domain': 'jade', 'form': 'fan'}, {'source': 'web/src/JadeEngraving.vue', 'tag': 'path', 'attrs': {'v-else-if': "form==='manual'", 'class': 'ta09-jade-face'}, 'domain': 'jade', 'form': 'manual'}, {'source': 'web/src/RelicInscription.vue', 'tag': 'path', 'attrs': {'v-if': "shape==='sword'", 'class': 'relic-engraved-path'}, 'domain': 'relic', 'form': 'sword'}, {'source': 'web/src/RelicInscription.vue', 'tag': 'path', 'attrs': {'v-else-if': "shape==='seal'", 'class': 'relic-engraved-path'}, 'domain': 'relic', 'form': 'seal'}, {'source': 'web/src/RelicInscription.vue', 'tag': 'path', 'attrs': {'v-else-if': "shape==='lamp'", 'class': 'relic-engraved-path'}, 'domain': 'relic', 'form': 'lamp'}, {'source': 'web/src/RelicInscription.vue', 'tag': 'path', 'attrs': {'v-else': None, 'class': 'relic-engraved-path'}, 'domain': 'relic', 'form': 'mirror'}]
STYLESHEET_HOSTS = ['web/src/JadeEngraving.vue']
BINDINGS = {
 'web/src/equipment-effects.ts':['useActivityPresentation(a=>equipmentActivityMatches(kind,id(),a)',
  "kind==='forge'?4:5",'cycleCommand.value=p.activity.value?.nextCommand??null;',
  'command:cycleCommand',"return kind==='forge'?a.version===4&&a.plan.relicId===id:a.version===5&&a.plan.kind===kind",'proof(resolved.nextState)!==proof(g)','proof(resolved.result)!==proof(r)'],
 'web/src/activity-effects.ts':['extra:0|1|4|5|7=0','a.version&&[2,3,6,extra].includes(a.version)',
  'resolve(before,command)','completeActivity(g,prior,r,','proof(expected)!==proof(a)'],
 'web/src/use-activity-effect.ts':['extra:0|1|4|5|7=0','createActivityEffectTracker(matches,extra)',
  '!store?.activityPausing','activity.value?.ownerId','timer=setTimeout(()=>effect.value=null,1400)'],
 'web/src/JadeStudyScene.vue':['const {store,activity,runtime,progress,engaged,effect,command}=cycle;', 'useEquipmentCycle(kind.value,id)'],
 NATIVE[1]:['projectStudyQueue(props.game,props.draft,props.activity,props.command', "props.activity?.version===5&&props.activity.plan.kind==='learn'&&props.activity.runId===props.game.core.runId", 'all.value.slice(page.value*2,page.value*2+2)', "emit('inspect',row.id)","emit('limits')"],
 NATIVE[0]:['JADE_FORMS[props.skillId]?.form','JADE_FORMS[props.skillId]?.variant','projectStudyForm(props.state,props.progress,props.mastered)',"const locked=computed(()=>visual.value.working||visual.value.phase==='sealing');", "visual.value.phase==='sealing'?0:visual.value.working?visual.value.spread:opened.value?1:0"],
 NATIVE[2]:["projectRelicForm(props.state,['preparing','engraving','forming'].includes(props.state),props.progress,props.owned,props.bound)",'!form.value.working&&!sealed.value',"<slot name=\"artifact\"/>"],
 NATIVE[3]:['Number.isFinite(n)',"working=state==='reading'","activity?.version===5&&activity.plan.kind==='learn'&&activity.runId===game.core.runId",'command.runId===game.core.runId','game.learned.includes(id)','export const JADE_FORMS','export const MANUAL_FORM','export const RELIC_FORMS',
  'export function projectStudyForm','export function projectRelicForm','export function projectStudyQueue']}
VIEW_BINDINGS = {'web/src/LearningPlanner.vue': ['const queueView=ref<QueueView|null>(null);', 'if(view.runId===props.game.core.runId)queueView.value=view;', 'queueView.value=null;delete drafts.skills;delete drafts.manual;defaults();'], 'web/src/StudyQueueRail.vue': ['const ownerRun=props.game.core.runId,restored=props.view?.runId===ownerRun?props.view:null;', 'pages=ref(restored?{...restored.pages}:{draft:0,saved:0,slots:0})', "if(ownerRun===props.game.core.runId)emit('remember',{runId:ownerRun,domain:domain.value,pages:{...pages.value,[domain.value]:page.value},touched:touched.value});", 'function choose(next:QueueDomain){touched.value=true;domain.value=next;remember();}', 'function turn(next:number){pages.value[domain.value]=next;remember();}', 'pages.value[domain.value]=page.value;remember();', 'watch(()=>props.game.core.runId,reset);'], 'web/src/JadeEngraving.vue': ["visual.value.phase==='sealing'?0:"]}
for _path,_tokens in VIEW_BINDINGS.items():BINDINGS.setdefault(_path,[]).extend(_tokens)
DEPENDENCIES = list(BINDINGS) + [r['ledger']for r in OLD_CAPS] + [p for old in OLD_CAPS for p in old['files']] + [r['path']for a in REUSED_ASSETS for r in [a['source'],a['runtime']]]

REDUCED_SPREAD_RULES = [
 {'selector':'.hub-reduced .ta09-jade[data-working=true]','contexts':()},
 {'selector':'.ta09-jade[data-working=true]','contexts':('@media(prefers-reduced-motion:reduce)',)}]

def css_rules(text,contexts=(),offset=0):
 """Read actual CSS blocks with source spans; ignore comments without shifting spans."""
 text=re.sub(r'/\*.*?\*/',lambda m:' '*len(m[0]),text,flags=re.S);rows=[];cursor=0
 while True:
  opening=text.find('{',cursor)
  if opening<0:break
  head=text[cursor:opening];start=cursor+len(head)-len(head.lstrip());selector=head.strip()
  depth=1;quote=None;escaped=False;end=opening+1
  while end<len(text)and depth:
   ch=text[end]
   if quote:
    if escaped:escaped=False
    elif ch==chr(92):escaped=True
    elif ch==quote:quote=None
   elif ch in (chr(34),chr(39)):quote=ch
   elif ch=='{':depth+=1
   elif ch=='}':depth-=1
   end+=1
  assert depth==0,'TA09 malformed stylesheet block'
  body=text[opening+1:end-1]
  if selector.startswith('@'):rows.extend(css_rules(body,contexts+(re.sub(r'\s+','',selector),),offset+opening+1))
  else:rows.append(dict(selector=re.sub(r'\s+',' ',selector),contexts=contexts,body=body,start=offset+start,stop=offset+opening))
  cursor=end
 return rows

class Tags(HTMLParser):
 def __init__(self,text):
  super().__init__();self.nodes=[];self.geometry={};self.stack=[];self.ancestors=[];self.html_stack=[]
  m=re.search(r'<template>(.*)</template>',text,re.S)
  assert m,'TA09 real consumer has no template'
  self.feed(m[1])
 def handle_starttag(self,tag,attrs):
  data=dict(attrs);index=len(self.nodes);self.nodes.append((tag,data));self.geometry[index]=0;self.ancestors.append(tuple(self.html_stack))
  if tag in ['path','rect','circle','ellipse','polygon','polyline','line']and any(data.get(k)for k in ['d',':d','points',':points','width','height','r','rx','x2','y2']):
   self.geometry[index]+=1
   for parent,_ in self.stack:self.geometry[parent]+=1
  if tag in ['g','svg']:self.stack.append((index,tag))
  if tag not in ['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']:self.html_stack.append(index)
 def handle_startendtag(self,tag,attrs):
  self.handle_starttag(tag,attrs)
  self.handle_endtag(tag)
 def handle_endtag(self,tag):
  if tag in ['g','svg']:
   while self.stack:
    _,name=self.stack.pop()
    if name==tag:break
  for position in range(len(self.html_stack)-1,-1,-1):
   if self.nodes[self.html_stack[position]][0]==tag:
    del self.html_stack[position:];break

def validate_ta09(root,image_reader):
 root=root.resolve();ledger=root/LEDGER
 if not ledger.exists():
  assert not any((root/p).exists()for p in NATIVE),'Unrecorded TA09 implementation'
  return set(),0,0
 def local(name):
  assert type(name)is str and name and '\\'not in name and not PurePosixPath(name).is_absolute()and'..'not in PurePosixPath(name).parts,'Invalid TA09 relative path'
  p=(root/name).resolve();assert p.is_relative_to(root)and p.is_file(),'Missing or external TA09 input';return p
 def clean(name):return re.sub(r'/\*.*?\*/|<!--.*?-->','',local(name).read_text(),flags=re.S)
 def identity(row):
  assert type(row)is dict and set(row)=={'path','bytes','sha256'},'TA09 identity shape changed'
  raw=local(row['path']).read_bytes()
  assert type(row['bytes'])is int and row['bytes']==len(raw),'TA09 byte count changed'
  assert type(row['sha256'])is str and re.fullmatch('[a-f0-9]{64}',row['sha256'])and hashlib.sha256(raw).hexdigest()==row['sha256'],'TA09 hash changed'
  return len(raw)
 assert ledger.resolve().is_relative_to(root),'TA09 ledger escapes repository'
 m=json.loads(ledger.read_text())
 assert type(m)is dict and set(m)=={'format','version','task','scope','budgets','files','assets','reusedAssets','promptReferences','sourceReferences','bindings','userAcceptance'},'TA09 ledger shape changed'
 assert m['format']=='chenyuan-equipment-ta09'and type(m['version'])is int and m['version']==1 and m['task']=='Goal4 TA09','TA09 header changed'
 assert m['scope']==SCOPE and m['userAcceptance']is False,'TA09 cannot claim rules or human acceptance'
 assert type(m['budgets'])is dict and m['budgets']==BUDGETS and all(type(x)is int for x in m['budgets'].values()),'TA09 fixed budgets changed'
 assert m['assets']==[]and m['promptReferences']==[],'TA09 adds no raster assets or generation'
 assert m['sourceReferences']==REFS and m['bindings']==BINDINGS,'TA09 reference or proof inventory changed'
 for p in REFS:local(p)
 assert type(m['files'])is list and all(type(x)is dict for x in m['files'])and [x.get('path')for x in m['files']]==NATIVE,'TA09 ordered five-file inventory changed'
 total=sum(identity(row)for row in m['files']);assert total<=30000,'TA09 native code exceeds fixed budget'
 assert m['reusedAssets']==REUSED_ASSETS,'TA09 must reuse the exact four original objects'
 for a in REUSED_ASSETS:
  for role in ['source','runtime']:identity(a[role])
  dimensions,alpha,fmt=image_reader(local(a['runtime']['path']).read_bytes(),'.webp')
  assert dimensions==dict(width=512,height=512)and alpha is True and fmt=='webp','TA09 reused transparent runtime changed'
 for old in OLD_CAPS:
  value=json.loads(local(old['ledger']).read_text());assert type(value[old['key']])is int and value[old['key']]==old['limit'],'TA09 changed an old cap'
  assert [x['path']for x in value['files']]==old['files'],'TA09 moved old implementation out of its budget'
  assert sum(identity(row)for row in value['files'])<=old['limit'],'TA09 exceeds old budget'
 for p,tokens in BINDINGS.items():
  text=clean(p);assert all(token in text for token in tokens),'Missing TA09 formal proof or consumer: '+p
 # A blueprint with unfinished actual attrs must fail closed, never fake a pass.
 assert CONSUMERS_CONFIRMED is True and CONSUMERS and FORM_CONSUMERS and STYLESHEET_HOSTS,'TA09 actual consumer contract is not confirmed'
 assert {row['component']for row in CONSUMERS}>={'JadeEngraving','StudyQueueRail','RelicInscription'},'TA09 child contract incomplete'
 for row in CONSUMERS:
  text=clean(row['host']);name=row['component']
  assert re.search(r'(?m)^\s*import\s+'+name+r'\s+from\s+[\'\"]\./'+name+r'\.vue[\'\"]',text),'TA09 live import missing'
  tree=Tags(text);indices=[i for i,(tag,_)in enumerate(tree.nodes)if tag==name.lower()]
  assert len(indices)==1 and all(tree.nodes[indices[0]][1].get(k)==v for k,v in row['attrs'].items()),'TA09 trusted props or readonly event detached'
  for slot in row.get('requiredSlots',[]):
   slots=[i for i,(tag,attrs)in enumerate(tree.nodes)if tag=='template'and('#'+slot in attrs or attrs.get('v-slot')==slot)]
   assert len(slots)==1 and indices[0]in tree.ancestors[slots[0]],'TA09 original content slot detached from its actual child'
 for name,props in PROPS.items():
  text=clean('web/src/'+name+'.vue');mprops=re.search(r'defineProps\s*<\s*\{(.*?)\}\s*>',text,re.S)
  assert mprops and all(re.search(r'\b'+p+r'\??\s*:',mprops[1])for p in props),'TA09 real props contract lost'
  forbidden=r'\b(?:useGame|useActivityPresentation|useEquipmentCycle|useConfigurationEcho|createConfigurationEchoTracker|createActivityEffectTracker|createActionFeedbackTracker|resolve|completeActivity)\s*\(|\b(?:setTimeout|setInterval|requestAnimationFrame|Date\.now|performance\.now|fetch|eval)\s*\(|\b(?:indexedDB|localStorage|sessionStorage|BroadcastChannel|WebSocket)\b'
  assert not re.search(forbidden,text),'TA09 child introduced Store/IO, a clock or reward resolver'
  assert not re.search(r'\b(?:props\.)?game(?:\.\w+|\[[^]]+\])+\s*(?:=(?!=|>)|\+=|-=|\+\+|--)|\b(?:props\.)?game[^\n;]*\.(?:push|splice|pop)\(',text),'TA09 child mutates Game'
  allowed=[]if name=='JadeEngraving'else['inspect','limits','remember']if name=='StudyQueueRail'else['inspect']
  emits=re.search(r'defineEmits\s*<\s*\{(.*?)\}\s*>',text,re.S)
  actual=re.findall(r'\b([a-zA-Z]+)\s*:',emits[1])if emits else[]
  assert set(actual)==set(allowed),'TA09 readonly emits changed'
 jade=Tags(clean(NATIVE[0]));inspect=[i for i,(tag,attrs)in enumerate(jade.nodes)if tag=='button'and attrs.get('data-testid')=='jade-object-inspect']
 assert len(inspect)==1 and all(jade.nodes[inspect[0]][1].get(k)==v for k,v in {':disabled':'locked',':aria-pressed':'locked?undefined:opened','@click':'!locked&&(opened=!opened)'}.items()),'TA09 jade inspection must reflect and respect its actual busy/open state'
 result=[i for i,(tag,attrs)in enumerate(jade.nodes)if tag=='span'and attrs.get('class')=='ta09-jade-result'];result_slot=[i for i,(tag,attrs)in enumerate(jade.nodes)if tag=='slot'and attrs.get('name')=='result']
 assert len(result)==len(result_slot)==1 and inspect[0]in jade.ancestors[result[0]]and result[0]in jade.ancestors[result_slot[0]],'TA09 jade result slot lost its actual reserved container'
 parent=Tags(clean('web/src/JadeStudyScene.vue'));parent_slot=[i for i,(tag,attrs)in enumerate(parent.nodes)if tag=='template'and'#result'in attrs];arrivals=[i for i,(tag,attrs)in enumerate(parent.nodes)if attrs.get('data-testid')=='jade-arrival']
 assert len(parent_slot)==len(arrivals)==1 and parent_slot[0]in parent.ancestors[arrivals[0]]and all(parent.nodes[arrivals[0]][1].get(k)==v for k,v in {'v-if':'effect||attuned',':data-sequence':'effect?.sequence??echo.effect.value?.sequence'}.items()),'TA09 jade result no longer consumes the actual trusted saved effect'
 spread_overrides=[]
 for rule in css_rules(clean(NATIVE[4])):
  values=re.findall(r'(?:^|;)\s*--jade-spread\s*:\s*([^;}]+)',rule['body'])
  for value in values:
   assert re.sub(r'\s+','',value)=='1!important','TA09 reduced spread value changed'
   spread_overrides.append(dict(selector=rule['selector'],contexts=rule['contexts']))
 assert spread_overrides==REDUCED_SPREAD_RULES,'TA09 reduced-motion spread override must target only actual working objects'
 helper=clean(NATIVE[3])
 view_type=re.search(r'export\s+type\s+QueueView\s*=\s*\{([^{}]*)\}',helper)
 assert view_type and re.sub(r'\s+','',view_type[1])=='runId:string;domain:QueueDomain;pages:Record<QueueDomain,number>;touched:boolean','TA09 QueueView must contain only readonly viewing fields, no command/runtime/Game'
 queue_tree=Tags(clean(NATIVE[1]));planner_tree=Tags(clean('web/src/LearningPlanner.vue'))
 prev=[index for index,(tag,attrs)in enumerate(queue_tree.nodes)if tag=='button'and attrs.get('data-testid')=='queue-prev']
 next_page=[index for index,(tag,attrs)in enumerate(queue_tree.nodes)if tag=='button'and attrs.get('data-testid')=='queue-next']
 assert len(prev)==1 and queue_tree.nodes[prev[0]][1].get('v-if')=='pageCount>1','TA09 queue pagination must require actual multiple pages'
 containers=[index for index,(tag,attrs)in enumerate(queue_tree.nodes)if tag=='div'and attrs.get('class')=='ta09-queue-page']
 assert len(next_page)==1 and len(containers)==1 and containers[0]in queue_tree.ancestors[next_page[0]]and queue_tree.nodes[containers[0]][1].get('v-if')=='pageCount>1','TA09 queue pagination next must descend from its actual conditional page container'
 queue_open=[attrs for tag,attrs in queue_tree.nodes if tag=='button'and attrs.get('data-testid')=='learning-plan-open']
 manual_open=[attrs for tag,attrs in planner_tree.nodes if tag=='button'and attrs.get('data-testid')=='learning-plan-open']
 assert len(queue_open)==1 and queue_open[0].get('@click')=="emit('limits')"and len(manual_open)==1 and manual_open[0].get('v-if')=="mode==='manual'"and manual_open[0].get('@click')=='openSettings','TA09 learning-plan-open must be the real queue/manual readonly entry'
 assert any(tag=='div'and attrs.get('class')=='art10-authorization-summary'and'v-else'in attrs for tag,attrs in planner_tree.nodes),'TA09 original full budget note lost'
 planner=clean('web/src/LearningPlanner.vue')
 assert '累计灵石上限 {{budget}} · 保留 {{reserve}}'in planner and all(any(tag=='input'and attrs.get('v-model.number')==field for tag,attrs in planner_tree.nodes)for field in ['budget','reserve']),'TA09 actual complete budget fields lost'
 assert all(token in planner for token in ["function openLibrary(){settings.value?.close();if(!library.value?.open)library.value?.showModal();}","function openSettings(){library.value?.close();if(!settings.value?.open)settings.value?.showModal();}"]),'TA09 real library/settings must be mutually exclusive readonly views'
 assert "function limits(){close();emit('limits');}"in clean('web/src/RelicAtelier.vue'),'TA09 actual relic limits must close readonly views only'
 relic=Tags(clean(NATIVE[2]));blank=[i for i,(tag,a)in enumerate(relic.nodes)if tag=='assetimage'and a.get('class')=='relic-cold-blank']
 assert len(blank)==1 and 'v-else'in relic.nodes[blank[0]][1] and relic.nodes[blank[0]][1].get(':path')=="'art/v2/equipment/'+id+'-blank-v1.webp'",'TA09 actual painted cold object detached'
 assert any(tag=='gameicon'and a.get('kind')=='relic'and a.get(':id')=='id'and blank[0]in relic.ancestors[i]for i,(tag,a)in enumerate(relic.nodes)),'TA09 actual cold object fallback lost'
 finished=[i for i,(tag,a)in enumerate(relic.nodes)if tag=='div'and a.get('class')=='relic-finished-art'and a.get('v-if')=='finished']
 assert len(finished)==1 and any(tag=='slot'and a.get('name')=='artifact'and finished[0]in relic.ancestors[i]for i,(tag,a)in enumerate(relic.nodes)),'TA09 saved finished artifact slot detached'
 for role in ['relic-tool','relic-sealing']:
  objects=[i for i,(tag,a)in enumerate(relic.nodes)if a.get('class')==role]
  assert len(objects)==1 and relic.geometry[objects[0]]>0,'TA09 actual tool or sealing geometry lost'
 assert not re.search(forbidden,helper),'TA09 projection introduced IO, clocks or rule resolution'
 assert not re.search(r'\bgame(?:\.\w+|\[[^]]+\])+\s*(?:=(?!=|>)|\+=|-=|\+\+|--)|\bgame[^\n;]*\.(?:push|splice|pop)\(',helper),'TA09 projection mutates Game'
 assert re.search(r'export\s+const\s+MANUAL_FORM\s*=\s*[\'\"]manual[\'\"]',helper),'TA09 manual form missing'
 def literal_body(name):
  found=re.search(r'export\s+const\s+'+name+r'(?:\s*:[^=]+)?\s*=\s*\{',helper)
  assert found,'TA09 actual shape map missing: '+name
  start=found.end();depth=1;quote=None;escape=False
  for index,char in enumerate(helper[start:],start):
   if quote:
    if escape:escape=False
    elif char=='\\':escape=True
    elif char==quote:quote=None
   elif char in "\"'":quote=char
   elif char=='{':depth+=1
   elif char=='}':
    depth-=1
    if depth==0:return helper[start:index]
  raise AssertionError('TA09 unterminated shape map')
 jade_body=literal_body('JADE_FORMS')
 jade_entries=list(re.finditer(r"([a-z_]+)\s*:\s*\{([^{}]*)\}",jade_body))
 actual_jade={};residue=jade_body
 for entry in jade_entries:
  pairs=re.findall(r"([a-z_]+)\s*:\s*['\"]([a-z_]+)['\"]",entry[2])
  assert len(pairs)==2 and set(dict(pairs))=={'form','variant'},'TA09 jade family/variant grammar changed'
  assert not re.sub(r"([a-z_]+)\s*:\s*['\"]([a-z_]+)['\"]|[\s,]",'',entry[2]),'TA09 jade form has nonliteral values'
  assert entry[1]not in actual_jade,'TA09 duplicate jade identity'
  actual_jade[entry[1]]=dict(pairs);residue=residue.replace(entry[0],'',1)
 assert not re.sub(r'[\s,]','',residue)and actual_jade==JADE_EXPECTED,'TA09 exact twelve jade families/variants changed'
 relic_body=literal_body('RELIC_FORMS');relic_entries=list(re.finditer(r"([a-z_]+)\s*:\s*['\"]([a-z_]+)['\"]",relic_body));residue=relic_body
 for entry in relic_entries:residue=residue.replace(entry[0],'',1)
 assert len(relic_entries)==4 and not re.sub(r'[\s,]','',residue)and{entry[1]:entry[2]for entry in relic_entries}==RELIC_EXPECTED,'TA09 exact four distinct relic forms changed'
 expected_forms={('jade',x['form'])for x in JADE_EXPECTED.values()}|{('jade','manual')}|{('relic',x)for x in RELIC_EXPECTED.values()}
 assert {(x['domain'],x['form'])for x in FORM_CONSUMERS}==expected_forms,'TA09 actual shape branch inventory incomplete'
 for row in FORM_CONSUMERS:
  assert row['domain']in ['jade','relic']and row['form']in (set(x['form']for x in JADE_EXPECTED.values())|{'manual'}if row['domain']=='jade'else set(RELIC_EXPECTED.values())),'TA09 shape contract changed'
  tree=Tags(clean(row['source']));matches=[index for index,(tag,attrs)in enumerate(tree.nodes)if tag==row['tag']and all(k in attrs and attrs[k]==v for k,v in row['attrs'].items())]
  assert len(matches)==1 and tree.geometry[matches[0]]>0,'TA09 map is not consumed by real SVG shape'
 tree=Tags(clean(NATIVE[0]));advanced=[i for i,(tag,attrs)in enumerate(tree.nodes)if tag=='path'and attrs.get('v-if')=="variant==='advanced'"and attrs.get('class')=='ta09-jade-inlay'];assert len(advanced)==1 and tree.geometry[advanced[0]]>0,'TA09 advanced variant has no actual inlay'
 assert any(re.search(r'(?m)^\s*import\s+[\'\"]\./ta09-equipment\.css[\'\"]',clean(p))for p in STYLESHEET_HOSTS),'TA09 stylesheet is not actually consumed'
 return set(NATIVE)|{LEDGER},0,total
