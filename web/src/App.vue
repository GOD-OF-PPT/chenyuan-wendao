<script setup lang="ts">
import { computed, nextTick, onMounted, onScopeDispose, ref, shallowRef, watch } from 'vue';
import { useGame } from './store';
import {useFocus} from './focus';
import * as C from '../../src/full/content.ts';
import { availableEvents } from '../../src/full/engine.ts';
import { gamePhase } from '../../src/full/contracts.ts';
import { getBreakthroughGoal, previewAction, getStoryContext, getRelationships, getLifeOverview, getLifeRecord, exportLifeText, getTrialPreparation, getTrialJourney, getAscensionChoices } from '../../src/full/queries.ts';
import type { ActionPreview } from '../../src/full/queries.ts';
import type { Action, Move, Command } from '../../src/full/types.ts';
import { stories } from '../../src/full/events.ts';
import { MAX_SAVE_BYTES } from '../../src/full/versions.ts';
import { planCollection, createConsumptionPreview, type CollectionTarget } from '../../src/full/goals.ts';
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
import {NPC_PORTRAITS,SCENE_ASSETS,sceneAssetPath} from './assets';
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
const importNotice=ref('');let importReadRevision=0;
const experience=useLocalExperience();let appActive=true;const stopObserving=store.observe(experience.record,experience.fault);onScopeDispose(()=>{appActive=false;stopObserving();});
const collectionTarget = ref<CollectionTarget | null>(null), highlight = ref('');
let navigationRevision = 0;
function selectTab(next: string) { navigationRevision++; tab.value = next; return navigationRevision; }
const preparation = shallowRef<Action | null>(null);
const fontScale = computed({get:()=>experience.preferences.value.fontScale,set:(value:1|1.5|2)=>{void experience.setPreferences({fontScale:value});}}), reduceMotion = computed({get:()=>experience.preferences.value.reduceMotion,set:(value:boolean)=>{void experience.setPreferences({reduceMotion:value});}}), settings = ref<HTMLDialogElement>(), exportError = ref('');
const settingsButton=ref<HTMLButtonElement>(),contentPanel=ref<HTMLElement>(),navHeight=ref(0);
const focus=useFocus(()=>contentPanel.value??settingsButton.value??null);
let pendingContentFocus:{owner:number;opener:Element|null}|null=null;
function focusContent(){const target=contentPanel.value??document.getElementById('welcome-content');if(target){pendingContentFocus=null;focus.target(target);}else pendingContentFocus={owner:navigationRevision,opener:document.activeElement};}
function cancelPendingContentFocus(){pendingContentFocus=null;}
onMounted(()=>{document.addEventListener('pointerdown',cancelPendingContentFocus,true);document.addEventListener('keydown',cancelPendingContentFocus,true);});
onScopeDispose(()=>{document.removeEventListener('pointerdown',cancelPendingContentFocus,true);document.removeEventListener('keydown',cancelPendingContentFocus,true);pendingContentFocus=null;});
watch([()=>store.ready,()=>contentPanel.value],async()=>{if(!pendingContentFocus)return;await nextTick();const request=pendingContentFocus,target=contentPanel.value??document.getElementById('welcome-content');if(!request||!target)return;pendingContentFocus=null;if(appActive&&request.owner===navigationRevision&&document.activeElement===request.opener)focus.target(target);},{flush:'post'});
function showSettings(){focus.open(settings.value,settingsButton.value??null);}
async function showDemoMenu(event?:Event){const opener=settings.value?.open?settingsButton.value??null:event?.currentTarget instanceof HTMLElement?event.currentTarget:focus.capture();settings.value?.close();await nextTick();focus.open(demoMenu.value,opener);}
async function initialiseGame(){if(store.busy)return;await store.init();if(appActive&&session.kind==='demo'&&store.available&&!store.game&&!store.busy)await store.importText(JSON.stringify(session.node!.game));}
function focusRegion(id:string){focus.target(document.getElementById(id));}
const game = computed(() => store.game), core = computed(() => game.value?.core);
const tracking = useTracking(game);
watch([() => tracking.target.value, () => game.value?.core.runId], () => { collectionTarget.value = null; highlight.value = ''; });
watch(() => game.value?.core.player.realm, () => { if (tracking.target.value.kind === 'breakthrough') { collectionTarget.value = null; highlight.value = ''; } });
const realm = computed(() => C.realms[core.value?.player.realm ?? 'mortal']);
const location = computed(() => C.locations[core.value?.world.location ?? 'wilderness']);
const phase = computed(() => game.value ? gamePhase(game.value) : null);
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
function act(action: Action) { if (action.type === 'START_TRIAL') return showTrialPreparation(); if (action.type === 'END') return reviewAscension(action.ending); const owner=navigationRevision; return focus.afterAction(()=>store.act(action),()=>owner===navigationRevision); }
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
  if (request.quantity) quantity.value = request.quantity;
  if (request.collection) collectionTarget.value = request.collection;
  await nextTick();
  if (navigationRevision !== focusRevision) return;
  const element = request.focusId ? document.querySelector<HTMLElement>(`[data-testid="${request.focusId}"]`) : null;
  element?.scrollIntoView({ block: 'center' }); element?.focus({ preventScroll: true });
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
async function showLife() {
  settings.value?.close(); selectTab('仙缘'); lifeOpen.value = true;
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
  selectTab('修行'); await nextTick();
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
  <div class="app-shell" :class="{'is-saving':store.busy,'text-enlarged':fontScale>1,'has-game':!!game,'cultivation-home':cultivationHome}" :data-font-scale="fontScale" :data-session="session.kind" :style="{'--font-scale':fontScale,'--nav-height':navHeight+'px'}">
    <AssetImage v-if="game" class="world-ambience" :path="worldArt" asset-id="world-ambience" eager aria-hidden="true"/>
    <nav class="skip-links" aria-label="快捷定位"><a :href="game?'#game-content':'#welcome-content'" @click.prevent="focusContent">跳到当前内容</a><a v-if="game?.status==='active'" href="#primary-navigation" @click.prevent="focusRegion('primary-navigation')">跳到主导航</a><a v-if="game" href="#goal-panel" @click.prevent="focusRegion('goal-panel')">跳到当前目标</a></nav>
    <header class="topbar">
      <div class="brand"><strong v-if="demoNode" class="demo-badge" data-testid="demo-badge">演示存档</strong><span class="seal">尘<br>缘</span><div><h1>尘缘问道</h1><p>一念尘缘起 · 千山共问道</p></div></div>
      <div v-if="core" class="where"><span class="diamond">◇</span> 云岚州 · {{location.name}} <small>修行第 {{core.world.elapsedMonths}} 月</small></div>
      <div class="top-actions"><span class="save-state" role="status" data-testid="save-status"><GameIcon kind="action" id="save"/>{{store.saveLabel}}</span><button v-if="game" class="top-export" @click="exportSave" :disabled="store.busy"><GameIcon kind="action" id="export"/> 导出存档</button><button ref="settingsButton" @click="showSettings">设置</button></div>
    </header>
    <section v-if="demoNode" class="paper demo-banner" aria-label="演示存档说明"><strong>演示存档 · 从{{demoNode.label}}起步</strong><p>本版本每个节点的进度独立保存，使用相同修行规则；正常进度与显示设置不受影响。</p><div class="demo-actions"><a :href="normalLink()" data-testid="demo-return">返回正常游戏</a><button @click="showDemoMenu" :disabled="store.busy">切换演示节点</button><button data-testid="demo-reset" @click="reset" :disabled="store.busy||!store.available">重新载入本节点</button></div></section>
    <div v-if="!store.ready" class="loading">正在展开仙途……</div>
    <div v-if="store.error" class="error-banner" role="alert" data-testid="error">
      <p>{{store.error}}</p><button v-if="store.canRetry" data-testid="retry" @click="store.retry()" :disabled="store.busy">重试本次操作</button>
      <button v-if="!store.available" data-testid="reload-storage" @click="initialiseGame()" :disabled="store.busy">重新读取</button>
      <button @click="exportRaw" :disabled="store.busy">导出原件备份</button>
    </div>
    <div v-if="store.warning" class="error-banner" role="status">{{store.warning}}</div>
    <div v-if="exportError" class="error-banner" role="alert">{{exportError}}</div>
    <div v-if="importNotice" class="error-banner" role="alert" data-testid="import-notice">{{importNotice}}</div>
    <section v-if="game && overview?.status==='active' && overview.remainingMonths!==null && overview.remainingMonths<=12" class="paper lifespan-warning" role="status" data-testid="lifespan-warning"><strong>余寿 {{overview.remainingMonths}} 游戏月 · {{overview.ageLabel}}</strong><p>{{overview.remainingMonths===1?'耗时行动将停止。若修为与突破物已备齐，仍可核对突破条件；也可恢复准备检查点，或确认度过最后1游戏月后收卷。':'游戏时间由行动消耗，阅读与离线不会扣减余寿。请核对当前准备与检查点。'}}</p><button data-testid="lifespan-open-life" @click="showLife">查看生平与收卷选择</button></section>
    <main v-if="store.ready && !game && !demoNode" id="welcome-content" tabindex="-1" class="welcome">
      <div class="welcome-art"><AssetImage class="welcome-backdrop" :path="SCENE_ASSETS.wilderness" asset-id="welcome-wilderness" eager/><span class="eyebrow">尘缘问道 · 试玩版</span><h2>凡心未改，<br>仙途已在眼前。</h2><p>不计片刻，不赶境界。<br>采一味灵草，结一段因果，修属于自己的长生路。</p></div>
      <form class="paper welcome-form" @submit.prevent="store.start(name)">
        <span class="eyebrow">第一章 / 凡心入道</span><h2>从此刻，问道。</h2><label for="name">你的道号</label>
        <input id="name" name="dao-name" spellcheck="false" v-model="name" maxlength="16" required autocomplete="off">
        <p>通过修炼、材料与选择筹备下一步。数值仍在调整，阅读和离线不会消耗寿元。</p>
        <p class="small">必要试玩记录只保存在本机，不上传、不记录道号；可在设置关闭、清空或知情导出。</p>
        <button class="primary" type="submit" :disabled="store.busy || !store.available">踏入仙途 <span>→</span></button>
        <button type="button" data-testid="demo-menu-welcome" @click="showDemoMenu" :disabled="store.busy">演示节点</button>
        <button type="button" data-testid="welcome-help" @click="showGameplayHelp">玩法帮助</button>
        <label class="file-button">导入已有存档<input type="file" name="save-import" accept=".json,application/json" @change="importFile" :disabled="store.busy || !store.available"></label>
      </form>
    </main>
    <main v-if="store.ready&&!game&&demoNode" class="paper demo-banner"><h2>演示进度尚未就绪</h2><p>请核对上方错误后重试同次操作或重新读取；不会改动正常进度。</p><button @click="initialiseGame" :disabled="store.busy">重新读取演示进度</button></main>
    <main v-if="game && core" class="game-grid" :aria-busy="store.busy">
      <section class="center-column" :class="{'in-battle':game.battle&&!inspectingInventory}">
        <ScenePanel :meditation="cultivationHome" :battle-stage="!!game.battle&&!inspectingInventory" :game="game" :eyebrow="phase==='opening'?'初遇 / 山雨破庙':location.subtitle" :title="phase==='opening'?'雨中故人':game.status==='ascended'?overview!.title:game.battle?location.name:activeStory?.name??location.name" :description="game.status==='ascended'?'此卷已收，来路犹存。':game.battle?'先辨来势，再决进退。':'山海不言，修行自有回响。'"/>
        <ActionEffects :result="store.lastResult" :replayed="store.lastReplayed" :run-id="core.runId" :revision="core.revision" :school="game.school" :reduce-motion="reduceMotion" @focus-fallback="focusContent" :busy="store.busy" :eligible="store.saved && store.available && !store.error"/>
        <TrialProgressPanel v-if="journey || store.trialRecovery" :journey="journey" :recovery="store.trialRecovery" :checkpoint="store.checkpointSummary" :enabled="store.available && !store.busy" @restore="requestTrialRestore" @export="exportSave" @prepare="showTrialPreparation"/>
        <section ref="contentPanel" id="game-content" tabindex="-1" aria-label="当前内容" class="paper content-panel" :class="{'battle-content':game.battle&&!inspectingInventory}">
          <details v-if="game.battle&&!inspectingInventory&&guidanceEnabled&&!skippedGuides.includes(guidance.id)" class="battle-guidance"><summary>查看本场行道提示</summary><GuidancePanel :guide="guidance" @skip="skipGuidance" @help="showGameplayHelp"/></details>
          <GuidancePanel v-else-if="!cultivationHome&&guidanceEnabled&&!skippedGuides.includes(guidance.id)" :guide="guidance" @skip="skipGuidance" @help="showGameplayHelp"/>
          <section v-if="inspectingInventory" class="pending-inspection" data-testid="pending-inspection"><h3>当前遭遇待继续</h3><p>查看不会消耗游戏月，也不会改变当前事件、敌方意图或回合。物品使用、旅行与换装仍受当前遭遇限制。</p><button type="button" data-testid="resume-encounter" @click="resumeEncounter">返回当前遭遇</button></section>
          <template v-if="phase === 'opening' && !inspectingInventory">
            <div class="section-label">当前遭遇 <span>壹 · 破庙</span></div><div class="encounter-speaker"><PortraitImage class="speaker-portrait" id="shen" fallback="沈"/><span>沈清禾 · 药修</span></div><h2>一丹，一念。</h2>
            <p class="story">山雨将歇，青衣药修沈清禾向你求药，而你的行囊中只剩一枚回春丹。庙柱上的引气之法人人可习，要不要介入这段因果，由你决定。</p>
            <p class="small">惊鸿剑简用于剑修终结术法，伤害 +{{C.swordManual.damageBonus}}；三种开场均可在筑基后到青云宗付费研读同简。</p>
            <div class="choices">
              <button v-for="choice in [{id:'help',name:'赠丹相助'},{id:'trade',name:'以丹换简'},{id:'leave',name:'保留丹药'}] as const" :key="choice.id" :data-testid="choice.id" @click="act({type:'CHOOSE',choice:choice.id})" :disabled="!can({type:'CHOOSE',choice:choice.id})">
                <strong>{{choice.name}}</strong><small>{{cost({type:'CHOOSE',choice:choice.id})}}</small><small>{{why({type:'CHOOSE',choice:choice.id})}}</small>
              </button>
            </div>
          </template>
          <template v-else-if="phase === 'trial-question' && journey && !inspectingInventory">
            <div class="section-label">渡劫 · 问心</div><h2>你愿如何面对来路？</h2><p class="story" data-testid="trial-question-memory">{{journey.openingMemory}}</p><p class="story">接纳旧我，稳住心神；或放下旧念，以进攻开路。两条道路皆可向前，不另判善恶成败。</p>
            <details class="trial-memories"><summary>回望已记录的选择</summary><p v-for="memory in journey.memories" :key="memory.id" class="small">{{memory.person}} · {{memory.title}}：{{memory.text}}</p></details>
            <div class="choices two"><button v-for="answer in journey.answers" :key="answer.id" :data-testid="`answer-${answer.id}`" @click="act({type:'ANSWER_TRIAL',answer:answer.id})" :disabled="!can({type:'ANSWER_TRIAL',answer:answer.id})"><strong>{{answer.label}} · {{answer.id==='accept'?'承受更稳':'进攻更强'}}</strong><small>{{answer.record}}</small><small>{{answer.preview.failure?.message}}</small></button></div>
          </template>
          <template v-else-if="activeStory && !inspectingInventory">
            <div class="section-label">当前遭遇 · {{activeStory.npc}}</div><div class="encounter-speaker"><PortraitImage class="speaker-portrait" :id="NPC_PORTRAITS[activeStory.npc]??''" :fallback="activeStory.npc.slice(0,1)"/><span>{{activeStory.npc}}</span></div><h2 data-testid="event-title">{{activeStory.name}}</h2><p class="story" data-testid="event-body">{{activeStory.body}}</p>
            <div class="choices"><button v-for="option in activeStory.options" :key="option.id" :data-testid="`decide-${option.id}`" @click="act({type:'DECIDE',option:option.id})" :disabled="!can({type:'DECIDE',option:option.id})"><strong>{{option.label}}</strong><small>{{option.detail}}</small><small>{{cost({type:'DECIDE',option:option.id})}}</small><small>{{why({type:'DECIDE',option:option.id})}}</small><small>{{consumption({type:'DECIDE',option:option.id})}}</small></button></div>
          </template>
          <template v-else-if="game.battle && !inspectingInventory">
            <BattlePanel :game="game" :can="can" :cost="cost" :why="why" @move="battle"/>
          </template>
          <template v-else-if="phase === 'trial-ending' && ascension && !inspectingInventory">
            <div class="section-label">天门已开 <span>三关已过，等待你的收束</span></div><h2>此生，留下些什么？</h2><p class="story">{{ascension.record.opening.text}} {{ascension.record.training.school}}的来路已经留在记录中。两种选择都以飞升成功收卷，没有善恶高低。</p>
            <p class="small">{{ascension.record.battle.trial}} 选择前可查看生平；取消不改变进度，确认保存后才封卷。</p>
            <div class="choices two"><button v-for="choice in ascension.choices" :key="choice.ending" :data-testid="`ending-${choice.ending}`" @click="act({type:'END',ending:choice.ending})" :disabled="!can({type:'END',ending:choice.ending})"><strong>{{choice.label}}</strong><small>{{choice.description}}</small><small>{{choice.preview.failure?.message}}</small></button></div>
          </template>
          <template v-else-if="game.status !== 'active'">
            <LifePanel :game="game" :enabled="store.available" :busy="store.busy" :has-checkpoint="store.hasCheckpoint" @export="exportLife" @restore="restore" @restart="reset"/>
          </template>
          <template v-else-if="tab === '修行'">
            <template v-if="core.world.location === 'cave'">
              <div class="cultivation-topline"><span class="section-label">听雨修行 · 道行由此积累</span><button type="button" class="text-button" data-testid="cultivation-jump" @click="focusCultivation">前往修行动作 ↓</button></div>
              <div class="cultivation-actions" id="cultivation-actions" tabindex="-1" data-testid="cultivation-actions">
                <section class="natural-action"><GameIcon class="cultivation-emblem" kind="nav" id="cultivate"/><h2>自然吐纳</h2>
                  <div class="cultivation-facts" data-testid="cultivation-facts"><span v-if="naturalPreview?.delta">预计修为 {{naturalPreview.delta.xp>0?'+':''}}{{naturalPreview.delta.xp}}</span><span v-if="naturalPreview?.allowed">实际可行 {{naturalPreview.executedSteps}} 次</span><span>{{naturalPreview?.actualCosts?formatCosts(naturalPreview.actualCosts):cost(natural)}}</span></div>
                  <button class="primary cultivate-primary" data-testid="cultivate" @click="act(natural)" :disabled="!can(natural)">自然吐纳</button><p v-if="why(natural)" class="small action-reason">{{why(natural)}}</p>
                  <label class="cultivation-batch">连续行动 <select v-model.number="batch" aria-label="行动次数"><option :value="1">1 次</option><option :value="5">5 次</option><option :value="20">20 次</option><option :value="50">50 次</option><option value="target">达到目标</option></select></label>
                </section>
                <div class="cultivation-alternatives"><button data-testid="cultivate-assisted" @click="act(assisted)" :disabled="!can(assisted)"><GameIcon kind="item" id="core"/><span><strong>灵石辅助</strong><small>{{cost(assisted)}}</small><small>{{why(assisted)}}</small></span></button><button data-testid="rest" @click="act({type:'REST'})" :disabled="!can({type:'REST'})"><GameIcon kind="item" id="healing_pill"/><span><strong>洞府疗养</strong><small>{{cost({type:'REST'})}}</small><small>{{why({type:'REST'})}}</small></span></button></div>
              </div>
            </template>
            <template v-else><div class="section-label">修行</div><h2>静守灵台，凝气归元。</h2><p class="story">{{location.description}}</p><button class="primary" data-testid="return-cave" @click="travel('cave')" :disabled="!can({type:'TRAVEL',location:'cave'})">返回洞府修行 →</button></template>
            <div class="breakthrough"><div><strong>{{goal?.title}}</strong><small>{{why(breakthrough) || '准备已经齐全'}}</small></div><button class="primary" data-testid="breakthrough" @click="act(breakthrough)" :disabled="core.player.realm==='spirit' ? !store.available || store.busy : !can(breakthrough)">{{core.player.realm === 'mortal' ? '引气入体' : core.player.realm === 'spirit' ? '查看渡劫准备' : '确认突破'}}</button></div>
            <details v-if="core.world.location==='cave'" class="cultivation-details"><summary>本批预算、预计结果与洞府见闻</summary><p class="story">{{location.description}}</p><p class="small">每批最多 {{C.maxBatch}} 次；成本与停止原因按真实行动结算。</p><div class="batch-previews"><BatchPreview label="自然吐纳" :preview="quote(natural)"/><BatchPreview label="灵石辅助" :preview="quote(assisted)"/></div></details>
          </template>
          <template v-else-if="tab === '历练'">
            <div class="section-label">历练</div><p class="story">{{location.description}}</p>
            <div class="locations"><button v-for="(place,id) in C.locations" :key="id" :data-testid="`travel-${id}`" :class="{selected:core.world.location===id}" @click="travel(id)" :disabled="!can({type:'TRAVEL',location:id})">{{place.name}}<small>{{why({type:'TRAVEL',location:id})}}</small></button></div>
            <div class="action-options"><label>连续采集/委托 <select v-model="batch" aria-label="取材次数"><option :value="1">1 次</option><option :value="5">5 次</option><option :value="20">20 次</option><option :value="50">50 次</option><option value="target">达到目标</option></select></label><small v-if="batch==='target'" data-testid="collection-target">{{collectionLabel}}</small></div>
            <div class="source-grid"><div v-for="[id,source] in localSources" :key="id"><button :data-testid="`source-${id}`" :class="{highlight:highlight===`source-${id}`}" @click="sourceActions[id] && act(sourceActions[id]!)" :disabled="!sourceActions[id] || !can(sourceActions[id]!)"><strong>{{source.name}}</strong><small>{{sourceActions[id] ? cost(sourceActions[id]!) : '本批不会执行'}}</small><small v-if="source.stones">灵石 +{{source.stones}}</small><small v-for="(n,item) in source.items" :key="item">{{C.items[item].name}} +{{n}}</small><small>{{sourceReason(id)}}</small></button><BatchPreview :label="source.name" :preview="sourceActions[id] ? quote(sourceActions[id]!) : null" :reason="sourceReason(id)"/></div></div>
            <div v-if="activeEnemies.length" class="encounters"><h3>此地挑战</h3><div class="choices two"><button v-for="[id,enemy] in activeEnemies" :key="id" :data-testid="`encounter-${id}`" :class="{highlight:highlight===`encounter-${id}`}" @click="act({type:'ENCOUNTER',enemy:id})" :disabled="!can({type:'ENCOUNTER',enemy:id})"><strong>{{enemy.name}}</strong><small>气血 {{enemy.hp}} · 胜利后取得奖励</small><small>{{why({type:'ENCOUNTER',enemy:id})}}</small></button></div></div>
            <div v-if="core.world.location==='market'" class="market"><label>每次采购数量 <input type="number" min="1" :max="C.maxQuantity" v-model.number="quantity" aria-label="采购数量"></label><div class="market-row" v-for="[id,item] in knownItems" :key="id"><div><strong>{{item.name}}</strong><small>{{item.description}}</small></div><button :data-testid="`buy-${id}`" :class="{highlight:highlight===`buy-${id}`}" @click="act({type:'BUY',item:id,quantity})" :disabled="!can({type:'BUY',item:id,quantity})">购入 · {{cost({type:'BUY',item:id,quantity})}}<small>{{why({type:'BUY',item:id,quantity})}}</small></button></div></div>
          </template>
          <template v-else-if="tab === '行囊'">
            <div class="section-label">行囊 <span>一草一石，皆有其用</span></div><div class="inventory"><article v-for="[id,item] in knownItems" :key="id"><div class="item-glyph" aria-hidden="true"><GameIcon kind="item" :id="id"/></div><div><strong>{{item.name}} <b :data-testid="`item-${id}`">×{{core.inventory[id]}}</b></strong><small>{{item.description}}</small><small v-if="item.hp || item.mp">{{why({type:'USE',item:id})}}</small><small v-if="item.hp || item.mp">{{consumption({type:'USE',item:id})}}</small><template v-else-if="item.sell!==null"><small v-if="core.world.location==='market'">{{why({type:'SELL',item:id,quantity:1})}}</small><small>{{consumption({type:'SELL',item:id,quantity:1})}}</small></template><button class="text-button" :data-testid="`track-${id}`" @click="tracking.select({kind:'item',id,quantity:1})">追踪此物资 →</button></div><button v-if="item.hp || item.mp" @click="act({type:'USE',item:id})" :disabled="!can({type:'USE',item:id})">服用</button><button v-else-if="item.sell!==null && core.world.location==='market'" @click="act({type:'SELL',item:id,quantity:1})" :disabled="!can({type:'SELL',item:id,quantity:1})">售出 · {{item.sell}}</button></article></div>
            <h3 class="recipes-title">丹炉 · 固定配方</h3><p v-if="core.world.location!=='cave'" class="small">需在洞府炼丹。<button @click="travel('cave')" :disabled="!can({type:'TRAVEL',location:'cave'})">前往洞府</button></p>
            <div class="recipe" v-for="[id,recipe] in localRecipes" :key="id"><div><strong>{{recipe.name}}</strong><small>{{cost({type:'CRAFT',recipeId:id})}}</small><small>{{why({type:'CRAFT',recipeId:id})}}</small><small>{{consumption({type:'CRAFT',recipeId:id})}}</small></div><button :data-testid="`craft-${id}`" :class="{highlight:highlight===`craft-${id}`}" @click="act({type:'CRAFT',recipeId:id})" :disabled="!can({type:'CRAFT',recipeId:id})">炼制</button></div>
          </template>
          <template v-else>
            <div class="section-label">仙缘</div><button class="text-button" data-testid="show-life" @click="showLife">查看修仙生平 →</button><RelationshipPanel :game="game" :enabled="store.available && !store.busy" @navigate="navigate"/>
            <div class="choices"><button v-for="event in events" :key="event.id" :data-testid="`event-${event.id}`" :class="{highlight:highlight===`event-${event.id}`}" @click="act({type:'EVENT',event:event.id})" :disabled="!can({type:'EVENT',event:event.id})">{{event.name}} · {{event.npc}}</button></div>
            <h3>近期手记</h3><p class="small">仅保留最近100条；当前显示{{visibleJournal.length}}条，共{{recentJournal.length}}条。完整已选事实请查看修仙生平。</p><ol id="recent-journal" class="journal"><li v-for="(line,index) in visibleJournal" :key="index">{{line}}</li></ol><button v-if="recentJournal.length>10" type="button" class="text-button" data-testid="journal-toggle" :aria-expanded="journalExpanded" aria-controls="recent-journal" @click="journalExpanded=!journalExpanded">{{journalExpanded?'收起较早条目':`展开全部 ${recentJournal.length} 条近期手记`}}</button>
          </template>
          <GuidancePanel v-if="cultivationHome&&guidanceEnabled&&!skippedGuides.includes(guidance.id)" :guide="guidance" @skip="skipGuidance" @help="showGameplayHelp"/>
        </section>
        <div v-if="tab==='仙缘'&&phase!=='idle'&&game.status==='active'" class="paper inline-actions"><button type="button" class="text-button" data-testid="show-life" @click="showLife">查看修仙生平 →</button><button type="button" data-testid="resume-encounter" @click="resumeEncounter">返回当前遭遇</button></div>
        <RelationshipPanel v-if="tab==='仙缘' && phase!=='idle'" :game="game" :enabled="store.available && !store.busy" @navigate="navigate"/>
        <details v-if="tab==='仙缘' && game.status==='active'" ref="lifeSection" class="paper life-section" :open="lifeOpen" @toggle="lifeOpen=($event.target as HTMLDetailsElement).open" data-testid="life-section"><summary>修仙生平 · 查看、导出与收卷</summary><LifePanel v-if="lifeOpen" :game="game" :enabled="store.available" :busy="store.busy" :has-checkpoint="store.hasCheckpoint" @end="requestEnd" @export="exportLife" @restore="restore" @restart="reset"/></details>
        <GrowthPanel v-if="tab==='修行' && phase==='idle' && C.rank(core.player.realm)>=C.rank('foundation') && core.player.realm!=='spirit'" :game="game" :enabled="store.available && !store.busy" @navigate="navigate" @track="tracking.select"/>
        <TrialPreparationPanel v-if="tab==='修行' && phase==='idle' && core.player.realm==='spirit'" :game="game" :enabled="store.available && !store.busy" :checkpoint="store.checkpointSummary" @navigate="navigate" @track="tracking.select" @review="reviewTrial" @restore="restore"/>
        <EquipmentPanel v-if="tab==='修行' && phase!=='opening' && game.status==='active'" :game="game" :enabled="store.available" :busy="store.busy" :highlight="highlight" :consumption="consumption" @act="act" @track="tracking.select" @navigate="navigate"/>
        <div class="feedback paper" aria-live="polite" data-testid="feedback"><span>手记</span><p>{{game.journal.at(-1)}}</p><ActionFeedback v-if="store.lastResult" :result="store.lastResult" :replayed="store.lastReplayed"/></div>
      </section>
      <aside class="right-column"><GoalPanel :game="game" :target="tracking.target.value" :enabled="store.available && !store.busy" :notice="tracking.notice.value" @select="tracking.select" @navigate="navigate" @preparation="preparation=$event"/><section class="paper recent-action"><div class="section-label">最近行动</div><p>{{game.journal.at(-1)}}</p><p v-if="store.lastResult" class="small">{{formatDelta(store.lastResult.delta)}}</p></section><section class="paper fate-summary"><div class="section-label">仙缘因果</div><div v-for="person in relationships.slice(0,2)" :key="person.id" :data-testid="`fate-summary-${person.id}`"><PortraitImage class="fate-portrait" :id="person.id" :fallback="person.seal"/><h3>{{person.name}} · {{person.label}}</h3><p class="small">{{person.summary}}</p></div><button class="text-button" @click="selectTab('仙缘')">展开仙缘 →</button></section>
      <section class="note"><span>此地机缘</span><p>{{location.description}}</p><small>试玩版本 · 数值未平衡<br>约30分钟理解玩法，不限定通关时间</small></section></aside>
      <CharacterPanel :game="game"/>
    </main>
    <PrimaryNav v-if="game&&(game.status==='active'||demoNode)" :demo="!!demoNode" :normal-href="demoNode?normalLink():undefined" :sealed="game.status!=='active'" :selected="tab" @select="selectTab" @height="navHeight=$event"/>
    <dialog ref="settings" class="paper settings" aria-labelledby="settings-title"><header><h2 id="settings-title" tabindex="-1" data-dialog-initial>行旅设置</h2><button @click="settings?.close()" aria-label="关闭设置"><GameIcon kind="action" id="close"/><span>关闭</span></button></header>
      <p>进度仅保存在当前浏览器。导出备份可用于迁移；清理浏览器数据可能丢失进度。</p><label class="setting-row"><span>文字大小</span><select name="text-size" v-model.number="fontScale" :disabled="experience.busy.value||!experience.ready.value"><option :value="1">100%</option><option :value="1.5">150%</option><option :value="2">200%</option></select></label>
      <label class="setting-row"><span>减少演出动效</span><input type="checkbox" v-model="reduceMotion" data-testid="reduce-effects" :disabled="experience.busy.value||!experience.ready.value"></label>
      <button type="button" data-testid="gameplay-help-entry" @click="showGameplayHelp">玩法帮助与重看</button>
      <p class="small" role="status" data-testid="settings-save-status">{{store.saveLabel}}</p><p v-if="store.error||exportError||importNotice" class="settings-error" role="alert" data-testid="settings-error">{{store.error||exportError||importNotice}}</p>
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
