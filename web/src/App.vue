<script setup lang="ts">
import { computed, nextTick, onMounted, onScopeDispose, ref, shallowRef, watch } from 'vue';
import { useGame } from './store';
import {useFocus,visibleFocusTarget} from './focus';
import * as C from '../../src/full/content.ts';
import { availableEvents } from '../../src/full/engine.ts';
import { gamePhase } from '../../src/full/contracts.ts';
import { getBreakthroughGoal, previewAction, getStoryContext, getRelationships, getLifeOverview, getLifeRecord, exportLifeText, getTrialPreparation, getTrialJourney, getAscensionChoices } from '../../src/full/queries.ts';
import type { ActionPreview } from '../../src/full/queries.ts';
import type { Action, Move, Command } from '../../src/full/types.ts';
import { stories } from '../../src/full/events.ts';
import { MAX_SAVE_BYTES } from '../../src/full/versions.ts';
import { getTrackedGoal, planCollection, createConsumptionPreview, type CollectionTarget } from '../../src/full/goals.ts';
import { useTracking } from './use-tracking';
import { formatCosts, formatDelta } from './presentation';
import type { NavigationRequest } from './navigation';
import GoalPanel from './GoalPanel.vue';
import CharacterPanel from './CharacterPanel.vue';
import ScenePanel from './ScenePanel.vue';
import BattlePanel from './BattlePanel.vue';
import PrimaryNav from './PrimaryNav.vue';
import AssetImage from './AssetImage.vue';
import PortraitImage from './PortraitImage.vue';
import GameIcon from './GameIcon.vue';
import ActionEffects from './ActionEffects.vue';
import {NPC_PORTRAITS,SCENE_ASSETS,DESKTOP_UI_ASSETS,sceneAssetPath} from './assets';
import {scenePresentation} from './scene-presentation';
import BatchPreview from './BatchPreview.vue';
import ActionFeedback from './ActionFeedback.vue';
import EquipmentPanel from './EquipmentPanel.vue';
import GrowthPanel from './GrowthPanel.vue';
import RelationshipPanel from './RelationshipPanel.vue';
import LifePanel from './LifePanel.vue';
import type { LifeRecord } from '../../src/full/life-record.ts';
import { formatAgeMonths } from '../../src/full/life-record.ts';
import TrialPreparationPanel from './TrialPreparationPanel.vue';
import TrialProgressPanel from './TrialProgressPanel.vue';
import type { AscensionEnding } from '../../src/full/ascension.ts';
import type { SaveMutation } from './full-persistence';
import type { CheckpointSummary } from './store';
import {useLocalExperience} from './use-local-experience';
import LocalExperiencePanel from './LocalExperiencePanel.vue';
import {useSession} from './session';
import {demoCatalog,demoSpec,demoSave,parseDemoSave} from '../../src/demo.ts';
import {demoLink,normalLink} from './demo-loader';
import {guidanceFor,guideCatalog} from './guidance';
import GuidancePanel from './GuidancePanel.vue';

const session=useSession(),demoMenu=ref<HTMLDialogElement>();
const demoNode=session.kind==='demo'?demoSpec(session.node!.nodeId):null;
const demoMenuNodes=demoCatalog.map(node=>({...node,href:demoLink(node.id)}));
const store = useGame(), name = ref('顾长青'), tab = ref('修行'), batch = ref<number | 'target'>(1), quantity = ref(1);
const saveTone=computed(()=>!store.ready||store.busy?'pending':store.error||!store.available?'problem':store.game&&store.saved?'saved':'idle');
const saveDisplayLabel=computed(()=>store.saveLabel==='本次未保存'?'保存待确认':store.saveLabel);
const openingChoices=[{id:'help',name:'赠丹相助',detail:'结下赠药之缘'},{id:'trade',name:'以丹换简',detail:`获得剑简，剑修终结伤害 +${C.swordManual.damageBonus}`},{id:'leave',name:'保留丹药',detail:'保留回春丹，各自离开'}] as const;
const importNotice=ref('');let importReadRevision=0;
const experience=useLocalExperience();let appActive=true;const stopObserving=store.observe(experience.record,experience.fault);onScopeDispose(()=>{appActive=false;stopObserving();});
const collectionTarget = ref<CollectionTarget | null>(null), highlight = ref('');
const equipmentOpen=ref(false),resumeVisible=ref(false),hubView=ref('home');
const hubEntries=[{id:'forge',label:'丹炉',kind:'item',icon:'healing_pill'},{id:'skills',label:'功法',kind:'skill',icon:'sword_mind'},{id:'relics',label:'法宝',kind:'relic',icon:'cloud_mirror'},{id:'life',label:'生平',kind:'action',icon:'export'},{id:'goal',label:'目标',kind:'action',icon:'save'},{id:'help',label:'帮助',kind:'action',icon:'help'}] as const;
let navigationRevision = 0;
function selectTab(next: string) { navigationRevision++; tab.value = next;hubView.value=({'修行':'home','历练':'explore','行囊':'inventory','仙缘':'fate'} as Record<string,string>)[next]??'home'; return navigationRevision; }
const preparation = shallowRef<Action | null>(null);
const fontScale = computed({get:()=>experience.preferences.value.fontScale,set:(value:1|1.5|2)=>{void experience.setPreferences({fontScale:value});}}), reduceMotion = computed({get:()=>experience.preferences.value.reduceMotion,set:(value:boolean)=>{void experience.setPreferences({reduceMotion:value});}}), settings = ref<HTMLDialogElement>(), exportError = ref('');
const settingsButton=ref<HTMLButtonElement>(),contentPanel=ref<HTMLElement>(),navHeight=ref(0);
const desktopMedia=window.matchMedia('(min-width:1100px)'),wideScreen=ref(desktopMedia.matches);
function desktopChanged(){wideScreen.value=desktopMedia.matches;}
onMounted(()=>desktopMedia.addEventListener('change',desktopChanged));onScopeDispose(()=>desktopMedia.removeEventListener('change',desktopChanged));
const singleScreen=computed(()=>wideScreen.value&&fontScale.value===1),hubMain=computed(()=>singleScreen.value&&hubView.value==='home');
const hubTitle=computed(()=>({explore:'历练 · 云岚山海',inventory:'行囊 · 随身物资',forge:'丹炉 · 固定配方',skills:'功法 · 研习与配装',relics:'法宝 · 炼制与装备',life:'修仙生平',goal:'目标与筹备',fate:'仙缘 · 人物与手记',cultivation:'修行 · 预算与成长',current:'当前遭遇',battle:'术法说明与战报',receipt:'本次行动结算',character:'道者 · 寿元与配装'} as Record<string,string>)[hubView.value]??'行道详情');
let hubOpener:HTMLElement|null=null,hubOpenerId:string|undefined;
function rememberHubOrigin(event?:Event){
 hubOpener=event?.currentTarget instanceof HTMLElement?event.currentTarget:focus.capture();
 hubOpenerId=hubOpener?.dataset.testid;
}
async function openHub(view:string,event?:Event){
 if(view==='help')return showGameplayHelp();
 rememberHubOrigin(event);
 const independent=['goal','receipt','character'].includes(view);
 const owner=selectTab(independent?tab.value:view==='inventory'||view==='forge'?'行囊':view==='life'||view==='fate'?'仙缘':view==='explore'?'历练':'修行');
 hubView.value=view;
 if(view==='skills'||view==='relics')equipmentOpen.value=true;
 if(view==='life')lifeOpen.value=true;
 await nextTick();
 if(owner===navigationRevision&&!document.querySelector('dialog[open]'))focus.target(document.getElementById('feature-title'));
}
async function closeHub(){
 const opener=hubOpener,id=hubOpenerId;hubOpener=null;hubOpenerId=undefined;
 selectTab('修行');await nextTick();
 if(document.querySelector('dialog[open]'))return;
 const candidate=visibleFocusTarget(opener)?opener:id?document.querySelector<HTMLElement>(`[data-testid="${CSS.escape(id)}"]`):null;
 focus.target(visibleFocusTarget(candidate)?candidate:document.querySelector<HTMLElement>('[data-testid=hub-current]'));
}
function featureKey(event:KeyboardEvent){if(event.key==='Escape'&&singleScreen.value&&hubView.value!=='home'&&!document.querySelector('dialog[open]')){event.preventDefault();void closeHub();}}
onMounted(()=>document.addEventListener('keydown',featureKey));onScopeDispose(()=>document.removeEventListener('keydown',featureKey));
const focus=useFocus(()=>contentPanel.value??settingsButton.value??null);
let pendingContentFocus:{owner:number;opener:Element|null}|null=null;
function focusContent(){const target=contentPanel.value??document.getElementById('welcome-content');if(target){pendingContentFocus=null;focus.target(target);}else pendingContentFocus={owner:navigationRevision,opener:document.activeElement};}
function cancelPendingContentFocus(){pendingContentFocus=null;navigationRevision++;}
onMounted(()=>{document.addEventListener('pointerdown',cancelPendingContentFocus,true);document.addEventListener('keydown',cancelPendingContentFocus,true);});
onScopeDispose(()=>{document.removeEventListener('pointerdown',cancelPendingContentFocus,true);document.removeEventListener('keydown',cancelPendingContentFocus,true);pendingContentFocus=null;});
watch([()=>store.ready,()=>contentPanel.value],async()=>{if(!pendingContentFocus)return;await nextTick();const request=pendingContentFocus,target=contentPanel.value??document.getElementById('welcome-content');if(!request||!target)return;pendingContentFocus=null;if(appActive&&request.owner===navigationRevision&&document.activeElement===request.opener)focus.target(target);},{flush:'post'});
function showSettings(){focus.open(settings.value,settingsButton.value??null);}
async function showDemoMenu(event?:Event){const opener=settings.value?.open?settingsButton.value??null:event?.currentTarget instanceof HTMLElement?event.currentTarget:focus.capture();settings.value?.close();await nextTick();focus.open(demoMenu.value,opener);}
async function initialiseGame(){if(store.busy)return;await store.init();if(appActive)resumeVisible.value=session.kind==='normal'&&!!store.game&&store.available;if(appActive&&session.kind==='demo'&&store.available&&!store.game&&!store.busy)await store.importText(JSON.stringify(session.node!.game));}
function focusRegion(id:string){if(id==='goal-panel'&&singleScreen.value&&hubView.value!=='goal'){void openHub('goal');return;}focus.target(document.getElementById(id));}
function focusPrimary(){navigationRevision++;focus.target(contentPanel.value?.querySelector<HTMLElement>('[data-primary-region]')??contentPanel.value??null);}
const game = computed(() => store.game), core = computed(() => game.value?.core);
const tracking = useTracking(game);
const hubGoal=computed(()=>game.value?getTrackedGoal(game.value,tracking.target.value):null);
const pulse=shallowRef<{key:string;label:string;detail:string}|null>(null),pulseSeen=new Set<string>();let pulseRun='',pulseTimer:ReturnType<typeof setTimeout>|undefined;
watch(()=>[store.lastResult,store.busy,store.saved,store.available,store.error,core.value?.runId,core.value?.revision] as const,()=>{const result=store.lastResult,run=core.value?.runId;if(run!==pulseRun){pulseRun=run??'';pulseSeen.clear();pulse.value=null;}if(store.busy||store.error){if(pulseTimer)clearTimeout(pulseTimer);pulse.value=null;return;}if(!store.saved||!store.available||!result||result.runId!==run||result.revisionAfter!==core.value?.revision||result.revisionAfter<=result.revisionBefore||result.executedSteps<1)return;const key=result.runId+':'+result.commandId;if(pulseSeen.has(key))return;pulseSeen.add(key);if(pulseSeen.size>128)pulseSeen.delete(pulseSeen.values().next().value!);if(store.lastReplayed)return;const label=({CULTIVATE:'气息归元',SOURCE:'取材归囊',CRAFT:'丹成入囊',FORGE:'法宝炼成',BUY:'购入物资',REST:'静养回元'}as Record<string,string>)[result.type];if(!label)return;if(pulseTimer)clearTimeout(pulseTimer);pulse.value={key,label,detail:formatDelta(result.delta)};pulseTimer=setTimeout(()=>{pulse.value=null;},1600);});
onScopeDispose(()=>{if(pulseTimer)clearTimeout(pulseTimer);});
function selectTracking(target:Parameters<typeof tracking.select>[0]){navigationRevision++;tracking.select(target);}
watch([() => tracking.target.value, () => game.value?.core.runId], () => { collectionTarget.value = null; highlight.value = ''; });
watch(() => game.value?.core.player.realm, () => { if (tracking.target.value.kind === 'breakthrough') { collectionTarget.value = null; highlight.value = ''; } });
const realm = computed(() => C.realms[core.value?.player.realm ?? 'mortal']);
const location = computed(() => C.locations[core.value?.world.location ?? 'wilderness']);
const phase = computed(() => game.value ? gamePhase(game.value) : null);
const needsSchool=computed(()=>!!game.value&&phase.value==='idle'&&C.rank(game.value.core.player.realm)>=C.rank('qi')&&!game.value.school);
watch(()=>game.value?.core.runId,()=>{equipmentOpen.value=needsSchool.value;resumeVisible.value=false;});
watch(needsSchool,value=>{if(value)equipmentOpen.value=true;},{immediate:true});
async function startJourney(){const owner=++navigationRevision;await store.start(name.value);if(store.error||!game.value||owner!==navigationRevision)return;await nextTick();if(owner===navigationRevision)focusRegion('opening-actions');}
async function showEquipment(event?:Event){rememberHubOrigin(event);const opener=hubOpener,owner=selectTab('修行');if(singleScreen.value)hubView.value='skills';equipmentOpen.value=true;await nextTick();if(owner===navigationRevision&&!document.querySelector('dialog[open]')&&(document.activeElement===opener||document.activeElement===document.body))focus.target(document.querySelector<HTMLElement>('[data-testid="equipment-panel"]'));}
async function showBreakthroughGoal(){const opener=focus.capture();selectTracking({kind:'breakthrough'});if(singleScreen.value)hubView.value='goal';const owner=navigationRevision;await nextTick();if(owner===navigationRevision&&!document.querySelector('dialog[open]')&&(document.activeElement===opener||document.activeElement===document.body))focusRegion('goal-panel');}
const inspectingInventory=computed(()=>game.value?.status==='active'&&phase.value!=='idle'&&tab.value==='行囊');
async function resumeEncounter(){selectTab('修行');await nextTick();focusContent();}
const gameplayHelp=ref<HTMLDialogElement>(),guidanceEnabled=ref(true),skippedGuides=ref<string[]>([]);
const guidance=computed(()=>guidanceFor(game.value,store.lastReplayed?null:store.lastResult));
watch(()=>game.value?.core.runId,()=>skippedGuides.value=[]);
async function skipGuidance(){skippedGuides.value=[...skippedGuides.value,guidance.value.id];await nextTick();focusContent();}
async function showGameplayHelp(){const opener=settings.value?.open?settingsButton.value??null:focus.capture();settings.value?.close();await nextTick();focus.open(gameplayHelp.value,opener);}
const goal = computed(() => game.value ? getBreakthroughGoal(game.value) : null);
const journey = computed(() => game.value ? getTrialJourney(game.value) : null);
const overview = computed(() => game.value ? getLifeOverview(game.value) : null);
const lifeOpen = ref(false), lifeSection = ref<HTMLDetailsElement>(), lifeDialog = ref<HTMLDialogElement>();
const journalExpanded=ref(false),recentJournal=computed(()=>[...(game.value?.journal??[])].reverse()),visibleJournal=computed(()=>journalExpanded.value?recentJournal.value:recentJournal.value.slice(0,10));
watch(()=>game.value?.core.runId,()=>journalExpanded.value=false);
const lifeIntent = shallowRef<{ command: Command; record: LifeRecord } | null>(null);
const lifeStale = computed(() => !!lifeIntent.value && (!game.value || game.value.core.runId !== lifeIntent.value.command.runId || game.value.core.revision !== lifeIntent.value.command.expectedRevision));
const context = computed(() => ({ state: game.value, cache: new Map<string, ActionPreview>() }));
function quote(action: Action) {
  const current = context.value;
  if (!current.state) return null;
  const key = JSON.stringify(action);
  if (!current.cache.has(key)) current.cache.set(key, previewAction(current.state, action));
  return current.cache.get(key)!;
}
const can = (action: Action) => store.available && !store.busy && !!quote(action)?.allowed;
const why = (action: Action) => !store.available ? '存储尚未就绪，请重新读取或导出原件' : store.busy ? '正在保存，请稍候' : quote(action)?.failure?.message ?? '';
function cost(action: Action) {
  const preview = quote(action), c = preview?.costs;
  if (!c) return '';
  const text = formatCosts(c);
  return preview && preview.requestedSteps > 1 ? '每次 ' + text : text;
}
function act(action: Action) { resumeVisible.value=false;if (action.type === 'START_TRIAL') return showTrialPreparation(); if (action.type === 'END') return reviewAscension(action.ending); const owner=navigationRevision; return focus.afterAction(async()=>{await store.act(action);if(singleScreen.value&&!store.error&&owner===navigationRevision&&action.type==='ENCOUNTER'&&game.value?.battle){tab.value='修行';hubView.value='home';}},()=>owner===navigationRevision); }
function retryOperation(){const owner=navigationRevision;return focus.afterAction(()=>store.retry(),()=>owner===navigationRevision);}
async function travel(id: C.LocationId) {
  const navigation = ++navigationRevision;
  await act({ type: 'TRAVEL', location: id });
  if (!store.error && navigation === navigationRevision) selectTab(id === 'cave' ? '修行' : '历练');
}
const natural = computed<Action>(() => ({ type: 'CULTIVATE', method: 'natural', count: batch.value === 'target' ? C.maxBatch : batch.value }));
const assisted = computed<Action>(() => ({ type: 'CULTIVATE', method: 'assisted', count: batch.value === 'target' ? C.maxBatch : batch.value }));
const naturalPreview=computed(()=>quote(natural.value));
const cultivationHome=computed(()=>!!game.value&&phase.value==='idle'&&tab.value==='修行'&&core.value?.world.location==='cave');
const worldArt=computed(()=>game.value?sceneAssetPath(scenePresentation(game.value),cultivationHome.value):undefined);
function focusCultivation(){focus.target(document.getElementById('cultivation-actions'));}
const breakthrough = computed<Action>(() => ({ type: core.value?.player.realm === 'spirit' ? 'START_TRIAL' : 'BREAKTHROUGH' }));
const primaryBreakthrough=computed(()=>cultivationHome.value&&(core.value?.player.realm==='spirit'?core.value.player.xp>=realm.value.xpCap:!!quote(breakthrough.value)?.allowed));
const breakthroughLabel=computed(()=>core.value?.player.realm==='mortal'?'引气入体':core.value?.player.realm==='spirit'?'查看渡劫准备':'确认突破');
const activeStory = computed(() => game.value && core.value?.activeEvent && stories[core.value.activeEvent.id] ? getStoryContext(game.value, core.value.activeEvent.id) : null);
const relationships = computed(() => game.value ? getRelationships(game.value) : []);
const events = computed(() => game.value ? availableEvents(game.value) : []);
const activeEnemies = computed(() => Object.entries(C.enemies).filter(([, e]) => !e.trial && e.location === core.value?.world.location));
const localSources = computed(() => Object.entries(C.sources).filter(([, s]) => s.location === core.value?.world.location));
const sourceActions = computed(() => Object.fromEntries(localSources.value.map(([id]) => [id, batch.value === 'target' ?
  (game.value && collectionTarget.value ? planCollection(game.value, id, collectionTarget.value) : null) : { type: 'SOURCE', sourceId: id, count: batch.value } as Action])));
function sourceReason(id: string) {
  const action = sourceActions.value[id];
  if (action) return why(action);
  if (!collectionTarget.value) return '先从目标来源选取所需物资，或选择固定次数行动。';
  return collectionTarget.value.kind === 'stones' && C.sources[id].stones > 0 ?
    '灵石目标已经备齐，无需重复委托；可替换目标或选择固定次数。' :
    '此处不产当前目标物资，可切换来源或选择固定次数。';
}
async function navigate(request: NavigationRequest) {
  if (!game.value || store.busy || !store.available) return;
  const navigation = ++navigationRevision;
  if (game.value.core.world.location !== request.location) {
    const action: Action = { type: 'TRAVEL', location: request.location };
    if (!can(action)) return;
    await act(action); if (store.error) return;
  }
  if (navigation !== navigationRevision) return;
  const focusRevision = selectTab(request.tab); highlight.value = request.focusId ?? '';
  if(request.focusId&&/^(equipment-panel|school-|learn-|equip-|forge-|study-manual)/.test(request.focusId)){equipmentOpen.value=true;if(singleScreen.value)hubView.value=request.focusId.startsWith('forge-')?'relics':'skills';}if(singleScreen.value&&request.focusId?.startsWith('craft-'))hubView.value='forge';
  if (request.quantity) quantity.value = request.quantity;
  if (request.collection) collectionTarget.value = request.collection;
  await nextTick();
  if (navigationRevision !== focusRevision) return;
  const element = request.focusId ? document.querySelector<HTMLElement>(`[data-testid="${request.focusId}"]`) : null;
  if(element){const target=element.matches(':disabled')?(element.closest<HTMLElement>('article,.recipe,.market-row')??element.parentElement):element;if(target){if(target!==element)target.tabIndex=-1;target.scrollIntoView({block:'center'});focus.target(target);}}
}
const consumptionPreview = computed(() => game.value ? createConsumptionPreview(game.value, tracking.target.value, preparation.value) : null);
function consumption(action: Action) {
  const gaps = consumptionPreview.value?.(action) ?? [];
  return gaps.length ? '会消耗追踪物资：' + gaps.map(gap => `${C.items[gap.id!].name}将缺${gap.missing}`).join('、') + '；材料未被预留。' : '';
}
const collectionLabel = computed(() => collectionTarget.value ? `${collectionTarget.value.kind === 'item' ? C.items[collectionTarget.value.id].name : '灵石'}库存达到 ${collectionTarget.value.quantity}` : '从目标来源选取所需物资');
const knownItems = computed(() => Object.entries(C.items).filter(([id, item]) => !core.value || C.rank(item.min) <= C.rank(core.value.player.realm) || core.value.inventory[id] > 0));
const localRecipes = computed(() => Object.entries(C.recipes).filter(([, recipe]) => !core.value || C.rank(recipe.min) <= C.rank(core.value.player.realm)));
function battle(move: Move) { return act({ type: 'BATTLE', move }); }
function download(text: string, filename: string, mime = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function exportSave() { if (game.value) download(JSON.stringify(session.kind==='demo'?demoSave(session.node!.nodeId,session.node!.sourceDigest,game.value):game.value, null, 2), session.kind==='demo'?'尘缘问道-演示存档.json':'尘缘问道-存档.json'); }
async function exportRaw() {
  exportError.value = '';
  try { const text = await store.rawText(); if (text) download(text, '尘缘问道-原始数据库备份.json'); else exportError.value = '当前没有可导出的数据库'; }
  catch (e) { exportError.value = e instanceof Error ? e.message : String(e); }
}
async function importFile(event: Event) {
  const input = event.target as HTMLInputElement, file = input.files?.[0], owner=++importReadRevision;
  importNotice.value='';
  if (!file) return;
  input.value='';
  const intent=store.prepareImport();if(!intent)return;
  const owns=()=>appActive&&owner===importReadRevision;
  const unchanged=()=>!store.busy&&store.available&&(game.value?.core.runId??null)===intent.expectedRunId&&(game.value?.core.revision??0)===intent.expectedRevision;
  if (file.size > MAX_SAVE_BYTES) { store.validationError('存档大于 1 MB，未导入'); input.value = ''; return; }
  try {
    let raw=await file.text();
    if(!owns())return;
    if(!unchanged()){importNotice.value='读取文件期间进度已变化，未导入。请重新选择文件并核对当前进度。';return;}
    if(session.kind==='demo'){try{raw=JSON.stringify(parseDemoSave(raw,session.node!.nodeId,session.node!.sourceDigest));}catch(e){store.validationError(e instanceof Error?e.message:'演示存档无法核对。');return;}}
    if (!game.value || confirm(session.kind==='demo'?'导入将替换本节点的演示进度，正常存档保留。是否继续？':'导入将替换当前进度。建议先导出备份，是否继续？')) {
      if(owns())await store.importPrepared(raw,intent);
    }
  } catch { if(owns())importNotice.value='文件无法读取，未导入。已有进度保留，请重新选择可读取的存档。'; }
}
async function reset() {
  if (confirm(session.kind==='demo'?'重新载入会替换本节点的演示进度，正常存档保留。是否继续？':'重新开始会替换当前进度，确定已导出需要保留的存档？')) {
    if(session.kind==='demo')await store.importText(JSON.stringify(session.node!.game));else await store.restart(core.value?.player.name ?? name.value); if (!store.error) { selectTab('修行'); settings.value?.close(); }
  }
}
async function restore() {
  if (confirm('回到最近的完整准备检查点，当前进度将被替换，是否继续？')) {
    await store.checkpoint(); if (!store.error) { selectTab('修行'); settings.value?.close(); }
  }
}
function exportLife() { if (game.value) download(exportLifeText(game.value), '尘缘问道-生平.txt', 'text/plain;charset=utf-8'); }
async function showLife(event?:Event) {
  rememberHubOrigin(event);if(settings.value?.open){hubOpener=settingsButton.value??null;hubOpenerId=undefined;}settings.value?.close(); selectTab('仙缘');if(singleScreen.value)hubView.value='life';lifeOpen.value = true;
  await nextTick();const title=lifeSection.value?.querySelector<HTMLElement>('[data-testid=life-title]');focus.target(title??lifeSection.value??null);
}
async function requestEnd(type: 'RETIRE' | 'END_LIFE') {
  if (!game.value || !can({type})) return;
  const command = store.prepareAction({type}); if (!command) return;
  lifeIntent.value = { command, record: getLifeRecord(game.value) };
  const opener=settings.value?.open?settingsButton.value??null:focus.capture();settings.value?.close();await nextTick();focus.open(lifeDialog.value,opener);
}
async function confirmEnd() {
  const intent = lifeIntent.value; if (!intent || store.busy || lifeStale.value) return;
  await store.actPrepared(intent.command);
  if (!store.error) { lifeDialog.value?.close(); selectTab('仙缘');await nextTick();focus.target(document.querySelector<HTMLElement>('[data-testid=life-title]')); }
}
async function retryEnd() {
  const review = lifeIntent.value; if (!review || lifeStale.value || !store.canRetryFor(review.command.commandId)) return;
  await store.retryFor(review.command.commandId); if (!store.error) { lifeDialog.value?.close(); selectTab('仙缘');await nextTick();focus.target(document.querySelector<HTMLElement>('[data-testid=life-title]')); }
}
function cancelLife(event: Event) { if (store.busy) event.preventDefault(); }
function closeLifeReview() {
  if (lifeIntent.value) store.discardRetryFor(lifeIntent.value.command.commandId);
  lifeIntent.value = null;
}
const trialDialog = ref<HTMLDialogElement>();
const trialIntent = shallowRef<{ command: Command; view: ReturnType<typeof getTrialPreparation> } | null>(null);
const trialStale = computed(() => !!trialIntent.value && (!game.value || game.value.core.runId !== trialIntent.value.command.runId || game.value.core.revision !== trialIntent.value.command.expectedRevision));
async function showTrialPreparation() {
  if (core.value?.player.realm !== 'spirit') return;
  selectTab('修行');if(singleScreen.value)hubView.value='cultivation'; await nextTick();
  const heading = document.querySelector<HTMLElement>('[data-testid="trial-preparation-title"]');
  heading?.scrollIntoView({block:'start'}); heading?.focus({preventScroll:true});
}
async function reviewTrial() {
  if (!game.value || !can({type:'START_TRIAL'})) return;
  const command = store.prepareAction({type:'START_TRIAL'}); if (!command) return;
  trialIntent.value = { command, view: getTrialPreparation(game.value) };
  const opener=document.querySelector<HTMLElement>('[data-testid=trial-review-entry]');settings.value?.close();await nextTick();focus.open(trialDialog.value,opener);
}
async function confirmTrial() {
  const intent = trialIntent.value; if (!intent || store.busy || trialStale.value) return;
  await store.actPrepared(intent.command);
  if (!store.error) { trialDialog.value?.close(); selectTab('修行');await nextTick();focusContent(); }
}
async function retryTrial() { const intent = trialIntent.value; if (!intent || trialStale.value || !store.canRetryFor(intent.command.commandId)) return; await store.retryFor(intent.command.commandId); if (!store.error) { trialDialog.value?.close(); selectTab('修行');await nextTick();focusContent(); } }
function closeTrialReview() { if (trialIntent.value) store.discardRetryFor(trialIntent.value.command.commandId); trialIntent.value = null; }
const trialRestoreDialog = ref<HTMLDialogElement>();
const trialRestoreIntent = shallowRef<{ command: SaveMutation; checkpoint: CheckpointSummary } | null>(null);
const trialRestoreStale = computed(() => !!trialRestoreIntent.value && (!game.value || game.value.core.runId !== trialRestoreIntent.value.command.expectedRunId || game.value.core.revision !== trialRestoreIntent.value.command.expectedRevision));
async function requestTrialRestore() {
  if (store.checkpointSummary?.kind !== 'trial') return;
  const command = store.prepareCheckpoint(); if (!command) return;
  trialRestoreIntent.value = { command, checkpoint: structuredClone(store.checkpointSummary) };
  const opener=document.querySelector<HTMLElement>('[data-testid=trial-restore-open]');await nextTick();focus.open(trialRestoreDialog.value,opener);
}
async function confirmTrialRestore() {
  const review = trialRestoreIntent.value; if (!review || store.busy || trialRestoreStale.value) return;
  await store.restorePrepared(review.command);
  if (!store.error) { trialRestoreDialog.value?.close(); await showTrialPreparation(); }
}
async function retryTrialRestore() {
  const review = trialRestoreIntent.value; if (!review || trialRestoreStale.value || !store.canRetryFor(review.command.commandId)) return;
  await store.retryFor(review.command.commandId);
  if (!store.error) { trialRestoreDialog.value?.close(); await showTrialPreparation(); }
}
function closeTrialRestore() { if (trialRestoreIntent.value) store.discardRetryFor(trialRestoreIntent.value.command.commandId); trialRestoreIntent.value = null; }
const ascensionDialog = ref<HTMLDialogElement>();
const ascension = computed(() => game.value ? getAscensionChoices(game.value) : null);
const ascensionIntent = shallowRef<{ command: Command; view: ReturnType<typeof getAscensionChoices>; choice: ReturnType<typeof getAscensionChoices>['choices'][number]; ending: AscensionEnding } | null>(null);
const ascensionStale = computed(() => !!ascensionIntent.value && (!game.value || game.value.core.runId !== ascensionIntent.value.command.runId || game.value.core.revision !== ascensionIntent.value.command.expectedRevision));
async function reviewAscension(ending: AscensionEnding) {
  if (!game.value || !can({type:'END',ending})) return;
  const command = store.prepareAction({type:'END',ending}); if (!command) return;
  const view = getAscensionChoices(game.value);
  ascensionIntent.value = { command, view, choice: view.choices.find(choice => choice.ending === ending)!, ending };
  const opener=document.querySelector<HTMLElement>(`[data-testid=ending-${ending}]`);await nextTick();focus.open(ascensionDialog.value,opener);
}
async function showAscendedLife() {
  ascensionDialog.value?.close(); selectTab('仙缘'); await nextTick();
  const title = document.querySelector<HTMLElement>('[data-testid="life-title"]');
  title?.scrollIntoView({block:'start'}); title?.focus({preventScroll:true});
}
async function confirmAscension() {
  const review = ascensionIntent.value; if (!review || store.busy || ascensionStale.value) return;
  await store.actPrepared(review.command); if (!store.error) await showAscendedLife();
}
async function retryAscension() {
  const review = ascensionIntent.value; if (!review || ascensionStale.value || !store.canRetryFor(review.command.commandId)) return;
  await store.retryFor(review.command.commandId); if (!store.error) await showAscendedLife();
}
function closeAscension() { if (ascensionIntent.value) store.discardRetryFor(ascensionIntent.value.command.commandId); ascensionIntent.value = null; }
onMounted(async() => {await experience.init();if(appActive)await initialiseGame();});
</script>

<template>
  <div class="app-shell art-theme" :class="{'is-saving':store.busy,'text-enlarged':fontScale>1,'has-game':!!game,'cultivation-home':cultivationHome,'is-opening':phase==='opening','single-screen':singleScreen&&!!game,'hub-visible':hubMain,'hub-reduced':reduceMotion}" :data-font-scale="fontScale" :data-session="session.kind" :style="{'--font-scale':fontScale,'--nav-height':navHeight+'px'}">
    <AssetImage v-if="game" class="world-ambience" :path="worldArt" asset-id="world-ambience" eager aria-hidden="true"/>
    <nav class="skip-links" aria-label="快捷定位"><a :href="game?'#game-content':'#welcome-content'" @click.prevent="focusContent">跳到当前内容</a><a v-if="game?.status==='active'" href="#primary-navigation" @click.prevent="focusRegion('primary-navigation')">跳到主导航</a><a v-if="game" href="#goal-panel" @click.prevent="focusRegion('goal-panel')">跳到当前目标</a></nav>
    <header class="topbar">
      <div class="brand"><strong v-if="demoNode" class="demo-badge" data-testid="demo-badge">演示存档</strong><span class="seal">尘<br>缘</span><div><h1>尘缘问道</h1><p>一念尘缘起 · 千山共问道</p></div></div>
      <div v-if="core" class="where"><span class="diamond">◇</span> 云岚州 · {{location.name}} <small>修行第 {{core.world.elapsedMonths}} 月</small></div>
      <div class="top-actions"><div class="save-summary" :data-save-state="saveTone" data-testid="save-summary"><span class="save-state" role="status" data-testid="save-status"><GameIcon kind="action" id="save"/>{{saveDisplayLabel}}</span><small>本机存档</small></div><button v-if="game" class="top-export" @click="exportSave" :disabled="store.busy"><GameIcon kind="action" id="export"/> 导出存档</button><button ref="settingsButton" @click="showSettings">设置</button></div>
    </header>
    <section v-if="demoNode&&!hubMain" class="paper demo-banner" aria-label="演示存档说明"><strong>演示存档 · {{demoNode.label}}</strong><div class="demo-actions"><a :href="normalLink()" data-testid="demo-return">返回正常游戏</a><button @click="showDemoMenu" :disabled="store.busy">切换演示节点</button><button data-testid="demo-reset" @click="reset" :disabled="store.busy||!store.available">重新载入本节点</button></div><details class="demo-explanation"><summary>演示说明</summary><p>本版本每个节点的进度独立保存，使用相同修行规则；正常进度与显示设置不受影响。</p></details></section>
    <section v-if="resumeVisible&&game&&store.ready&&!hubMain" class="resume-strip" data-testid="resume-strip"><span>已续上本机进度 · {{realm.name}} · {{location.name}}</span><button type="button" class="text-button" @click="resumeVisible=false;focusPrimary()">继续当前内容 ↓</button></section>
    <div v-if="!store.ready" class="loading">正在展开仙途……</div>
    <div v-if="store.error" class="error-banner" role="alert" data-testid="error">
      <strong class="error-title">{{store.available?'本次操作需要处理':'存档暂不可用'}}</strong><p>{{store.error}}</p><p v-if="store.canRetry" class="small" data-testid="retry-policy">保存结果尚未确认。重试会核对同一次操作，不会重复结算。</p><button v-if="store.canRetry" class="primary" data-testid="retry" @click="retryOperation" :disabled="store.busy">重试本次操作</button>
      <button v-if="!store.available" data-testid="reload-storage" @click="initialiseGame()" :disabled="store.busy">重新读取</button>
      <button @click="exportRaw" :disabled="store.busy">导出原件备份</button>
    </div>
    <div v-if="store.warning" class="error-banner" role="status">{{store.warning}}</div>
    <div v-if="exportError" class="error-banner" role="alert">{{exportError}}</div>
    <div v-if="importNotice" class="error-banner" role="alert" data-testid="import-notice">{{importNotice}}</div>
    <section v-if="!hubMain && game && overview?.status==='active' && overview.remainingMonths!==null && overview.remainingMonths<=12" class="paper lifespan-warning" role="status" data-testid="lifespan-warning"><strong>余寿 {{overview.remainingMonths}} 游戏月 · {{overview.ageLabel}}</strong><p>{{overview.remainingMonths===1?'耗时行动将停止。若修为与突破物已备齐，仍可核对突破条件；也可恢复准备检查点，或确认度过最后1游戏月后收卷。':'游戏时间由行动消耗，阅读与离线不会扣减余寿。请核对当前准备与检查点。'}}</p><button data-testid="lifespan-open-life" @click="showLife">查看生平与收卷选择</button></section>
    <main v-if="store.ready && !game && !demoNode" id="welcome-content" tabindex="-1" class="welcome">
      <div class="welcome-art"><AssetImage class="welcome-backdrop" :path="SCENE_ASSETS.wilderness" asset-id="welcome-wilderness" eager/><div class="welcome-copy"><span class="eyebrow">尘缘问道 · 试玩版</span><h2>凡心未改，<br>仙途已在眼前。</h2><p>不计片刻，不赶境界。<br>采一味灵草，结一段因果，修属于自己的长生路。</p></div></div>
      <form class="paper welcome-form" @submit.prevent="startJourney">
        <span class="eyebrow">新建人生 / 凡心入道</span><h2>从此刻，问道。</h2><label for="name">你的道号</label>
        <input id="name" name="dao-name" spellcheck="false" v-model="name" maxlength="16" required autocomplete="off" :disabled="store.busy||!store.available">
        <p>通过修炼、材料与选择筹备下一步。数值未平衡，阅读和离线不会消耗寿元。</p>
        <button class="primary" type="submit" :disabled="store.busy || !store.available">踏入仙途 <span>→</span></button>
        <div class="welcome-secondary"><button type="button" data-testid="demo-menu-welcome" @click="showDemoMenu" :disabled="store.busy">演示节点</button><button type="button" data-testid="welcome-help" @click="showGameplayHelp">玩法帮助</button></div>
        <label class="file-button">导入已有存档<input type="file" name="save-import" accept=".json,application/json" @change="importFile" :disabled="store.busy || !store.available"></label>
        <details class="welcome-details"><summary>本机存档与试玩记录</summary><p class="small">必要试玩记录只保存在本机，不上传、不记录道号；可在设置关闭、清空或知情导出。进度仅保存在当前浏览器，导出备份可用于迁移。</p></details>
      </form>
    </main>
    <main v-if="store.ready&&!game&&demoNode" class="paper demo-banner"><h2>演示进度尚未就绪</h2><p>请核对上方错误后重试同次操作或重新读取；不会改动正常进度。</p><button @click="initialiseGame" :disabled="store.busy">重新读取演示进度</button></main>
    <div v-if="game&&core" class="effects-stage"><ActionEffects :result="store.lastResult" :replayed="store.lastReplayed" :run-id="core.runId" :revision="core.revision" :school="game.school" :reduce-motion="reduceMotion" @focus-fallback="focusContent" :busy="store.busy" :eligible="store.saved && store.available && !store.error"/></div>
    <div v-if="pulse&&singleScreen" :key="pulse.key" class="hub-pulse" :class="{still:reduceMotion}" role="status" data-testid="hub-pulse" :data-receipt="pulse.key"><strong>{{pulse.label}}</strong><span>{{pulse.detail}}</span></div>
    <main v-if="store.ready&&game&&core&&hubMain" class="game-hub" :aria-busy="store.busy" data-testid="game-hub">
      <CharacterPanel :game="game" compact @inspect="openHub('character',$event)"/>
      <section class="hub-stage" :class="{'hub-battle':!!game.battle,'hub-opening':phase==='opening'}" aria-label="游戏主舞台">
        <ScenePanel v-if="!game.battle" :game="game" :meditation="cultivationHome" :battle-stage="!!game.battle" :eyebrow="phase==='opening'?'山雨破庙':location.subtitle" :title="phase==='opening'?'雨中故人':location.name" description="一念尘缘起，千山共问道。"/>
        <section ref="contentPanel" id="game-content" class="paper hub-current" data-testid="hub-current" tabindex="-1" aria-label="当前内容">
          <template v-if="phase==='opening'"><div class="hub-opening-title"><PortraitImage id="shen" fallback="沈"/><div><span>破庙初遇 · 沈清禾</span><h2>一丹，一念。</h2></div></div><p class="story">山雨将歇，沈清禾向你求药。随身回春丹 ×{{core.inventory.healing_pill}}，要不要介入这段因果，由你决定。</p><div id="opening-actions" class="choices opening-choices" tabindex="-1" data-primary-region role="group" aria-label="破庙抉择"><button v-for="choice in openingChoices" :key="choice.id" :data-testid="choice.id" @click="act({type:'CHOOSE',choice:choice.id})" :disabled="!can({type:'CHOOSE',choice:choice.id})"><strong>{{choice.name}}</strong><small>{{cost({type:'CHOOSE',choice:choice.id})}}</small><small>{{choice.detail}}</small><small v-if="why({type:'CHOOSE',choice:choice.id})">{{why({type:'CHOOSE',choice:choice.id})}}</small></button></div><button class="text-button" @click="openHub('current',$event)">查看三种选择与剑简说明</button></template>
          <BattlePanel v-else-if="game.battle" :game="game" :can="can" :cost="cost" :why="why" compact @move="battle" @details="openHub('battle',$event)"/>
          <template v-else-if="phase==='idle'&&game.status==='active'&&core.world.location==='cave'">
            <div class="hub-action-heading"><h2>{{primaryBreakthrough?goal?.title:'自然吐纳'}}</h2><button class="text-button" data-testid="hub-cultivation-details" @click="openHub('cultivation',$event)">预算与成长</button></div>
            <p v-if="needsSchool" class="hub-school"><button data-testid="choose-school" @click="showEquipment">已入道 · 选择修法</button></p>
            <div id="cultivation-actions" class="hub-cultivation" tabindex="-1" data-primary-region data-testid="cultivation-actions"><div class="hub-main-action" data-testid="cultivation-card" :data-primary-action="primaryBreakthrough?'breakthrough':'cultivate'">
              <div class="hub-action-facts" data-testid="cultivation-facts"><span v-if="primaryBreakthrough">修为已圆满 · {{core.player.realm==='spirit'?'查看准备，不消耗物资':'单次突破'}}</span><span v-else-if="naturalPreview?.delta">预计修为 {{naturalPreview.delta.xp>0?'+':''}}{{naturalPreview.delta.xp}} · 实际可行 {{naturalPreview.executedSteps}} 次</span><span>{{primaryBreakthrough?cost(breakthrough):naturalPreview?.actualCosts?formatCosts(naturalPreview.actualCosts):cost(natural)}}</span></div>
              <button v-if="primaryBreakthrough" class="primary cultivate-primary" data-testid="breakthrough" @click="act(breakthrough)" :disabled="core.player.realm==='spirit'?!store.available||store.busy:!can(breakthrough)">{{breakthroughLabel}}</button>
              <button v-else class="primary cultivate-primary" data-testid="cultivate" @click="act(natural)" :disabled="!can(natural)">自然吐纳</button>
              <div class="hub-action-options"><label>吐纳批次 <select v-model.number="batch" aria-label="吐纳行动次数"><option :value="1">1 次</option><option :value="5">5 次</option><option :value="20">20 次</option><option :value="50">50 次</option><option value="target">达到目标</option></select></label><button v-if="!primaryBreakthrough" class="text-button" data-testid="breakthrough" @click="act(breakthrough)" :disabled="core.player.realm==='spirit'?!store.available||store.busy:!can(breakthrough)">{{breakthroughLabel}}<small>{{why(breakthrough)}}</small></button><button v-else class="text-button" data-testid="cultivate" @click="act(natural)" :disabled="!can(natural)">自然吐纳<small>{{why(natural)}}</small></button></div>
            </div><div class="cultivation-alternatives"><button data-testid="cultivate-assisted" @click="act(assisted)" :disabled="!can(assisted)"><GameIcon kind="item" id="core"/><span><strong>灵石辅助</strong><small>{{cost(assisted)}}</small><small>{{why(assisted)}}</small></span></button><button data-testid="rest" @click="act({type:'REST'})" :disabled="!can({type:'REST'})"><GameIcon kind="item" id="healing_pill"/><span><strong>洞府疗养</strong><small>{{cost({type:'REST'})}}</small><small>{{why({type:'REST'})}}</small></span></button></div></div>
          </template>
          <template v-else-if="phase==='idle'&&game.status==='active'"><h2>{{location.name}}</h2><p class="story">{{location.description}}</p><div data-primary-region tabindex="-1" class="hub-idle-actions"><button class="primary" data-testid="return-cave" @click="travel('cave')" :disabled="!can({type:'TRAVEL',location:'cave'})">返回洞府修行<small>{{cost({type:'TRAVEL',location:'cave'})}} {{why({type:'TRAVEL',location:'cave'})}}</small></button><button @click="selectTab('历练')">取材与挑战</button></div></template>
          <template v-else><h2>{{game.status==='active'?(activeStory?.name??(journey?'渡劫行程':'当前机缘')):overview?.title}}</h2><p class="story">{{game.status==='active'?'眼前的抉择尚待继续。查看资料不会推进游戏时间。':'此卷已收，来路犹存。'}}</p><div data-primary-region tabindex="-1"><button class="primary" @click="openHub(game.status==='active'?'current':'life',$event)">{{game.status==='active'?'继续当前遭遇':'查看生平与收卷'}}</button></div></template>
        </section>
      </section>
      <aside class="hub-aside"><section class="paper hub-goal"><span class="section-label">当前目标</span><h2 data-testid="hub-target">{{hubGoal?.title}}</h2><progress v-if="tracking.target.value.kind==='breakthrough'&&realm.xpCap" :value="core.player.xp" :max="realm.xpCap" aria-label="当前目标修为"/><p>{{hubGoal?.completed?'目标已达成':hubGoal?.preview?.failure?.message??'准备已齐，可核对当前行动。'}}</p><button data-testid="hub-goal-open" @click="openHub('goal',$event)">查看缺口与来源 →</button></section>
      <nav class="hub-services" aria-label="修仙功能"><button v-for="entry in hubEntries" :key="entry.id" :data-testid="`hub-${entry.id}`" @click="openHub(entry.id,$event)"><GameIcon :kind="entry.kind" :id="entry.icon"/><span>{{entry.label}}</span></button></nav>
      <section class="paper hub-recent" aria-live="polite"><span class="section-label">行道回响</span><p>{{game.journal.at(-1)}}</p><small v-if="store.lastResult">实际 {{store.lastResult.executedSteps}} / {{store.lastResult.requestedSteps}} 次 · {{formatDelta(store.lastResult.delta)}}</small><button v-if="store.lastResult" class="text-button" data-testid="hub-receipt" @click="openHub('receipt',$event)">查看本次结算</button><div v-if="resumeVisible" class="hub-resume" data-testid="resume-strip"><span>已续上本机进度</span></div><button v-if="demoNode" class="text-button" @click="showDemoMenu">切换演示节点</button><button v-if="overview?.remainingMonths!==null&&overview?.remainingMonths!==undefined&&overview.remainingMonths<=12" class="text-button" @click="showLife">余寿 {{overview.remainingMonths}} 月 · 查看生平</button></section></aside>
    </main>
    <main v-if="store.ready&&game && core" v-show="!hubMain" class="game-grid" :class="{'hub-feature':singleScreen}" :aria-busy="store.busy">
      <header v-if="singleScreen" class="feature-header"><div><span>尘缘问道 · {{location.name}}</span><h2 id="feature-title" tabindex="-1">{{hubTitle}}</h2></div><div class="feature-actions"><button v-if="hubView!=='goal'" data-testid="feature-goal" @click="openHub('goal',$event)">当前目标</button><button data-testid="hub-close" @click="closeHub">返回主舞台 <GameIcon kind="action" id="close"/></button></div></header>
      <section v-if="!hubMain&&(!singleScreen||hubView!=='goal')" class="center-column" :class="{'in-battle':game.battle&&!inspectingInventory}">
        <ScenePanel v-if="!singleScreen" :meditation="cultivationHome" :battle-stage="!!game.battle&&!inspectingInventory" :game="game" :eyebrow="phase==='opening'?'初遇 / 山雨破庙':location.subtitle" :title="phase==='opening'?'雨中故人':game.status==='ascended'?overview!.title:game.battle?location.name:activeStory?.name??location.name" :description="game.status==='ascended'?'此卷已收，来路犹存。':game.battle?'先辨来势，再决进退。':'山海不言，修行自有回响。'" :with-action="!cultivationHome&&(!game.battle||inspectingInventory)"><button v-if="!cultivationHome&&(!game.battle||inspectingInventory)" type="button" class="scene-action-link" data-testid="scene-action-jump" @click="focusPrimary">{{phase==='opening'?'前往抉择':'前往当前操作'}} ↓</button></ScenePanel>

        <ActionFeedback v-if="singleScreen&&hubView==='receipt'&&store.lastResult" :result="store.lastResult" :replayed="store.lastReplayed"/>
        <TrialProgressPanel v-if="journey || store.trialRecovery" :journey="journey" :recovery="store.trialRecovery" :checkpoint="store.checkpointSummary" :enabled="store.available && !store.busy" @restore="requestTrialRestore" @export="exportSave" @prepare="showTrialPreparation"/>
        <section v-if="!singleScreen||['home','explore','inventory','forge','fate','cultivation','current','battle'].includes(hubView)" ref="contentPanel" id="game-content" tabindex="-1" aria-label="当前内容" class="paper content-panel" :class="{'battle-content':game.battle&&!inspectingInventory}">
          <details v-if="game.battle&&!inspectingInventory&&guidanceEnabled&&!skippedGuides.includes(guidance.id)" class="battle-guidance"><summary>查看本场行道提示</summary><GuidancePanel :guide="guidance" @skip="skipGuidance" @help="showGameplayHelp"/></details>
          <GuidancePanel v-else-if="!cultivationHome&&phase!=='opening'&&guidanceEnabled&&!skippedGuides.includes(guidance.id)" :guide="guidance" @skip="skipGuidance" @help="showGameplayHelp"/>
          <section v-if="inspectingInventory" class="pending-inspection" data-testid="pending-inspection"><h3>当前遭遇待继续</h3><p>查看不会消耗游戏月，也不会改变当前事件、敌方意图或回合。物品使用、旅行与换装仍受当前遭遇限制。</p><button type="button" data-testid="resume-encounter" @click="resumeEncounter">返回当前遭遇</button></section>
          <template v-if="phase === 'opening' && !inspectingInventory">
            <div class="opening-heading"><PortraitImage class="speaker-portrait" id="shen" fallback="沈"/><div><span class="section-label">破庙初遇 · 沈清禾</span><h2>一丹，一念。</h2></div></div>
            <p class="story">山雨将歇，药修沈清禾向你求药。你随身带着回春丹 ×{{core.inventory.healing_pill}}，庙柱上的引气之法人人可习。要不要介入这段因果，由你决定。</p>
            <div id="opening-actions" class="choices opening-choices" tabindex="-1" data-primary-region role="group" aria-label="破庙抉择">
              <button v-for="choice in openingChoices" :key="choice.id" :data-testid="choice.id" @click="act({type:'CHOOSE',choice:choice.id})" :disabled="!can({type:'CHOOSE',choice:choice.id})">
                <strong>{{choice.name}}</strong><small>{{cost({type:'CHOOSE',choice:choice.id})}}</small><small>{{choice.detail}}</small><small v-if="why({type:'CHOOSE',choice:choice.id})">{{why({type:'CHOOSE',choice:choice.id})}}</small>
              </button>
            </div>
            <details class="opening-details"><summary>三种选择与剑简说明</summary><p class="small">三种选择均可入道，剧情不会直接赋予境界。惊鸿剑简用于剑修终结术法，伤害 +{{C.swordManual.damageBonus}}；三种开场均可在筑基后到青云宗付费研读同简。</p></details>
          </template>
          <template v-else-if="phase === 'trial-question' && journey && !inspectingInventory">
            <div class="section-label">渡劫 · 问心</div><h2>你愿如何面对来路？</h2><p class="story" data-testid="trial-question-memory">{{journey.openingMemory}}</p><p class="story">接纳旧我，稳住心神；或放下旧念，以进攻开路。两条道路皆可向前，不另判善恶成败。</p>
            <details class="trial-memories"><summary>回望已记录的选择</summary><p v-for="memory in journey.memories" :key="memory.id" class="small">{{memory.person}} · {{memory.title}}：{{memory.text}}</p></details>
            <div class="choices two" tabindex="-1" data-primary-region role="group" aria-label="问心选择"><button v-for="answer in journey.answers" :key="answer.id" :data-testid="`answer-${answer.id}`" @click="act({type:'ANSWER_TRIAL',answer:answer.id})" :disabled="!can({type:'ANSWER_TRIAL',answer:answer.id})"><strong>{{answer.label}} · {{answer.id==='accept'?'承受更稳':'进攻更强'}}</strong><small>{{answer.record}}</small><small>{{answer.preview.failure?.message}}</small></button></div>
          </template>
          <template v-else-if="activeStory && !inspectingInventory">
            <div class="section-label">当前遭遇 · {{activeStory.npc}}</div><div class="encounter-speaker"><PortraitImage class="speaker-portrait" :id="NPC_PORTRAITS[activeStory.npc]??''" :fallback="activeStory.npc.slice(0,1)"/><span>{{activeStory.npc}}</span></div><h2 data-testid="event-title">{{activeStory.name}}</h2><p class="story" data-testid="event-body">{{activeStory.body}}</p>
            <div class="choices" tabindex="-1" data-primary-region role="group" aria-label="当前遭遇选择"><button v-for="option in activeStory.options" :key="option.id" :data-testid="`decide-${option.id}`" @click="act({type:'DECIDE',option:option.id})" :disabled="!can({type:'DECIDE',option:option.id})"><strong>{{option.label}}</strong><small>{{option.detail}}</small><small>{{cost({type:'DECIDE',option:option.id})}}</small><small>{{why({type:'DECIDE',option:option.id})}}</small><small>{{consumption({type:'DECIDE',option:option.id})}}</small></button></div>
          </template>
          <template v-else-if="game.battle && !inspectingInventory">
            <BattlePanel :game="game" :can="can" :cost="cost" :why="why" @move="battle"/>
          </template>
          <template v-else-if="phase === 'trial-ending' && ascension && !inspectingInventory">
            <div class="section-label">天门已开 <span>三关已过，等待你的收束</span></div><h2>此生，留下些什么？</h2><p class="story">{{ascension.record.opening.text}} {{ascension.record.training.school}}的来路已经留在记录中。两种选择都以飞升成功收卷，没有善恶高低。</p>
            <p class="small">{{ascension.record.battle.trial}} 选择前可查看生平；取消不改变进度，确认保存后才封卷。</p>
            <div class="choices two" tabindex="-1" data-primary-region role="group" aria-label="飞升收束选择"><button v-for="choice in ascension.choices" :key="choice.ending" :data-testid="`ending-${choice.ending}`" @click="act({type:'END',ending:choice.ending})" :disabled="!can({type:'END',ending:choice.ending})"><strong>{{choice.label}}</strong><small>{{choice.description}}</small><small>{{choice.preview.failure?.message}}</small></button></div>
          </template>
          <template v-else-if="game.status !== 'active'">
            <LifePanel data-primary-region tabindex="-1" :game="game" :enabled="store.available" :busy="store.busy" :has-checkpoint="store.hasCheckpoint" @export="exportLife" @restore="restore" @restart="reset"/>
          </template>
          <template v-else-if="tab === '修行'">
            <template v-if="core.world.location === 'cave'">
              <div v-if="needsSchool" class="school-prompt"><div><strong>已入道，可选择修法</strong><p>剑修积蓄剑意，符修留印引爆；选择不会推进年月。</p></div><button type="button" data-testid="choose-school" @click="showEquipment">查看两种修法 →</button></div>
              <div class="cultivation-topline"><span class="section-label">听雨修行 · 道行由此积累</span><button type="button" class="text-button" data-testid="cultivation-jump" @click="focusCultivation">前往修行动作 ↓</button></div>
              <div class="cultivation-actions" id="cultivation-actions" tabindex="-1" data-primary-region data-testid="cultivation-actions">
                <section class="natural-action" data-testid="cultivation-card" :data-primary-action="primaryBreakthrough?'breakthrough':'cultivate'">
                  <div class="natural-illustration" aria-hidden="true"><AssetImage :path="DESKTOP_UI_ASSETS.meditation" asset-id="meditation-ink" fit="contain"><GameIcon class="meditation-fallback" kind="nav" id="cultivate"/></AssetImage></div>
                  <div class="cultivation-main"><h2>{{primaryBreakthrough?goal?.title:'自然吐纳'}}</h2>
                    <div v-if="primaryBreakthrough" class="cultivation-facts" data-testid="cultivation-facts"><span>修为已圆满</span><span>{{core.player.realm==='spirit'?'查看条件':'单次突破'}}</span><span>{{core.player.realm==='spirit'?'正式入场成本：':''}}{{cost(breakthrough)}}</span></div>
                    <div v-else class="cultivation-facts" data-testid="cultivation-facts"><span v-if="naturalPreview?.delta">预计修为 {{naturalPreview.delta.xp>0?'+':''}}{{naturalPreview.delta.xp}}</span><span v-if="naturalPreview?.allowed">实际可行 {{naturalPreview.executedSteps}} 次</span><span>{{naturalPreview?.actualCosts?formatCosts(naturalPreview.actualCosts):cost(natural)}}</span></div>
                    <button v-if="primaryBreakthrough" class="primary cultivate-primary" data-testid="breakthrough" @click="act(breakthrough)" :disabled="core.player.realm==='spirit'? !store.available||store.busy:!can(breakthrough)">{{breakthroughLabel}}</button>
                    <p v-if="primaryBreakthrough&&core.player.realm==='spirit'" class="small action-reason">查看准备不消耗物资，正式入场另行确认。</p>
                    <button :class="primaryBreakthrough?'secondary-cultivate':'primary cultivate-primary'" data-testid="cultivate" @click="act(natural)" :disabled="!can(natural)">自然吐纳</button><p v-if="why(natural)&&!primaryBreakthrough" class="small action-reason">{{why(natural)}}</p>
                    <label class="cultivation-batch">吐纳批次 <select v-model.number="batch" aria-label="吐纳行动次数"><option :value="1">1 次</option><option :value="5">5 次</option><option :value="20">20 次</option><option :value="50">50 次</option><option value="target">达到目标</option></select></label>
                  </div>
                </section>
                <div class="cultivation-alternatives"><button data-testid="cultivate-assisted" @click="act(assisted)" :disabled="!can(assisted)"><GameIcon kind="item" id="core"/><span><strong>灵石辅助</strong><small>{{cost(assisted)}}</small><small>{{why(assisted)}}</small></span></button><button data-testid="rest" @click="act({type:'REST'})" :disabled="!can({type:'REST'})"><GameIcon kind="item" id="healing_pill"/><span><strong>洞府疗养</strong><small>{{cost({type:'REST'})}}</small><small>{{why({type:'REST'})}}</small></span></button></div>
              </div>
            </template>
            <template v-else><div class="section-label">修行</div><h2>静守灵台，凝气归元。</h2><p class="story">{{location.description}}</p><div tabindex="-1" data-primary-region><button class="primary" data-testid="return-cave" @click="travel('cave')" :disabled="!can({type:'TRAVEL',location:'cave'})">返回洞府修行 →</button></div></template>
            <div v-if="!primaryBreakthrough" class="breakthrough"><div><strong>{{goal?.title}}</strong><small>{{why(breakthrough) || '准备已经齐全'}}</small></div><button class="primary" data-testid="breakthrough" @click="act(breakthrough)" :disabled="core.player.realm==='spirit' ? !store.available || store.busy : !can(breakthrough)">{{breakthroughLabel}}</button><button v-if="cultivationHome&&core.player.xp>=realm.xpCap&&!can(breakthrough)&&core.player.realm!=='spirit'" type="button" class="text-button" data-testid="track-breakthrough-preparation" @click="showBreakthroughGoal">追踪突破筹备 →</button></div>
            <details v-if="core.world.location==='cave'" class="cultivation-details"><summary>本批预算、预计结果与洞府见闻</summary><p class="story">{{location.description}}</p><p class="small">每批最多 {{C.maxBatch}} 次；成本与停止原因按真实行动结算。</p><div class="batch-previews"><BatchPreview label="自然吐纳" :preview="quote(natural)"/><BatchPreview label="灵石辅助" :preview="quote(assisted)"/></div></details>
          </template>
          <template v-else-if="tab === '历练'">
            <div class="section-label">历练</div><p class="story">{{location.description}}</p>
            <div class="locations" tabindex="-1" data-primary-region><button v-for="(place,id) in C.locations" :key="id" :data-testid="`travel-${id}`" :class="{selected:core.world.location===id}" :aria-current="core.world.location===id?'location':undefined" @click="travel(id)" :disabled="!can({type:'TRAVEL',location:id})">{{place.name}}<small v-if="core.world.location!==id">{{cost({type:'TRAVEL',location:id})}}</small><small>{{why({type:'TRAVEL',location:id})}}</small></button></div>
            <div class="action-options"><label>连续采集/委托 <select v-model="batch" aria-label="取材次数"><option :value="1">1 次</option><option :value="5">5 次</option><option :value="20">20 次</option><option :value="50">50 次</option><option value="target">达到目标</option></select></label><small v-if="batch==='target'" data-testid="collection-target">{{collectionLabel}}</small></div>
            <div class="source-grid"><div v-for="[id,source] in localSources" :key="id"><button :data-testid="`source-${id}`" :class="{highlight:highlight===`source-${id}`}" @click="sourceActions[id] && act(sourceActions[id]!)" :disabled="!sourceActions[id] || !can(sourceActions[id]!)"><strong>{{source.name}}</strong><small>{{sourceActions[id] ? cost(sourceActions[id]!) : '本批不会执行'}}</small><small v-if="source.stones">灵石 +{{source.stones}}</small><small v-for="(n,item) in source.items" :key="item">{{C.items[item].name}} +{{n}}</small><small>{{sourceReason(id)}}</small></button><BatchPreview :label="source.name" :preview="sourceActions[id] ? quote(sourceActions[id]!) : null" :reason="sourceReason(id)"/></div></div>
            <div v-if="activeEnemies.length" class="encounters"><h3>此地挑战</h3><div class="choices two"><button v-for="[id,enemy] in activeEnemies" :key="id" :data-testid="`encounter-${id}`" :class="{highlight:highlight===`encounter-${id}`}" @click="act({type:'ENCOUNTER',enemy:id})" :disabled="!can({type:'ENCOUNTER',enemy:id})"><strong>{{enemy.name}}</strong><small>气血 {{enemy.hp}} · 胜利后取得奖励</small><small>{{why({type:'ENCOUNTER',enemy:id})}}</small></button></div></div>
            <div v-if="core.world.location==='market'" class="market"><label>每次采购数量 <input type="number" min="1" :max="C.maxQuantity" v-model.number="quantity" aria-label="采购数量"></label><div class="market-row" v-for="[id,item] in knownItems" :key="id"><div><strong>{{item.name}}</strong><small>{{item.description}}</small></div><button :data-testid="`buy-${id}`" :class="{highlight:highlight===`buy-${id}`}" @click="act({type:'BUY',item:id,quantity})" :disabled="!can({type:'BUY',item:id,quantity})">购入 · {{cost({type:'BUY',item:id,quantity})}}<small>{{why({type:'BUY',item:id,quantity})}}</small></button></div></div>
          </template>
          <template v-else-if="tab === '行囊'">
            <div v-if="!singleScreen||hubView!=='forge'" class="section-label">行囊 <span>一草一石，皆有其用</span></div><div v-if="!singleScreen||hubView!=='forge'" class="inventory" tabindex="-1" data-primary-region><article v-for="[id,item] in knownItems" :key="id"><div class="item-glyph" aria-hidden="true"><GameIcon kind="item" :id="id"/></div><div><strong>{{item.name}} <b :data-testid="`item-${id}`">×{{core.inventory[id]}}</b></strong><small>{{item.description}}</small><small v-if="item.hp || item.mp">{{why({type:'USE',item:id})}}</small><small v-if="item.hp || item.mp">{{consumption({type:'USE',item:id})}}</small><template v-else-if="item.sell!==null"><small v-if="core.world.location==='market'">{{why({type:'SELL',item:id,quantity:1})}}</small><small>{{consumption({type:'SELL',item:id,quantity:1})}}</small></template><button class="text-button" :data-testid="`track-${id}`" @click="selectTracking({kind:'item',id,quantity:1})">追踪此物资 →</button></div><button v-if="item.hp || item.mp" @click="act({type:'USE',item:id})" :disabled="!can({type:'USE',item:id})">服用</button><button v-else-if="item.sell!==null && core.world.location==='market'" @click="act({type:'SELL',item:id,quantity:1})" :disabled="!can({type:'SELL',item:id,quantity:1})">售出 · {{item.sell}}</button></article></div>
            <h3 v-if="!singleScreen||hubView!=='inventory'" class="recipes-title">丹炉 · 固定配方</h3><p v-if="singleScreen&&hubView==='forge'&&!localRecipes.length" class="small" data-testid="forge-locked">引气入体后可在洞府炼丹；当前尚无可用配方。</p><p v-if="(!singleScreen||hubView!=='inventory')&&core.world.location!=='cave'" class="small">需在洞府炼丹。<button @click="travel('cave')" :disabled="!can({type:'TRAVEL',location:'cave'})">前往洞府</button></p>
            <div v-show="!singleScreen||hubView!=='inventory'" class="recipe" v-for="[id,recipe] in localRecipes" :key="id"><div><strong>{{recipe.name}}</strong><small>{{cost({type:'CRAFT',recipeId:id})}}</small><small>{{why({type:'CRAFT',recipeId:id})}}</small><small>{{consumption({type:'CRAFT',recipeId:id})}}</small></div><button :data-testid="`craft-${id}`" :class="{highlight:highlight===`craft-${id}`}" @click="act({type:'CRAFT',recipeId:id})" :disabled="!can({type:'CRAFT',recipeId:id})">炼制</button></div>
          </template>
          <template v-else>
            <div class="section-label">仙缘</div><button class="text-button" data-testid="show-life" @click="showLife">查看修仙生平 →</button><RelationshipPanel data-primary-region tabindex="-1" :game="game" :enabled="store.available && !store.busy" @navigate="navigate"/>
            <div class="choices"><button v-for="event in events" :key="event.id" :data-testid="`event-${event.id}`" :class="{highlight:highlight===`event-${event.id}`}" @click="act({type:'EVENT',event:event.id})" :disabled="!can({type:'EVENT',event:event.id})">{{event.name}} · {{event.npc}}</button></div>
            <h3>近期手记</h3><p class="small">仅保留最近100条；当前显示{{visibleJournal.length}}条，共{{recentJournal.length}}条。完整已选事实请查看修仙生平。</p><ol id="recent-journal" class="journal"><li v-for="(line,index) in visibleJournal" :key="index">{{line}}</li></ol><button v-if="recentJournal.length>10" type="button" class="text-button" data-testid="journal-toggle" :aria-expanded="journalExpanded" aria-controls="recent-journal" @click="journalExpanded=!journalExpanded">{{journalExpanded?'收起较早条目':`展开全部 ${recentJournal.length} 条近期手记`}}</button>
          </template>
          <GuidancePanel v-if="(cultivationHome||phase==='opening')&&guidanceEnabled&&!skippedGuides.includes(guidance.id)" :guide="guidance" @skip="skipGuidance" @help="showGameplayHelp"/>
        </section>
        <div v-if="tab==='仙缘'&&phase!=='idle'&&game.status==='active'" class="paper inline-actions"><button type="button" class="text-button" data-testid="show-life" @click="showLife">查看修仙生平 →</button><button type="button" data-testid="resume-encounter" @click="resumeEncounter">返回当前遭遇</button></div>
        <RelationshipPanel v-if="tab==='仙缘' && phase!=='idle'" :game="game" :enabled="store.available && !store.busy" @navigate="navigate"/>
        <details v-if="tab==='仙缘' && game.status==='active'&&(!singleScreen||hubView==='life')" ref="lifeSection" class="paper life-section" :open="lifeOpen" @toggle="lifeOpen=($event.target as HTMLDetailsElement).open" data-testid="life-section"><summary>修仙生平 · 查看、导出与收卷</summary><LifePanel v-if="lifeOpen" :game="game" :enabled="store.available" :busy="store.busy" :has-checkpoint="store.hasCheckpoint" @end="requestEnd" @export="exportLife" @restore="restore" @restart="reset"/></details>
        <GrowthPanel v-if="(!singleScreen||hubView==='cultivation')&&tab==='修行' && phase==='idle' && C.rank(core.player.realm)>=C.rank('foundation') && core.player.realm!=='spirit'" :game="game" :enabled="store.available && !store.busy" @navigate="navigate" @track="selectTracking"/>
        <TrialPreparationPanel v-if="(!singleScreen||hubView==='cultivation')&&tab==='修行' && phase==='idle' && core.player.realm==='spirit'" :game="game" :enabled="store.available && !store.busy" :checkpoint="store.checkpointSummary" @navigate="navigate" @track="selectTracking" @review="reviewTrial" @restore="restore"/>
        <details v-if="tab==='修行' && (!singleScreen&&phase!=='opening'||singleScreen&&['skills','relics'].includes(hubView)) && game.status==='active'" class="equipment-disclosure" data-testid="equipment-section" :open="equipmentOpen" @toggle="equipmentOpen=($event.target as HTMLDetailsElement).open"><summary data-testid="equipment-toggle">功法与法宝 <span>{{game.school==='sword'?'当前剑修':game.school==='talisman'?'当前符修':'查看与选择修法'}} · {{equipmentOpen?'收起':'展开'}}</span></summary><EquipmentPanel v-if="equipmentOpen" :game="game" :enabled="store.available" :busy="store.busy" :highlight="highlight" :consumption="consumption" @act="act" @track="selectTracking" @navigate="navigate"/></details>
        <div v-if="!singleScreen||!['receipt','character'].includes(hubView)" class="feedback paper" aria-live="polite" data-testid="feedback"><span>手记</span><p>{{game.journal.at(-1)}}</p><ActionFeedback v-if="store.lastResult" :result="store.lastResult" :replayed="store.lastReplayed"/></div>
      </section>
      <aside v-show="!singleScreen||hubView==='goal'" class="right-column"><GoalPanel :game="game" :target="tracking.target.value" :enabled="store.available && !store.busy" :notice="tracking.notice.value" @select="selectTracking" @navigate="navigate" @preparation="preparation=$event"/><section v-if="!singleScreen" class="paper recent-action"><div class="section-label">最近行动</div><p>{{game.journal.at(-1)}}</p><p v-if="store.lastResult" class="small">{{formatDelta(store.lastResult.delta)}}</p></section><section v-if="!singleScreen" class="paper fate-summary"><div class="section-label">仙缘因果</div><div v-for="person in relationships.slice(0,2)" :key="person.id" :data-testid="`fate-summary-${person.id}`"><PortraitImage class="fate-portrait" :id="person.id" :fallback="person.seal"/><h3>{{person.name}} · {{person.label}}</h3><p class="small">{{person.summary}}</p></div><button class="text-button" @click="selectTab('仙缘')">展开仙缘 →</button></section>
      <section v-if="!singleScreen" class="note"><span>此地机缘</span><p>{{location.description}}</p><small>试玩版本 · 数值未平衡<br>约30分钟理解玩法，不限定通关时间</small></section></aside>
      <CharacterPanel v-if="!singleScreen||hubView==='character'" :game="game"/>
    </main>
    <PrimaryNav v-if="game&&(game.status==='active'||demoNode)" :demo="!!demoNode" :normal-href="demoNode?normalLink():undefined" :sealed="game.status!=='active'" :selected="tab" @select="selectTab" @height="navHeight=$event"/>
    <dialog ref="settings" class="paper settings" aria-labelledby="settings-title"><header><h2 id="settings-title" tabindex="-1" data-dialog-initial>行旅设置</h2><button @click="settings?.close()" aria-label="关闭设置"><GameIcon kind="action" id="close"/><span>关闭</span></button></header>
      <p>进度仅保存在当前浏览器。导出备份可用于迁移；清理浏览器数据可能丢失进度。</p><label class="setting-row"><span>文字大小</span><select name="text-size" v-model.number="fontScale" :disabled="experience.busy.value||!experience.ready.value"><option :value="1">100%</option><option :value="1.5">150%</option><option :value="2">200%</option></select></label>
      <label class="setting-row"><span>减少演出动效</span><input type="checkbox" v-model="reduceMotion" data-testid="reduce-effects" :disabled="experience.busy.value||!experience.ready.value"></label>
      <button type="button" data-testid="gameplay-help-entry" @click="showGameplayHelp">玩法帮助与重看</button>
      <p class="small" role="status" data-testid="settings-save-status">{{saveDisplayLabel}}</p><p v-if="store.error||exportError||importNotice" class="settings-error" role="alert" data-testid="settings-error">{{store.error||exportError||importNotice}}</p>
      <label class="file-button">导入存档<input data-testid="import" name="save-import" type="file" accept=".json,application/json" @change="importFile" :disabled="store.busy || !store.available"></label>
      <button v-if="game" @click="exportSave">导出当前进度</button><button data-testid="raw-backup" @click="exportRaw" :disabled="store.busy">导出原件备份</button>
      <button v-if="game" data-testid="settings-life" @click="showLife">查看修仙生平</button><button v-if="game?.status==='active'" data-testid="settings-retire" @click="requestEnd('RETIRE')" :disabled="store.busy || !can({type:'RETIRE'})">主动归隐</button>
      <button v-if="game" data-testid="restore-checkpoint" :aria-describedby="!store.hasCheckpoint?'checkpoint-unavailable':undefined" @click="restore" :disabled="store.busy || !store.available || !store.hasCheckpoint"><GameIcon kind="action" id="restore"/> 恢复完整准备检查点</button>
      <p v-if="game&&!store.hasCheckpoint" id="checkpoint-unavailable" class="small">当前没有已验证的完整准备检查点。</p>
      <button v-if="game" class="danger" data-testid="restart" @click="reset" :disabled="store.busy || !store.available">重新开始</button>
      <button data-testid="demo-menu-open" @click="showDemoMenu" :disabled="store.busy">演示节点</button>
      <LocalExperiencePanel :experience="experience" :run-id="core?.runId??null" :target="tracking.target.value"/>
    </dialog>
    <dialog ref="demoMenu" class="paper demo-menu" aria-labelledby="demo-menu-title"><header><h2 id="demo-menu-title" tabindex="-1" data-dialog-initial>演示节点</h2><button @click="demoMenu?.close()" aria-label="关闭演示节点">关闭</button></header><p>以下是由正式指令回放生成的演示存档。进入不会替换正常进度，演示不计入正常新档通关验证。</p><nav v-once class="demo-list" aria-label="演示节点选择"><a v-for="node in demoMenuNodes" :key="node.id" :href="node.href" :data-testid="'demo-node-'+node.id"><strong>{{node.label}}</strong><span>{{node.description}}</span></a></nav></dialog>
    <dialog ref="gameplayHelp" class="paper settings" aria-labelledby="gameplay-help-title"><header><h2 id="gameplay-help-title" tabindex="-1" data-dialog-initial>玩法帮助</h2><button type="button" aria-label="关闭玩法帮助" @click="gameplayHelp?.close()">关闭</button></header><p>提示随已保存的行动与当前状态出现，也可逐项重看。约30分钟只用于理解玩法，不限定到达境界或通关时间。</p><p class="small">跳过或关闭引导仅影响本页显示，刷新后可再次出现；不会改变成长、物品、掉落或存档。设置与当前提示均可回到这里。</p><button type="button" data-testid="guide-toggle" :aria-pressed="guidanceEnabled" @click="guidanceEnabled=!guidanceEnabled;skippedGuides=[]">本页引导：{{guidanceEnabled?'开启':'关闭'}}</button><div v-once><section v-for="entry in guideCatalog" :key="entry.id"><h3>{{entry.title}}</h3><p>{{entry.body}}</p></section></div></dialog>
    <dialog ref="lifeDialog" class="paper life-confirm" data-testid="life-confirmation" aria-labelledby="life-confirm-title" @cancel="cancelLife" @close="closeLifeReview">
      <template v-if="lifeIntent">
        <header><h2 id="life-confirm-title" tabindex="-1" data-dialog-initial>{{lifeIntent.command.type==='RETIRE'?'确认主动归隐':'确认度过最后一月'}}</h2></header>
        <p data-testid="life-review">{{lifeIntent.record.overview.name}} · {{lifeIntent.record.overview.ageLabel}} · {{lifeIntent.record.overview.realmName}} · 行道{{lifeIntent.record.overview.elapsedMonths}}游戏月</p>
        <p>{{lifeIntent.command.type==='RETIRE'?'确认后以主动归隐收卷，不消耗剩余游戏月，不写作寿尽。':'确认后将消耗最后1游戏月，达到当前境界寿限，以寿尽收卷。'}}</p>
        <p>当前存档与人物记录保留，可导出；恢复检查点会回退完整准备状态。此确认不会开启新的人生。</p>
        <p v-if="lifeStale" role="alert" data-testid="life-stale">进度已更新，请取消后重新查看与确认。此处不会结束另一份进度。</p>
        <p v-if="store.error" role="alert" data-testid="life-error">{{store.error}}</p>
        <button v-if="store.canRetryFor(lifeIntent.command.commandId)" data-testid="life-retry" @click="retryEnd" :disabled="store.busy || lifeStale">重试同一次收卷</button>
        <button data-testid="life-cancel" @click="lifeDialog?.close()" :disabled="store.busy">继续此生</button>
        <button data-testid="life-confirm-end" @click="confirmEnd" :disabled="store.busy || !store.available || lifeStale">{{store.busy?'正在保存…':lifeIntent.command.type==='RETIRE'?'确认归隐':'确认寿尽'}}</button>
      </template>
    </dialog>
    <dialog ref="ascensionDialog" class="paper life-confirm" data-testid="ascension-confirmation" aria-labelledby="ascension-title" @cancel="cancelLife" @close="closeAscension">
      <template v-if="ascensionIntent">
        <h2 id="ascension-title" tabindex="-1" data-dialog-initial>确认{{ascensionIntent.choice.label}}</h2>
        <p data-testid="ascension-review-identity">{{ascensionIntent.view.record.overview.name}} · {{ascensionIntent.view.record.overview.ageLabel}} · 行道{{ascensionIntent.view.record.overview.elapsedMonths}}游戏月</p>
        <p data-testid="ascension-review-description">{{ascensionIntent.choice.description}}</p>
        <p>确认保存后，以所选结尾封卷。不再继续本卷的修炼或战斗；当前物品、配装与人物记录保留，不新增道具奖励或上界玩法。</p>
        <details><summary>此生实际来路</summary><p>{{ascensionIntent.view.record.opening.text}}</p><p>{{ascensionIntent.view.record.training.school}} · {{ascensionIntent.view.record.training.loadout.map(slot=>slot.name).join(' / ')}} · {{ascensionIntent.view.record.training.equippedRelic}}</p><p v-for="decision in ascensionIntent.view.record.decisions" :key="decision.id">{{decision.npc}} · {{decision.text}}</p><p v-if="!ascensionIntent.view.record.decisions.length">没有其他已选事件记录，不补写故人或盟约。</p><p>{{ascensionIntent.view.record.pledges.text}}</p></details>
        <p v-if="ascensionStale" data-testid="ascension-stale" role="alert">进度已更新，请取消后重新核对；此处不会替另一份进度选择结尾。</p>
        <p v-if="store.error" data-testid="ascension-error" role="alert">{{store.error}}</p>
        <button v-if="store.canRetryFor(ascensionIntent.command.commandId)" data-testid="ascension-retry" @click="retryAscension" :disabled="store.busy || ascensionStale">重试同一次封卷</button>
        <button data-testid="ascension-cancel" @click="ascensionDialog?.close()" :disabled="store.busy">继续核对</button>
        <button class="primary" data-testid="ascension-confirm" @click="confirmAscension" :disabled="store.busy || !store.available || ascensionStale">{{store.busy?'正在保存…':'确认飞升并封卷'}}</button>
      </template>
    </dialog>
    <dialog ref="trialRestoreDialog" class="paper life-confirm" data-testid="trial-restore-confirmation" aria-labelledby="trial-restore-title" @cancel="cancelLife" @close="closeTrialRestore">
      <template v-if="trialRestoreIntent">
        <h2 id="trial-restore-title" tabindex="-1" data-dialog-initial>恢复完整入场准备</h2>
        <p data-testid="trial-restore-target">{{trialRestoreIntent.checkpoint.target.name}} · {{C.realms[trialRestoreIntent.checkpoint.target.realm].name}} · 行道{{trialRestoreIntent.checkpoint.target.months}}游戏月</p>
        <p>将放弃本轮及入场后的进展，物品、气血灵力、配装、人物选择、里程碑和年月一同回到该准备快照。不会单独补发渡劫引；恢复成功后，仍可再次使用这个检查点。</p>
        <p>准备气血 {{trialRestoreIntent.checkpoint.target.hp}} · 灵力 {{trialRestoreIntent.checkpoint.target.mp}} · 渡劫引 {{trialRestoreIntent.checkpoint.target.inventory.ascension_seal}}</p>
        <p v-if="trialRestoreStale" role="alert" data-testid="trial-restore-stale">进度已更新，请关闭后重新核对；此处不会回退另一份进度。</p>
        <p v-if="store.error" role="alert" data-testid="trial-restore-error">{{store.error}}</p>
        <button v-if="store.canRetryFor(trialRestoreIntent.command.commandId)" data-testid="trial-restore-retry" @click="retryTrialRestore" :disabled="store.busy || trialRestoreStale">重试同一次完整恢复</button>
        <button data-testid="trial-restore-cancel" @click="trialRestoreDialog?.close()" :disabled="store.busy">保留当前进度</button>
        <button data-testid="trial-restore-confirm" class="primary" @click="confirmTrialRestore" :disabled="store.busy || !store.available || trialRestoreStale">{{store.busy?'正在保存…':'确认恢复完整准备'}}</button>
      </template>
    </dialog>
    <dialog ref="trialDialog" class="paper life-confirm" data-testid="trial-entry-confirmation" aria-labelledby="trial-entry-title" @cancel="cancelLife" @close="closeTrialReview">
      <template v-if="trialIntent">
        <header><h2 id="trial-entry-title" tabindex="-1" data-dialog-initial>核对正式入场</h2></header>
        <p data-testid="trial-review-identity">{{trialIntent.view.snapshotSummary.name}} · {{trialIntent.view.snapshotSummary.realm}} · {{formatAgeMonths(trialIntent.view.snapshotSummary.ageMonths)}} · 行道{{trialIntent.view.snapshotSummary.elapsedMonths}}游戏月</p>
        <p data-testid="trial-review-cost">确认后消耗：{{formatCosts(trialIntent.view.costs)}}。扣物、完整准备检查点与问心同次保存成功后才进入。</p>
        <p>气血 {{trialIntent.view.preparation.hp}} / {{trialIntent.view.preparation.maxHp}} · 灵力 {{trialIntent.view.preparation.mp}} / {{trialIntent.view.preparation.maxMp}} · 灵石 {{trialIntent.view.snapshotSummary.stones}}</p>
        <p>配装：{{trialIntent.view.preparation.loadout.map(slot=>slot.name).join(' / ')}} · {{trialIntent.view.preparation.relic}}</p>
        <details><summary>即将保存的完整准备范围</summary><p>包括全部已掌握与剑简资格、背包、装备/法宝、人物选择、里程碑与当前进度；不只保存境界。</p><p>{{trialIntent.view.snapshotSummary.inventory.map(item=>item.name+' ×'+item.quantity).join(' · ')}}</p><p>已掌握 {{trialIntent.view.snapshotSummary.learned.length}}项，已有法宝 {{trialIntent.view.snapshotSummary.relics.length}}件，已选事件 {{trialIntent.view.snapshotSummary.choiceCount}}项。</p></details>
        <p>开始后先回答问心，准备与消耗跨三关保留。此处只确认入场，不代表已经渡劫成功。</p>
        <p v-if="trialStale" role="alert" data-testid="trial-review-stale">进度已更新，请返回准备页重新核对；此处不会启动另一份进度。</p>
        <p v-if="store.error" role="alert" data-testid="trial-entry-error">{{store.error}}</p>
        <button v-if="store.canRetryFor(trialIntent.command.commandId)" data-testid="trial-entry-retry" @click="retryTrial" :disabled="store.busy || trialStale">重试同一次入场</button>
        <button data-testid="trial-entry-cancel" @click="trialDialog?.close()" :disabled="store.busy">返回准备</button>
        <button class="primary" data-testid="trial-confirm-entry" @click="confirmTrial" :disabled="store.busy || !store.available || trialStale">{{store.busy?'正在保存…':'确认保存准备并入场'}}</button>
      </template>
    </dialog>
  </div>
</template>
