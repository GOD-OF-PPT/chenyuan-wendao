<script setup lang="ts">
import {useRuleContent} from './rule-content';
import ClosureDecisions from './ClosureDecisions.vue';
import MainStage from './MainStage.vue';
import type {ClosureNavigation} from './closure-navigation';
import {useSaveControls} from './use-save-controls';
import {useActionView} from './use-action-view';
import {useStageNavigation} from './use-stage-navigation';
import {useStageFocus} from './use-stage-focus';
import {useConfigurationReview} from './use-configuration-review';
import ActivityCatalogues from './ActivityCatalogues.vue';
import {useDirectActions} from './use-direct-actions';
import {useActivityPlans,activityPlansKey} from './use-activity-plans';
import GameSettings from './GameSettings.vue';
import DemoMenu from './DemoMenu.vue';
import GameplayHelp from './GameplayHelp.vue';
import LegacyContent from './LegacyContent.vue';




import { computed, nextTick, onMounted, onScopeDispose, provide, ref, shallowRef, watch } from 'vue';
import { useGame } from './store';
import {useFocus,visibleFocusTarget,gameFocusKey} from './focus';
import {primaryActivityControls} from './activity-controls';
import {navigationGate} from './navigation-gates';
import FeatureMenu from './FeatureMenu.vue';
import * as C from '../../src/full/content.ts';
import { gamePhase } from '../../src/full/contracts.ts';
import {getStoryContext,getRelationships,getLifeOverview,getTrialJourney} from '../../src/full/queries.ts';
import type { Action, Move } from '../../src/full/types.ts';
import { stories } from '../../src/full/events.ts';
import {getTrackedGoal,createConsumptionPreview} from '../../src/full/goals.ts';
import { useTracking } from './use-tracking';
import {formatDelta} from './presentation';
import type { NavigationRequest } from './navigation';

import GoalPanel from './GoalPanel.vue';
import CharacterPanel from './CharacterPanel.vue';
import GameHud from './GameHud.vue';
import SealedLifeHud from './SealedLifeHud.vue';

import SealedLifeNav from './SealedLifeNav.vue';
import ScenePanel from './ScenePanel.vue';

import PrimaryNav from './PrimaryNav.vue';
import AssetImage from './AssetImage.vue';
import PortraitImage from './PortraitImage.vue';
import GameIcon from './GameIcon.vue';


import ActionEffects from './ActionEffects.vue';
import ActionFeedbackStage from './ActionFeedbackStage.vue';
import ResultMoments from './ResultMoments.vue';
import FeedbackSkip from './FeedbackSkip.vue';
import StoryCatalogues from './StoryCatalogues.vue';
import CultivationStageHost from './CultivationStageHost.vue';


import MilestoneGate from './MilestoneGate.vue';




import ActionExecution from './ActionExecution.vue';
import StageOutcome from './StageOutcome.vue';
import {recoveryMessage} from './activity-view';





import type {ProgressionKind,ProgressionVariant} from '../../src/full/progression.ts';
import TrainingActivity from './TrainingActivity.vue';


import {singleBattlePlan} from '../../src/full/adventure.ts';


import ConfigurationDialog from './ConfigurationDialog.vue';






import LifespanGuide from './LifespanGuide.vue';

import {lifespanGuidance} from './lifespan-guidance';
import TrialCatalogue from './TrialCatalogue.vue';
import {narrativeFor} from './story-pages';

import {nextStep} from './play-flow';
import {trialGuidance} from './trial-goal';


import {SCENE_ASSETS,PANEL_MATERIAL_ASSETS,sceneAssetPath} from './assets';
import {scenePresentation} from './scene-presentation';
import ActionFeedback from './ActionFeedback.vue';
import EquipmentPanel from './EquipmentPanel.vue';
import GrowthPanel from './GrowthPanel.vue';
import RelationshipPanel from './RelationshipPanel.vue';
import LifePanel from './LifePanel.vue';
import TrialPreparationPanel from './TrialPreparationPanel.vue';
import TrialProgressPanel from './TrialProgressPanel.vue';
import type { AscensionEnding } from '../../src/full/ascension.ts';
import {useLocalExperience} from './use-local-experience';

import {useSession} from './session';
import MilestoneReview from './MilestoneReview.vue';
import {useMilestoneReview} from './milestone-view';
import {isMilestoneAction} from '../../src/full/milestones.ts';
import {demoSpec} from '../../src/demo.ts';
import {normalLink} from './demo-loader';
import {guidanceFor} from './guidance';
import GuidancePanel from './GuidancePanel.vue';

import GameConfirmDialog from './GameConfirmDialog.vue';
import {useGameConfirmation} from './use-game-confirmation';
import {journalAnchors,type JournalLedger,type JournalWrite} from './journal-anchors';

const session=useSession(),demoMenuView=ref<InstanceType<typeof DemoMenu>>();
const demoMenu=computed(()=>demoMenuView.value?.element);
const demoNode=session.kind==='demo'?demoSpec(session.node!.nodeId):null;
const ruleContent=useRuleContent(()=>store.game);
const store = useGame(), name = ref('顾长青'), batch = ref<number | 'target'>(1), quantity = ref(1);
provide('game-scene',store);
const {milestoneReview,milestoneStale,milestoneRetry,selectMilestone,inspectMilestone,closeMilestone,confirmMilestone:confirmMilestoneAction}=useMilestoneReview(store);
const uiLocked=computed(()=>store.busy||!store.available);
const pendingStoryError=computed(()=>store.unresolved);
const saveTone=computed(()=>!store.ready||store.busy?'pending':store.error||!store.available?'problem':store.game&&store.saved?'saved':'idle');
const saveDisplayLabel=computed(()=>store.saveLabel==='本次未保存'?'保存待确认':store.saveLabel);
const experience=useLocalExperience();let appActive=true;const stopObserving=store.observe(value=>{const observedNavigation=navigationOwner.value;if(['import','restore','restart','new_game'].includes(value.kind)){readingGeneration.value++;narrativeContext.value++;stageReturns.reset();journalWrites.value=[];}if(value.kind==='action'&&value.result&&value.operation&&store.game?.core.revision===value.result.revisionAfter){const run=store.game.core.runId,revision=value.result.revisionAfter,added=value.operation==='EVENT'?0:value.operation==='BATTLE'&&value.flags.includes('battle_won')?2:1;journalWrites.value=[...journalWrites.value.filter(w=>w.run!==run||w.revision!==revision),{run,revision,added}].slice(-100);}if(value.kind==='action'&&value.result&&store.game&&!value.replayed&&store.lastFromActivity&&store.activityOwned&&store.activity?.version===7&&store.activity.plan.action.type===value.operation&&store.activity.runId===store.game?.core.runId&&value.result.revisionAfter===store.game.core.revision&&((hubView.value==='current'&&value.operation==='CHOOSE'&&value.result.phaseBefore==='opening'&&value.result.phaseAfter==='idle')||(hubView.value==='cultivation'&&value.operation==='BREAKTHROUGH'&&value.result.delta.realm.before!==value.result.delta.realm.after)||(hubView.value==='trial-preparation'&&value.operation==='START_TRIAL'&&value.result.phaseBefore==='idle'&&value.result.phaseAfter==='trial-question')))selectTab('修行');focusObserved(value,observedNavigation);experience.record(value);},experience.fault);onScopeDispose(()=>{appActive=false;stopObserving();});
const producing=computed(()=>!!store.activity&&store.activity.status!=='stopped'&&(store.activity.plan.kind==='craft'||store.activity.plan.kind==='forge'));
const resumeVisible=ref(false);
const tradeoffKind=ref<ProgressionKind>('cultivation'),tradeoffSeed=ref<ProgressionVariant>('natural'),tradeoffEntry=ref(0);
const narrativeContext=ref(0),readingGeneration=ref(0);
const journalWrites=shallowRef<JournalWrite[]>([]);
const preparation = shallowRef<Action | null>(null);
const fontScale = computed({get:()=>experience.preferences.value.fontScale,set:(value:1|1.5|2)=>{void experience.setPreferences({fontScale:value});}}), reduceMotion = computed({get:()=>experience.preferences.value.reduceMotion,set:(value:boolean)=>{void experience.setPreferences({reduceMotion:value});}}), settingsView = ref<InstanceType<typeof GameSettings>>();
const settings=computed(()=>settingsView.value?.element);
const settingsButton=ref<HTMLButtonElement>(),legacyContent=ref<InstanceType<typeof LegacyContent>>(),navHeight=ref(0);
const mainStage=ref<InstanceType<typeof MainStage>>();
const contentPanel=computed(()=>mainStage.value?.element??legacyContent.value?.element);
const importButton=computed(()=>settingsView.value?.importButton);
const noticeRegion=ref<HTMLElement>(),noticeHeight=ref(0);
watch(noticeRegion,(node,_,cleanup)=>{if(!node)return;const observer=new ResizeObserver(()=>{const height=node.getBoundingClientRect().height;noticeHeight.value=height?height+8:0;});observer.observe(node);cleanup(()=>observer.disconnect());},{flush:'post'});
const desktopMedia=window.matchMedia('(min-width:480px)'),wideScreen=ref(desktopMedia.matches);
function desktopChanged(){wideScreen.value=desktopMedia.matches;}
onMounted(()=>desktopMedia.addEventListener('change',desktopChanged));onScopeDispose(()=>desktopMedia.removeEventListener('change',desktopChanged));
const singleScreen=computed(()=>wideScreen.value&&fontScale.value===1),hubMain=computed(()=>singleScreen.value&&hubView.value==='home');
const immersive=computed(()=>singleScreen.value&&!!game.value);
const activityRailVisible=computed(()=>store.ready&&immersive.value&&game.value?.status==='active'&&!!store.activity&&(hubView.value!=='activity'||activityPlanVisible.value)&&store.activity.stopReason?.code!=='STATE_CHANGED');
provide(primaryActivityControls,activityRailVisible);
const storyView=computed(()=>singleScreen.value&&(['fate','life','trial','battle'].includes(hubView.value)||hubView.value==='current'&&phase.value!=='opening'||hubView.value==='trial-preparation'));
const catalogueView=computed(()=>storyView.value||singleScreen.value&&(['journey','tradeoffs','explore','inventory','forge','skills','relics','goal','market','recovery','receipt','activity'].includes(hubView.value)||hubView.value==='cultivation'));
function currentContent(){return [...document.querySelectorAll<HTMLElement>('.catalogue-view .play-catalogue')].find(visibleFocusTarget)??(visibleFocusTarget(contentPanel.value??null)?contentPanel.value??null:null);}
const focus=useFocus(()=>currentContent()??settingsButton.value??null);
provide(gameFocusKey,focus);
const stageNavigation=useStageNavigation(store,focus,{singleScreen:()=>singleScreen.value,immersive:()=>immersive.value,narrativeContext:()=>narrativeContext.value,content:currentContent,lifeElement:()=>lifeSection.value,settings:()=>settings.value,settingsButton:()=>settingsButton.value,help:showGameplayHelp,browse:()=>browseDirect(),clearInspections:()=>clearInspections(),dismissResume:()=>resumeVisible.value=false});
const {owner:navigationOwner,tab,hubView,equipmentOpen,lifeOpen,equipmentReading,equipmentEntry,equipmentSection,detailViews,stageReturns,detailParent,readingReturn,clearFlowReturns,rememberHubOrigin,captureStageReturn,selectTab,selectPrimaryTab,openPrimaryFeature,navigationView,receiptAll,trialReadMode,openHub,closeHub,showLife,showTrialPreparation,hubTitle}=stageNavigation;
const stageFocus=useStageFocus(store,focus,{owner:()=>navigationOwner.value,advance:()=>stageNavigation.advance(),content:currentContent,element:()=>contentPanel.value,life:()=>showLife()});
const {armStageFocus,focusObserved,focusContent}=stageFocus;
const activityPlans=useActivityPlans(store,focus,{
 owner:()=>navigationOwner.value,advance:()=>stageNavigation.advance(),select:selectTab,open:openHub,current:()=>({singleScreen:singleScreen.value,view:hubView.value}),dismissResume:()=>resumeVisible.value=false,navigate,inspectMilestone,
});
provide(activityPlansKey,activityPlans);
const {collectionTarget,highlight,trainingInspectionPlan,sourceInspectionPlan,productionInspectionPlan,preparationInspectionPlan,preparationInspectionSaved,preparationInspectionExact,adventureInspectionPlan,adventureInspectionSaved,activityPlanVisible,hubTrainingMethod,clearInspections,inspectionOwner,arrangeTravel,travel,inspectAdventure,startAdventure,startTraining,startSource,viewActivityPlan,startProduction,inspectProduction,moveProduction,startPreparation,inspectPreparationPlan,inspectPreparation,movePreparation}=activityPlans;

const confirmation=useGameConfirmation({focus,appearance:()=>({fontScale:fontScale.value,reduceMotion:reduceMotion.value})});
function confirmationSource(){
 const key=()=>JSON.stringify([core.value?.runId??null,core.value?.revision??0,store.activity?.id??null,store.activity?.revision??null,store.activity?.ownerId??null,store.syncEpoch]);
 // navigationOwner.value also advances on ordinary input; modal return tracks the actual view.
 const viewKey=()=>JSON.stringify([hubView.value,tab.value,detailParent.value?.view??null,detailParent.value?.tab??null]);
 const original=key(),view=viewKey(),run=core.value?.runId??null;
 return{current:()=>appActive&&key()===original&&viewKey()===view,mayReturn:()=>appActive&&(core.value?.runId??null)===run&&viewKey()===view};
}
function confirmationBlocked(){return store.busy?'当前行动正在保存，请先等保存落定。':!store.available?'存档当前不可写，请先重新读取。':store.unresolved?'上次行动尚未落定，请先重试或核对原结果。':'';}
const {importNotice,exportError,importFile,exportSave,exportRaw,reset,restore,exportLife}=useSaveControls(store,session,confirmation,name,{
 source:confirmationSource,blocked:confirmationBlocked,settings:()=>settings.value,importOpener:()=>importButton.value,
 completed:()=>{selectTab('修行');settings.value?.close();},
});
async function confirmMilestone(retrying=false){const review=milestoneReview.value,owner=navigationOwner.value,sync=store.syncEpoch;await confirmMilestoneAction(retrying);if(!retrying&&review?.prepared&&review.plan.action.type==='CHOOSE'&&!milestoneReview.value)armStageFocus(review.prepared,owner,sync,'stage');}
function showSettings(event?:Event){const records=settings.value?.querySelector<HTMLDetailsElement>('[data-testid=local-records-panel]');if(records)records.open=false;focus.open(settings.value,event?.currentTarget instanceof HTMLElement?event.currentTarget:settingsButton.value??focus.capture());}
async function showDemoMenu(event?:Event){const opener=settings.value?.open?settingsButton.value??null:event?.currentTarget instanceof HTMLElement?event.currentTarget:focus.capture();settings.value?.close();await nextTick();focus.open(demoMenu.value,opener);}
async function initialiseGame(){if(store.busy)return;await store.init();if(appActive)resumeVisible.value=session.kind==='normal'&&!!store.game&&store.available;if(appActive&&session.kind==='demo'&&store.available&&!store.game&&!store.busy)await store.importText(JSON.stringify(session.node!.game));}
function focusRegion(id:string){if(id==='goal-panel'&&singleScreen.value&&hubView.value!=='goal'){void openHub('goal');return;}focus.target(document.getElementById(id));}
function focusPrimary(){stageNavigation.advance();focus.target(currentContent()?.querySelector<HTMLElement>('[data-primary-region]')??currentContent());}
const game = computed(() => store.game), core = computed(() => game.value?.core);
let journalLedger:JournalLedger|undefined,journalGeneration=-1;
const journalKeys=computed(()=>{const g=game.value,generation=readingGeneration.value;if(!g)return[];if(generation!==journalGeneration){journalLedger=undefined;journalGeneration=generation;}journalLedger=journalAnchors(journalLedger,g.journal,g.core.runId,g.core.revision,journalWrites.value);return journalLedger.keys;});
function journalKey(index:number){return journalKeys.value[(game.value?.journal.length??0)-1-index]??'missing-reading';}
const tracking = useTracking(game);
const trialView=computed(()=>game.value?trialGuidance(game.value):null);
const step=computed(()=>game.value?nextStep(game.value):null);
function openPreparation(event?:Event){return openHub('journey',event);}
function openTradeoffs(kind:ProgressionKind,seed:ProgressionVariant){stageReturns.captureTradeoff();tradeoffKind.value=kind;tradeoffSeed.value=seed;tradeoffEntry.value++;return openHub('tradeoffs');}
function inspectCaveDestination(request:NavigationRequest){rememberHubOrigin();return inspectTradeoffDestination(request);}
async function inspectTradeoffDestination(request:NavigationRequest){
 if(!game.value)return;
 if(game.value.core.world.location!==request.location||request.focusId?.startsWith('travel-')){const owns=inspectionOwner();const owner=await openHub('explore');if(owns(owner)){adventureInspectionPlan.value=null;adventureInspectionSaved.value=false;highlight.value='travel-'+request.location;}return;}
 return navigate(request);
}
async function inspectNext(event?:Event){
 const kind=step.value?.kind;
 if(kind==='prepare')return openPreparation(event);
 if(kind==='school')return showEquipment(event);
 if(kind==='record')return showLife();
 if(kind==='encounter'&&!game.value?.battle&&phase.value!=='opening')return openHub('current',event);
 const owner=navigationOwner.value;await closeHub();await nextTick();if(navigationOwner.value!==owner+1)return;
 const stage=document.querySelector<HTMLElement>('[data-testid=hub-current]');
 focus.target(stage?.querySelector<HTMLElement>('button.primary:not(:disabled),button.cultivate-primary:not(:disabled)')??stage);
}

const lifeBook=ref<{manage():void}>();
const lifeState=computed(()=>game.value?lifespanGuidance(game.value):null);
async function inspectLifespan(event:Event){const owns=inspectionOwner();const owner=await showLife(event);if(owns(owner??null))lifeBook.value?.manage();}
const hubGoal=computed(()=>game.value?getTrackedGoal(game.value,tracking.target.value):null);
const hudGoalContext=computed(()=>{const g=game.value,o=hubGoal.value;return g&&o&&!lifeState.value?.hint?{runId:g.core.runId,revision:g.core.revision,goal:o}:null;});
const hubGoalHint=computed(()=>{if(tracking.target.value.kind==='breakthrough'&&trialView.value)return trialView.value.state;const g=hubGoal.value;if(!g)return'';if(g.completed)return'目标已达成';const d=g.deficits.find(d=>d.kind==='xp')??g.deficits.find(d=>d.kind==='item')??g.deficits[0];if(!d)return g.preview?.failure?.message??'准备已齐，可核对行动。';const label=d.kind==='item'?ruleContent.value.items[d.id!].name:({stones:'灵石',mp:'灵力',months:'余寿游戏月',xp:'修为',hp:'气血'}as const)[d.kind];return`尚缺${label} ${d.missing}${g.deficits.length>1?'（另 '+(g.deficits.length-1)+' 项）':''}`;});
function selectTracking(target:Parameters<typeof tracking.select>[0]){stageNavigation.advance();tracking.select(target);}
watch([() => tracking.target.value, () => game.value?.core.runId], () => { collectionTarget.value = null; highlight.value = ''; });
watch(() => game.value?.core.player.realm, () => { if (tracking.target.value.kind === 'breakthrough') { collectionTarget.value = null; highlight.value = ''; } });
const realm = computed(() => ruleContent.value.realms[core.value?.player.realm ?? 'mortal']);
const location = computed(() => C.locations[core.value?.world.location ?? 'wilderness']);
const phase = computed(() => game.value ? gamePhase(game.value) : null);
watch([()=>game.value?.core.runId,()=>phase.value,()=>game.value?.core.activeEvent?.instanceId,()=>store.syncEpoch],()=>{narrativeContext.value++;stageReturns.clearReading();},{flush:'sync'});
const equipmentVisible=computed(()=>tab.value==='修行'&&(!singleScreen.value&&phase.value!=='opening'||singleScreen.value&&['skills','relics'].includes(hubView.value))&&game.value?.status==='active');
const needsSchool=computed(()=>!!game.value&&phase.value==='idle'&&C.rank(game.value.core.player.realm)>=C.rank('qi')&&!game.value.school);
watch(()=>game.value?.core.runId,()=>{stageFocus.lifeChanged();stageNavigation.advance();clearFlowReturns();clearInspections();collectionTarget.value=null;highlight.value='';stageReturns.reset();equipmentOpen.value=needsSchool.value;resumeVisible.value=false;},{flush:'sync'});
watch(()=>store.syncEpoch,clearFlowReturns,{flush:'sync'});
// Read-only inspection belongs to a life/navigation, and to the selected activity when saved.
// Do not fence on revisions: a normal cycle or pause must preserve the draft.


watch(needsSchool,value=>{if(value)equipmentOpen.value=true;},{immediate:true});
const startJourney=()=>stageFocus.startJourney(name.value);
async function showEquipment(event?:Event){rememberHubOrigin(event);const opener=stageReturns.opener,owner=selectTab('修行');if(singleScreen.value)hubView.value='skills';equipmentOpen.value=true;await nextTick();if(owner===navigationOwner.value&&!document.querySelector('dialog[open]')&&(document.activeElement===opener||document.activeElement===document.body))focus.target(document.querySelector<HTMLElement>('[data-testid="equipment-panel"]'));}
async function showBreakthroughGoal(){captureStageReturn('goal');const opener=focus.capture();selectTracking({kind:'breakthrough'});if(singleScreen.value)hubView.value='goal';const owner=navigationOwner.value;await nextTick();if(owner===navigationOwner.value&&!document.querySelector('dialog[open]')&&(document.activeElement===opener||document.activeElement===document.body))focusRegion('goal-panel');}
const inspectingInventory=computed(()=>game.value?.status==='active'&&phase.value!=='idle'&&tab.value==='行囊');
async function resumeEncounter(){if(game.value&&narrativeFor(game.value)){await openHub('current');return;}selectTab('修行');await nextTick();focusContent();}
const catalogueGuide=ref<HTMLDialogElement>();
function showCatalogueGuide(event?:Event){focus.open(catalogueGuide.value,event?.currentTarget instanceof HTMLElement?event.currentTarget:focus.capture());}
async function skipCatalogueGuide(){catalogueGuide.value?.close();await skipGuidance();}
const helpBook=ref<InstanceType<typeof GameplayHelp>>(),guidanceEnabled=ref(true),skippedGuides=ref<string[]>([]);
const gameplayHelp=computed(()=>helpBook.value?.element);
const guidance=computed(()=>guidanceFor(game.value,store.lastReplayed?null:store.lastResult));
watch(()=>game.value?.core.runId,()=>skippedGuides.value=[]);
async function skipGuidance(){skippedGuides.value=[...skippedGuides.value,guidance.value.id];await nextTick();focusContent();}
async function showGameplayHelp(){const opener=settings.value?.open?settingsButton.value??null:focus.capture();settings.value?.close();await nextTick();focus.open(gameplayHelp.value,opener);}
const journey = computed(() => game.value ? getTrialJourney(game.value) : null);
const overview = computed(() => game.value ? getLifeOverview(game.value) : null);
const lifeSection = ref<HTMLDetailsElement>();
const {quote,can,why,cost}=useActionView(store);
function viewReceipt(){if(store.activity?.version===7&&store.activity.stopReason?.code!=='STATE_CHANGED')return inspectMilestone(store.activity);return openHub('receipt');}
const stoppedTraining = computed(()=>store.activity?.status==='stopped'&&store.activity.stopReason?.code!=='STATE_CHANGED');
function act(action: Action) { resumeVisible.value=false;if(action.type==='TRAVEL')return travel(action.location);if(action.type==='BATTLE')return battle(action.move);if(action.type==='ENCOUNTER')return inspectAdventure(action.enemy);if(action.type==='CULTIVATE'){const n=action.count??1;return startTraining({kind:'cultivation',method:action.method,maxCycles:n,until:'cycles',stoneBudget:action.method==='natural'?0:Math.min(core.value?.player.stones??0,(quote({...action,count:1})?.costs?.stones??0)*n),stoneReserve:0});}if(action.type==='SOURCE'){const n=action.count??1,source=ruleContent.value.sources[action.sourceId],target=action.target?{kind:'item' as const,id:action.target.item,quantity:action.target.quantity}:batch.value==='target'?collectionTarget.value:null;return startSource({kind:'source',sourceId:action.sourceId,maxCycles:n,until:target?'target':'cycles',target,monthBudget:n*source.months,remainingMonthsReserve:1});}if(action.type==='CRAFT'||action.type==='FORGE')return inspectProduction(action);if(['BUY','SELL','USE','REST','LEARN','STUDY'].includes(action.type))return inspectPreparation(action);if(action.type==='SCHOOL'||action.type==='EQUIP'||action.type==='EQUIP_RELIC')return inspectConfiguration(action);if(store.activityRunning){store.activityNotice='当前活动进行中，请先暂停再行动。';return;}if (action.type === 'START_TRIAL') return showTrialPreparation(); if (action.type === 'END') return reviewAscension(action.ending); if(isMilestoneAction(action))return selectMilestone(action); const owner=navigationOwner.value; return focus.afterAction(async()=>{await store.act(action);},()=>owner===navigationOwner.value); }
const {storyAct,quickInventory,browse:browseDirect}=useDirectActions(store,focus,confirmation,{
 owner:()=>navigationOwner.value,viewIdentity:()=>[hubView.value,tab.value,detailParent.value?.view,detailParent.value?.tab],
 source:confirmationSource,blocked:confirmationBlocked,openCurrent:()=>openHub('current'),regular:act,
});
function trackTrialMaterial(target:Parameters<typeof selectTracking>[0]){selectTracking(target);void openHub('goal');}
function retryOperation(){const owner=navigationOwner.value;return focus.afterAction(()=>store.retry(),()=>owner===navigationOwner.value);}
async function trackProduction(target:Parameters<typeof selectTracking>[0]){selectTracking(target);await openHub('goal');}
const {configurationError,configurationIntent,configurationSnapshot,configurationStale,configurationRetry,inspectConfiguration,closeConfiguration,refreshConfiguration,confirmConfiguration}=useConfigurationReview(store);
const cultivationHome=computed(()=>!!game.value&&phase.value==='idle'&&tab.value==='修行'&&core.value?.world.location==='cave');
const worldArt=computed(()=>game.value?sceneAssetPath(scenePresentation(game.value),cultivationHome.value&&!producing.value&&!['home','cultivation','goal','journey'].includes(hubView.value)):undefined);
function focusCultivation(){focus.target(document.getElementById('cultivation-actions'));}
const activeStory = computed(() => game.value && core.value?.activeEvent && stories[core.value.activeEvent.id] ? getStoryContext(game.value, core.value.activeEvent.id) : null);
const relationships = computed(() => game.value ? getRelationships(game.value) : []);
async function navigate(request:NavigationRequest,arrived?:()=>void):Promise<void>{
 if(!game.value||store.busy||!store.available)return;
 if(game.value.core.world.location!==request.location)return arrangeTravel(request.location,()=>navigate(request,arrived));
 stageNavigation.advance();
  const focusRevision = selectTab(request.tab); highlight.value = request.focusId ?? '';
  if(request.focusId&&/^(equipment-panel|school-|learn-|equip-|forge-|study-manual)/.test(request.focusId)){equipmentOpen.value=true;if(singleScreen.value)hubView.value=request.focusId.startsWith('forge-')?'relics':'skills';}if(singleScreen.value&&request.focusId?.startsWith('craft-'))hubView.value='forge';if(singleScreen.value&&request.tab==='修行'&&request.focusId?.startsWith('trial-'))hubView.value='trial-preparation';
  if(singleScreen.value&&/^(buy-|sell-)/.test(request.focusId??''))hubView.value='market';if(singleScreen.value&&request.focusId==='rest'){hubView.value='recovery';preparationInspectionPlan.value={kind:'rest',maxCycles:1,remainingMonthsReserve:1};}if(singleScreen.value&&request.focusId==='cultivation-actions'&&step.value?.kind==='recover')hubView.value='recovery';
  if (request.quantity) quantity.value = request.quantity;
  if (request.collection) {collectionTarget.value = request.collection;batch.value='target';}
  await nextTick();
  if (navigationOwner.value !== focusRevision) return;
  arrived?.();
  const element = request.focusId ? document.querySelector<HTMLElement>(`[data-testid="${request.focusId}"]`) : null;
  if(element){const target=element.matches(':disabled')?(element.closest<HTMLElement>('article,.recipe,.market-row')??element.parentElement):element;if(target){if(target!==element)target.tabIndex=-1;target.scrollIntoView({block:'center'});focus.target(target);}}
}
const consumptionPreview = computed(() => game.value ? createConsumptionPreview(game.value, tracking.target.value, preparation.value) : null);
function consumption(action: Action) {
  const gaps = consumptionPreview.value?.(action) ?? [];
  return gaps.length ? '会消耗追踪物资：' + gaps.map(gap => `${ruleContent.value.items[gap.id!].name}将缺${gap.missing}`).join('、') + '；材料未被预留。' : '';
}
function battle(move:Move){if(!game.value?.battle||store.activityRunning)return;return startAdventure(singleBattlePlan(game.value,move));}
const closureDecisions=ref<InstanceType<typeof ClosureDecisions>>();
const closureNavigation:ClosureNavigation={
 owner:()=>navigationOwner.value,
 leaveSettings:()=>{const opener=settings.value?.open?settingsButton.value??null:focus.capture();settings.value?.close();return opener;},
 accepted:(review,owner,sync,target)=>armStageFocus(review,owner,sync,target),
 showTrialPreparation,
};
const requestEnd=(type:'RETIRE'|'END_LIFE')=>closureDecisions.value?.requestEnd(type);
const reviewTrial=()=>closureDecisions.value?.reviewTrial();
const reviewAscension=(ending:AscensionEnding)=>closureDecisions.value?.reviewAscension(ending);
const requestTrialRestore=()=>closureDecisions.value?.requestTrialRestore();
onMounted(async() => {await experience.init();if(appActive)await initialiseGame();});
</script>

<template>
<div class="app-shell art-theme" data-theme="jade" :class="{'is-saving':store.busy,'text-enlarged':fontScale>1,'has-game':!!game,'cultivation-home':cultivationHome,'is-opening':phase==='opening','single-screen':singleScreen&&!!game,'game-menus-desktop':singleScreen,'hub-visible':hubMain,'hub-reduced':reduceMotion,'catalogue-view':catalogueView,'immersive-stage':immersive,'sealed-stage':immersive&&game?.status!=='active','stage-forge':immersive&&hubView==='forge','stage-details':immersive&&detailViews.has(hubView)}" :data-opening-reader="singleScreen&&phase==='opening'&&hubView==='current'" :data-font-scale="fontScale" :data-session="session.kind" :style="{'--font-scale':fontScale,'--nav-height':navHeight+'px','--notice-height':noticeHeight+'px'}">
<CultivationStageHost :active="!!game&&['home','cultivation','current','trial-preparation'].includes(hubView)" :handoff="hubMain&&store.activity?.version===7&&store.activity.status==='stopped'" v-slot="{milestoneResult,milestoneText,milestoneDetail}">
<AssetImage v-if="store.ready&&game" class="world-ambience" :path="worldArt" asset-id="world-ambience" eager aria-hidden="true"/>
<nav class="skip-links" aria-label="快捷定位"><a :href="game?'#game-content':'#welcome-content'" @click.prevent="focusContent">跳到当前内容</a><a v-if="game" href="#primary-navigation" @click.prevent="focusRegion('primary-navigation')">{{game.status==='active'?'跳到主导航':'跳到封卷导航'}}</a><a v-if="game" href="#goal-panel" @click.prevent="focusRegion('goal-panel')">{{game.status==='active'?'跳到当前目标':'跳到此卷历程'}}</a></nav>
<SealedLifeHud v-if="store.ready&&immersive&&game&&game.status!=='active'" :game="game" :save-label="saveDisplayLabel" :save-tone="saveTone" :demo="!!demoNode" @inspect="openHub('character',$event)" @life="showLife" @help="showGameplayHelp" @settings="showSettings"/>
<GameHud v-else-if="store.ready&&immersive&&game" :game="game" :goal="hubGoal?.title??'当前目标'" :context="hudGoalContext" :gap="lifeState?.hint??hubGoalHint" :save-label="saveDisplayLabel" :save-tone="saveTone" :demo="!!demoNode" @inspect="openHub('character',$event)" @goal="openHub('goal',$event)" @help="showGameplayHelp" @settings="showSettings"><TrainingActivity v-if="activityRailVisible" :store="store" rail compact @settings="viewActivityPlan" @details="viewReceipt" @inspect="openHub('activity')"/><StageOutcome v-else-if="store.lastResult&&hubView!=='activity'" :game="game" :result="store.lastResult" :busy="store.busy" :saved="store.saved" :available="store.available" :error="store.error" :sync-issue="store.syncIssue" :replayed="store.lastReplayed" :execution="store.execution" :followup="false" compact next="" @details="viewReceipt"/></GameHud>
<header v-else class="topbar">
<div class="brand"><strong v-if="demoNode" class="demo-badge" data-testid="demo-badge">演示存档</strong><span class="seal">尘<br>缘</span><div><h1>尘缘问道</h1><p>一念尘缘起 · 千山共问道</p></div></div>
<div v-if="core" class="where"><span class="diamond">◇</span> 云岚州 · {{location.name}} <small>修行第 {{core.world.elapsedMonths}} 月</small></div>
<div class="top-actions"><div class="save-summary" :data-save-state="saveTone" data-testid="save-summary"><span class="save-state" role="status" data-testid="save-status"><GameIcon kind="action" id="save"/>{{saveDisplayLabel}}</span><small>本机存档</small></div><button v-if="game" class="top-export" @click="exportSave" :disabled="store.busy"><GameIcon kind="action" id="export"/> 导出存档</button><button ref="settingsButton" @click="showSettings">设置</button></div>
</header>
<section v-if="demoNode&&!hubMain" class="paper demo-banner" aria-label="演示存档说明"><strong>演示存档 · {{demoNode.label}}</strong><div class="demo-actions"><a :href="normalLink()" data-testid="demo-return">返回正常游戏</a><button @click="showDemoMenu" :disabled="store.busy">切换演示节点</button><button data-testid="demo-reset" @click="reset" :disabled="uiLocked">重新载入本节点</button></div><details class="demo-explanation"><summary>演示说明</summary><p>本版本每个节点的进度独立保存，使用相同修行规则；正常进度与显示设置不受影响。</p></details></section>
<section v-if="!immersive&&resumeVisible&&game&&store.ready&&!hubMain" class="resume-strip" data-testid="resume-strip"><span>已续上本机进度 · {{realm.name}} · {{location.name}}</span><button type="button" class="text-button" @click="resumeVisible=false;focusPrimary()">继续当前内容 ↓</button></section>
<section v-if="!store.ready" class="loading loading-stage" aria-labelledby="loading-title"><AssetImage class="loading-landscape" :path="PANEL_MATERIAL_ASSETS.mountains" asset-id="loading-mountains" eager aria-hidden="true"/><div class="loading-copy"><span class="eyebrow">尘缘将启</span><h2 id="loading-title">静候山门</h2><p role="status" data-testid="game-loading">{{experience.ready.value?'正在核对本机进度，尚未确认存档……':'正在读取本机显示设置，不会改变游戏进度……'}}</p></div></section>
<div ref="noticeRegion" class="stage-alerts">
<section v-if="immersive&&resumeVisible&&game&&store.ready&&!hubMain" class="resume-strip" data-testid="resume-strip"><span>已续上本机进度 · {{realm.name}} · {{location.name}}</span><button type="button" class="text-button" @click="resumeVisible=false;focusPrimary()">继续当前内容 ↓</button></section>
<div v-if="store.error" class="error-banner" role="alert" data-testid="error">
<p class="error-title"><strong>{{store.canRetry?'保存待核对':store.available?'操作受阻':'存档不可用'}}</strong><span v-if="store.canRetry" class="small" data-testid="retry-policy"> · 重试核对原操作，不重复结算。</span></p><p>{{recoveryMessage(store.error,store.canRetry)}}</p><button v-if="store.canRetry" class="primary" data-testid="retry" @click="retryOperation" :disabled="store.busy">重试原操作</button>
<button v-if="!store.available" data-testid="reload-storage" @click="initialiseGame()" :disabled="store.busy">重新读取</button>
<button @click="exportRaw" :disabled="store.busy">导出原件备份</button>
</div>
<div v-if="store.warning" class="error-banner" role="status">{{store.warning}}</div>
<div v-if="exportError" class="error-banner" role="alert">{{exportError}}</div>
<div v-if="importNotice" class="error-banner" role="alert" data-testid="import-notice">{{importNotice}}</div>
<LifespanGuide v-if="!hubMain&&game" :game="game" @life="showLife" @checkpoint="showSettings"/>
<ResultMoments :store="store" :reduce-motion="reduceMotion" :active="!['activity','receipt','goal','character','help'].includes(hubView)" @dismiss="focusContent"/>
<ActionFeedbackStage :store="store" :reduce-motion="reduceMotion" :view-key="hubView+':'+tab" :playfield-active="hubMain||hubView==='current'&&storyView">
<template #default="{operation,dismiss,hold}"><FeedbackSkip v-if="['BATTLE','BREAKTHROUGH','START_TRIAL'].includes(operation)" @hold="hold" @dismiss="dismiss"/></template>
</ActionFeedbackStage>
</div>
<main v-if="store.ready && !game && !demoNode" id="welcome-content" tabindex="-1" class="welcome">
<div class="welcome-art"><AssetImage class="welcome-backdrop" :path="SCENE_ASSETS.wilderness" asset-id="welcome-wilderness" eager/><div class="welcome-copy"><span class="eyebrow">尘缘问道 · 试玩版</span><h2>凡心未改，<br>仙途已在眼前。</h2><p>不计片刻，不赶境界。<br>采一味灵草，结一段因果，修属于自己的长生路。</p></div></div>
<form class="paper welcome-form" @submit.prevent="startJourney">
<span class="eyebrow">新建人生 / 凡心入道</span><h2>从此刻，问道。</h2><label for="name">你的道号</label>
<input id="name" name="dao-name" spellcheck="false" v-model="name" maxlength="16" required autocomplete="off" :disabled="uiLocked">
<p>安排修炼，积累材料，筹备下一步。数值未平衡；游戏月在已安排的周期完成时消耗，暂停后阅读不消耗寿元。</p>
<button class="primary" type="submit" :disabled="uiLocked">踏入仙途 <span>→</span></button>
<div class="welcome-secondary"><button type="button" data-testid="demo-menu-welcome" @click="showDemoMenu" :disabled="store.busy">演示节点</button><button type="button" data-testid="welcome-help" @click="showGameplayHelp">玩法帮助</button></div>
<label class="file-button">导入已有存档<input type="file" name="save-import" accept=".json,application/json" @change="importFile" :disabled="uiLocked"></label>
<details class="welcome-details"><summary>本机存档与试玩记录</summary><p class="small">必要试玩记录只保存在本机，不上传、不记录道号；可在设置关闭、清空或知情导出。进度仅保存在当前浏览器，导出备份可用于迁移。</p></details>
</form>
</main>
<main v-if="store.ready&&!game&&demoNode" class="paper demo-banner"><h2>演示进度尚未就绪</h2><p>请核对上方错误后重试同次操作或重新读取；不会改动正常进度。</p><button @click="initialiseGame" :disabled="store.busy">重新读取演示进度</button></main>
<div v-if="game&&core" class="effects-stage"><ActionEffects :result="store.lastResult" :replayed="store.lastReplayed" :run-id="core.runId" :revision="core.revision" :school="game.school" :reduce-motion="reduceMotion" @focus-fallback="focusContent" :busy="store.busy" :eligible="store.saved && store.available && !store.error && hubMain && !store.lastFromActivity"/></div>
<ActionExecution :execution="store.execution"/>
<MainStage v-if="store.ready&&game&&core&&(hubMain||immersive&&game.battle)" ref="mainStage" :hub-main="hubMain" :immersive="immersive" :cultivation-home="cultivationHome" :resume-visible="resumeVisible" :demo-node="!!demoNode" :target="tracking.target.value" :goal-hint="hubGoalHint" v-model:method="hubTrainingMethod" :adventure-inspection-plan="adventureInspectionPlan" :adventure-inspection-saved="adventureInspectionSaved" :milestone-sequence="milestoneResult?.sequence??null" :milestone-text="milestoneText" :milestone-detail="milestoneDetail" @open="openHub" @prepare="openPreparation" @destination="inspectCaveDestination" @act="act" @start="plan=>plan.kind==='cultivation'?startTraining(plan):startAdventure(plan)" @school="showEquipment" @life="showLife" @manage-life="inspectLifespan" @settings="showSettings" @plan="viewActivityPlan" @receipt="viewReceipt" @compare="openTradeoffs('cultivation',$event)" @trial="showTrialPreparation" @tab="selectTab" @next="inspectNext" @export="exportSave" @demos="showDemoMenu"/>
<aside v-if="!immersive&&game&&game.status==='active'&&singleScreen&&!hubMain&&catalogueView" class="feature-state" data-testid="feature-state"><CharacterPanel :game="game" compact @inspect="openHub('character',$event)"/><TrainingActivity v-if="store.activity&&store.activity.status!=='stopped'" :store="store" compact @settings="viewActivityPlan" @details="viewReceipt"/><TrainingActivity v-else-if="stoppedTraining" :store="store" summary @settings="viewActivityPlan" @details="viewReceipt"/><StageOutcome v-else :game="game" :result="store.lastResult" :busy="store.busy" :saved="store.saved" :available="store.available" :error="store.error" :sync-issue="store.syncIssue" :replayed="store.lastReplayed" :execution="store.execution" :next="step?.title??'查看当前目标'" @next="inspectNext()" @details="viewReceipt"/></aside>
<main v-if="store.ready&&game && core" v-show="!hubMain" class="game-grid" :class="{'hub-feature':singleScreen}" :aria-busy="store.busy">
<header v-if="singleScreen" class="feature-header"><div><h2 id="feature-title" tabindex="-1">{{game.status==='active'?hubTitle:hubView==='goal'?'此卷历程':['current','fate'].includes(hubView)?'修仙生平':hubTitle}}</h2></div><div class="feature-actions"><FeatureMenu :identity="game.core.runId+':'+hubView" :guide="catalogueView&&guidanceEnabled&&!skippedGuides.includes(guidance.id)" :preparation="hubView!=='journey'&&phase==='idle'&&!!realm.pill" :goal="hubView!=='goal'" :blueprints="navigationGate(game,'relics').locked" :sealed="game.status!=='active'" @browse="browseDirect()" @guide="showCatalogueGuide()" @preparation="openPreparation()" @goal="openHub('goal')" @blueprints="openPrimaryFeature('relics')"/><button data-testid="hub-close" :aria-label="detailParent||hubView==='life'&&readingReturn?'返回原玩法':'返回主舞台'" @click="closeHub">{{detailParent||hubView==='life'&&readingReturn?'返回原处':'返回舞台'}} <GameIcon kind="action" id="close"/></button></div></header>
<section v-show="!hubMain&&(!singleScreen||!['goal','character'].includes(hubView))" class="center-column" :class="{'in-battle':game.battle&&!inspectingInventory}">
<ScenePanel v-if="!singleScreen" :meditation="cultivationHome&&!producing&&!immersive" :battle-stage="!!game.battle&&!inspectingInventory" :game="game" :eyebrow="phase==='opening'?'初遇 / 山雨破庙':location.subtitle" :title="phase==='opening'?'雨中故人':game.status==='ascended'?overview!.title:game.battle?location.name:activeStory?.name??location.name" :description="game.status==='ascended'?'此卷已收，来路犹存。':game.battle?'先辨来势，再决进退。':'山海不言，修行自有回响。'" :with-action="!cultivationHome&&(!game.battle||inspectingInventory)"><button v-if="!cultivationHome&&(!game.battle||inspectingInventory)" type="button" class="scene-action-link" data-testid="scene-action-jump" @click="focusPrimary">{{phase==='opening'?'前往抉择':'前往当前操作'}} ↓</button></ScenePanel>

<ActivityCatalogues :view="hubView" :single-screen="singleScreen" :immersive="immersive" :reading-generation="readingGeneration" :tradeoff-kind="tradeoffKind" :tradeoff-seed="tradeoffSeed" :tradeoff-entry="tradeoffEntry" :quantity="quantity" :consumption="consumption" v-model:all-receipts="receiptAll" @act="act" @navigate="navigate" @destination="inspectTradeoffDestination" @track="trackProduction" @home="closeHub" @prepare="openPreparation" @compare="openTradeoffs" @open="openHub" @school="showEquipment" @trial="showTrialPreparation" @quick="quickInventory" @receipt="viewReceipt"/>
<StoryCatalogues ref="lifeBook" :active="storyView" :view="hubView" :reading-generation="readingGeneration" :narrative-context="narrativeContext" :journal-key="journalKey" :consumption="consumption" @browse="browseDirect" @act="storyAct" @navigate="navigate" @life="showLife" @resume="resumeEncounter" @dialogue="openHub('current')" @end="requestEnd" @export="exportLife" @restore="restore" @restart="reset" @receipt="viewReceipt" @progress="openHub('trial')"/>
<MilestoneGate v-if="storyView&&hubView==='trial-preparation'" :game="game" kind="trial"><TrialCatalogue :block="pendingStoryError?(store.syncIssue?'请先重新读取当前进度':'请先重试或取消原安排'):null"  :game="game" kind="preparation" :enabled="store.available" :running="store.activityRunning" :busy="store.busy" :checkpoint="store.checkpointSummary" :recovery="store.trialRecovery" @review="reviewTrial" @restore="hubView==='trial-preparation'?restore():requestTrialRestore()" @export="exportSave" @prepare="showTrialPreparation" @resume="closeHub" @navigate="navigate" @track="trackTrialMaterial" @inspect-equipment="openHub('skills')"/></MilestoneGate>
<TrialCatalogue :block="pendingStoryError?(store.syncIssue?'请先重新读取当前进度':'请先重试或取消原安排'):null" v-if="storyView&&(['trial','battle'].includes(hubView)||hubView==='current'&&game.status==='active'&&!narrativeFor(game)&&phase!=='idle')" :game="game" kind="progress" :initial-mode="trialReadMode" :enabled="store.available" :running="store.activityRunning" :busy="store.busy" :checkpoint="store.checkpointSummary" :recovery="store.trialRecovery" @review="reviewTrial" @restore="hubView==='trial-preparation'?restore():requestTrialRestore()" @export="exportSave" @prepare="showTrialPreparation" @resume="closeHub" @navigate="navigate" @track="trackTrialMaterial" @inspect-equipment="openHub('skills')"/>
<TrialProgressPanel v-if="!catalogueView&&(journey || store.trialRecovery)" :journey="journey" :recovery="store.trialRecovery" :checkpoint="store.checkpointSummary" :enabled="store.available && !store.busy" @restore="requestTrialRestore" @export="exportSave" @prepare="showTrialPreparation"/>
<LegacyContent ref="legacyContent" :hub-main="hubMain" :story-view="storyView" :single-screen="singleScreen" :immersive="immersive" :view="hubView" :tab="tab" :cultivation-home="cultivationHome" :guide="guidance" :guidance-enabled="guidanceEnabled" :skipped-guides="skippedGuides" :consumption="consumption" v-model:batch="batch" v-model:quantity="quantity" @act="act" @navigate="navigate" @track="selectTracking" @home="closeHub" @resume="resumeEncounter" @life="showLife" @school="showEquipment" @focus-cultivation="focusCultivation" @breakthrough-goal="showBreakthroughGoal" @help="topic=>{if(topic)helpBook?.selectTopic(topic);showGameplayHelp();}" @skip="skipGuidance" @export="exportLife" @restore="restore" @restart="reset" @receipt="viewReceipt"/>
        <div v-if="!storyView&&tab==='仙缘'&&phase!=='idle'&&game.status==='active'" class="paper inline-actions"><button type="button" class="text-button" data-testid="show-life" @click="showLife">查看修仙生平 →</button><button type="button" data-testid="resume-encounter" @click="resumeEncounter">返回当前遭遇</button></div>
        <RelationshipPanel v-if="!storyView&&tab==='仙缘' && phase!=='idle'" :game="game" :enabled="store.available && !store.busy" @navigate="navigate"/>
        <details v-if="!storyView&&tab==='仙缘' && game.status==='active'&&(!singleScreen||hubView==='life')" ref="lifeSection" class="paper life-section" :open="lifeOpen" @toggle="lifeOpen=($event.target as HTMLDetailsElement).open" data-testid="life-section"><summary>修仙生平 · 查看、导出与收卷</summary><LifePanel v-if="lifeOpen" :game="game" :enabled="store.available" :busy="store.busy" :has-checkpoint="store.hasCheckpoint" @end="requestEnd" @export="exportLife" @restore="restore" @restart="reset"/></details>
        <GrowthPanel v-if="!singleScreen&&tab==='修行' && phase==='idle' && C.rank(core.player.realm)>=C.rank('foundation') && core.player.realm!=='spirit'" :game="game" :enabled="store.available && !store.busy" @navigate="navigate" @track="selectTracking"/>
        <TrialPreparationPanel v-if="!storyView&&(!singleScreen||hubView==='trial-preparation')&&tab==='修行' && phase==='idle' && core.player.realm==='spirit'" :game="game" :enabled="store.available && !store.busy" :checkpoint="store.checkpointSummary" @navigate="navigate" @track="selectTracking" @review="reviewTrial" @restore="restore" @inspect-equipment="openHub('skills')"/>
        <details v-show="equipmentVisible" class="equipment-disclosure" data-testid="equipment-section" :open="singleScreen||equipmentOpen" @toggle="equipmentOpen=($event.target as HTMLDetailsElement).open"><summary data-testid="equipment-toggle">功法与法宝 <span>{{game.school==='sword'?'当前剑修':game.school==='talisman'?'当前符修':'查看与选择修法'}} · {{equipmentOpen?'收起':'展开'}}</span></summary><KeepAlive :max="1"><EquipmentPanel :entry="equipmentEntry" :key="game.core.runId" v-if="equipmentVisible&&(singleScreen||equipmentOpen)" :game="game" :enabled="store.available" :busy="store.busy" :highlight="highlight" @section="equipmentReading=$event" :catalogue="hubView==='relics'?'relics':'skills'" :consumption="consumption" :running="store.activityRunning" :activity="store.activity" :runtime="store.activityRuntime" :saved-production="productionInspectionPlan" :saved-preparation-plan="preparationInspectionPlan" :preparation-saved="preparationInspectionSaved" @travel-plan="movePreparation" @start="startProduction" @move="moveProduction" @act="act" @track="trackProduction" @navigate="navigate"/></KeepAlive></details>
        <div v-if="!hubMain&&!catalogueView&&(!singleScreen||!['receipt','character','journey','explore','inventory','forge','skills','relics','cultivation'].includes(hubView))" class="feedback paper" aria-live="polite" data-testid="feedback"><span>手记</span><p>{{game.journal.at(-1)}}</p><ActionFeedback v-if="store.lastResult" :result="store.lastResult" :replayed="store.lastReplayed"/></div>
      </section>
      <aside v-show="!singleScreen||hubView==='goal'" class="right-column"><GoalPanel :write-blocked="!!pendingStoryError" :game="game" :target="tracking.target.value" :enabled="store.available && !store.busy" :notice="tracking.notice.value" @select="selectTracking" @navigate="navigate" @current="game.battle?selectTab('修行'):openHub('current',$event)" @preparation="preparation=$event"/><section v-if="!singleScreen" class="paper recent-action"><div class="section-label">最近行动</div><p>{{game.journal.at(-1)}}</p><p v-if="store.lastResult" class="small">{{formatDelta(store.lastResult.delta)}}</p></section><section v-if="!singleScreen" class="paper fate-summary"><div class="section-label">仙缘因果</div><div v-for="person in relationships.slice(0,2)" :key="person.id" :data-testid="`fate-summary-${person.id}`"><PortraitImage class="fate-portrait" :id="person.id" :fallback="person.seal"/><h3>{{person.name}} · {{person.label}}</h3><p class="small">{{person.summary}}</p></div><button class="text-button" @click="selectTab('仙缘')">展开仙缘 →</button></section>
      <section v-if="!singleScreen" class="note"><span>此地机缘</span><p>{{location.description}}</p><small>试玩版本 · 数值未平衡<br>约30分钟理解玩法，不限定通关时间</small></section></aside>
      <CharacterPanel v-if="!singleScreen||hubView==='character'" :game="game" :details-only="immersive"/>
    </main>
    <SealedLifeNav v-if="store.ready&&immersive&&game&&game.status!=='active'" :view="hubView" :demo="!!demoNode" :normal-href="demoNode?normalLink():undefined" @open="openHub" @settings="showSettings" @height="navHeight=$event"/>
    <PrimaryNav v-else-if="store.ready&&game&&(game.status==='active'||demoNode)" :game="game" :demo="!!demoNode" :normal-href="demoNode?normalLink():undefined" :sealed="game.status!=='active'" :selected="tab" :expanded="immersive" :view="navigationView" @open="openPrimaryFeature" @select="selectPrimaryTab" @height="navHeight=$event"/>
    <button v-if="store.ready&&immersive" class="stage-journal" data-testid="stage-details" @click="store.lastResult||store.activity?.version===6||store.activity&&store.activity.version<=5&&store.activity.completedCycles>0?viewReceipt():openHub('life',$event)">行道手记 ›</button>
    <MilestoneReview v-if="milestoneReview" :key="milestoneReview.identity" :review="milestoneReview" :stale="milestoneStale" :retry="milestoneRetry" :busy="store.busy" :available="store.available" :error="store.error" :pending-error="pendingStoryError" @confirm="!pendingStoryError&&confirmMilestone()" @retry="confirmMilestone(true)" @close="closeMilestone"/>
    <ConfigurationDialog v-if="configurationIntent&&configurationSnapshot" :key="configurationIntent.command.commandId" :intent="configurationIntent" :snapshot="configurationSnapshot" :stale="configurationStale" :busy="store.busy" :available="store.available" :error="configurationError" :retry="configurationRetry" @confirm="confirmConfiguration()" @retry="confirmConfiguration(true)" @refresh="refreshConfiguration" @close="closeConfiguration"/>
  <dialog ref="catalogueGuide" class="paper catalogue-guide" data-testid="catalogue-guide" aria-labelledby="catalogue-guide-title"><header><h2 id="catalogue-guide-title" tabindex="-1" data-dialog-initial>行道指引</h2><button aria-label="关闭行道指引" @click="catalogueGuide?.close()">关闭</button></header><GuidancePanel v-if="catalogueView&&guidanceEnabled&&!skippedGuides.includes(guidance.id)" :guide="guidance" @skip="skipCatalogueGuide" @help="showGameplayHelp"/></dialog>
    <GameSettings ref="settingsView" :experience="experience" :target="tracking.target.value" :save-label="saveDisplayLabel" :export-error="exportError" :import-notice="importNotice" @help="showGameplayHelp" @demos="showDemoMenu" @life="showLife" @retire="requestEnd('RETIRE')" @import="importFile" @export="exportSave" @raw="exportRaw" @restart="reset" @restore="restore"/>
    <DemoMenu ref="demoMenuView"/>
    <GameplayHelp ref="helpBook" v-model:enabled="guidanceEnabled" @reset="skippedGuides=[]"/>
<ClosureDecisions ref="closureDecisions" :single-screen="singleScreen" :can="can" :navigation="closureNavigation"/>
    </CultivationStageHost>
    <GameConfirmDialog v-if="confirmation.request.value" :key="confirmation.request.value.id" :request="confirmation.request.value" @answer="confirmation.answer($event)"/>
  </div>
</template>
<style src="./closure-focus.css"></style>
<style>
@layer game{
    .art06-progress:has(>.art06-harvest){padding-bottom:4px}}
</style>
