<script setup lang="ts">
import {useRuleContent} from './rule-content';
import ClosureDecisions from './ClosureDecisions.vue';
import CultivationHome from './CultivationHome.vue';
import type {ClosureNavigation} from './closure-navigation';
import {useSaveControls} from './use-save-controls';
import {useActionView} from './use-action-view';
import {useStageReturns} from './use-stage-returns';
import {useConfigurationReview} from './use-configuration-review';
import ActivityRecords from './ActivityRecords.vue';
import {useDirectActions} from './use-direct-actions';
import GameSettings from './GameSettings.vue';
import DemoMenu from './DemoMenu.vue';
import GameplayHelp from './GameplayHelp.vue';
import CultivationTab from './CultivationTab.vue';
import ExplorationTab from './ExplorationTab.vue';
import InventoryTab from './InventoryTab.vue';
import FateTab from './FateTab.vue';

import { computed, nextTick, onMounted, onScopeDispose, provide, ref, shallowRef, watch } from 'vue';
import { useGame } from './store';
import {useFocus,visibleFocusTarget,gameFocusKey} from './focus';
import {primaryActivityControls} from './activity-controls';
import {navigationGate} from './navigation-gates';
import FeatureMenu from './FeatureMenu.vue';
import * as C from '../../src/full/content.ts';
import { gamePhase } from '../../src/full/contracts.ts';
import { getBreakthroughGoal, previewAction, getStoryContext, getRelationships, getLifeOverview, getTrialJourney, getAscensionChoices } from '../../src/full/queries.ts';
import type { Action, Move } from '../../src/full/types.ts';
import { stories } from '../../src/full/events.ts';
import { getTrackedGoal, createConsumptionPreview, type CollectionTarget } from '../../src/full/goals.ts';
import { useTracking } from './use-tracking';
import { formatCosts, formatDelta } from './presentation';
import type { NavigationRequest } from './navigation';
import {repeats} from '../../src/full/repetition';
import GoalPanel from './GoalPanel.vue';
import CharacterPanel from './CharacterPanel.vue';
import GameHud from './GameHud.vue';
import SealedLifeHud from './SealedLifeHud.vue';
import SealedLifeStage from './SealedLifeStage.vue';
import SealedLifeNav from './SealedLifeNav.vue';
import ScenePanel from './ScenePanel.vue';
import BattlePanel from './BattlePanel.vue';
import PrimaryNav from './PrimaryNav.vue';
import AssetImage from './AssetImage.vue';
import PortraitImage from './PortraitImage.vue';
import GameIcon from './GameIcon.vue';
import ProgressTrack from './ProgressTrack.vue';
import ChoiceCard from './ChoiceCard.vue';
import ActionEffects from './ActionEffects.vue';
import ActionFeedbackStage from './ActionFeedbackStage.vue';
import ResultMoments from './ResultMoments.vue';
import FeedbackSkip from './FeedbackSkip.vue';
import NarrativeStageHost from './NarrativeStageHost.vue';
import CultivationStageHost from './CultivationStageHost.vue';
import CultivationSite from './CultivationSite.vue';
import CultivationOngoing from './CultivationOngoing.vue';
import MilestoneGate from './MilestoneGate.vue';
import OpeningOffering from './OpeningOffering.vue';
import OpeningResponse from './OpeningResponse.vue';
import CaveThresholdObject from './CaveThresholdObject.vue';
import CultivationNotes from './CultivationNotes.vue';
import ActionExecution from './ActionExecution.vue';
import StageOutcome from './StageOutcome.vue';
import {recoveryMessage} from './activity-view';
import ExplorePanel from './ExplorePanel.vue';
import GoodsPanel from './GoodsPanel.vue';
import PreparationPanel from './PreparationPanel.vue';
import TrainingPlanner from './TrainingPlanner.vue';
import ProgressionChoices from './ProgressionChoices.vue';
import type {ProgressionKind,ProgressionVariant} from '../../src/full/progression.ts';
import TrainingActivity from './TrainingActivity.vue';
import AdventureHistory from './AdventureHistory.vue';
import ActivityHistory from './ActivityHistory.vue';
import {ADVENTURE_CYCLE_MS,isAdventurePlan, singleBattlePlan, type AdventurePlan} from '../../src/full/adventure.ts';
import MarketPlanner from './MarketPlanner.vue';
import RecoveryPlanner from './RecoveryPlanner.vue';
import ConfigurationDialog from './ConfigurationDialog.vue';
import {isPreparationPlan,type PreparationPlan} from '../../src/full/preparation.ts';
import type {Game} from '../../src/full/types.ts';
import {previewActivity,type CultivationPlan,type SourcePlan,type CraftPlan,type ForgePlan} from '../../src/full/activity.ts';
import NarrativePanel from './NarrativePanel.vue';
import FateCatalogue from './FateCatalogue.vue';
import LifeCatalogue from './LifeCatalogue.vue';
import LifespanGuide from './LifespanGuide.vue';
import CultivationFallback from './CultivationFallback.vue';
import {lifespanGuidance} from './lifespan-guidance';
import TrialCatalogue from './TrialCatalogue.vue';
import {narrativeFor,type Reading} from './story-pages';
import ReviewPages from './ReviewPages.vue';
import {nextStep} from './play-flow';
import {trialGuidance} from './trial-goal';
import {trialReturnView} from './trial-return';
import TrialReturnChoices from './TrialReturnChoices.vue';
import {NPC_PORTRAITS,SCENE_ASSETS,DESKTOP_UI_ASSETS,PANEL_MATERIAL_ASSETS,sceneAssetPath} from './assets';
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
import LocalExperiencePanel from './LocalExperiencePanel.vue';
import {useSession} from './session';
import MilestoneReview from './MilestoneReview.vue';
import {useMilestoneReview,type PreparedMilestone} from './milestone-view';
import {isMilestoneAction} from '../../src/full/milestones.ts';
import {demoSpec} from '../../src/demo.ts';
import {normalLink} from './demo-loader';
import {guidanceFor} from './guidance';
import GuidancePanel from './GuidancePanel.vue';
import CataloguePager from './CataloguePager.vue';
import GameConfirmDialog from './GameConfirmDialog.vue';
import {useGameConfirmation} from './use-game-confirmation';
const helpPage=ref(0);
import {journalAnchors,type JournalLedger,type JournalWrite} from './journal-anchors';

const session=useSession(),demoMenuView=ref<InstanceType<typeof DemoMenu>>();
const demoMenu=computed(()=>demoMenuView.value?.element);
const demoNode=session.kind==='demo'?demoSpec(session.node!.nodeId):null;
const ruleContent=useRuleContent(()=>store.game);
const store = useGame(), name = ref('顾长青'), tab = ref('修行'), batch = ref<number | 'target'>(1), quantity = ref(1);
provide('game-scene',store);
const {milestoneReview,milestoneStale,milestoneRetry,selectMilestone,inspectMilestone,closeMilestone,confirmMilestone:confirmMilestoneAction}=useMilestoneReview(store);
const uiLocked=computed(()=>store.busy||!store.available);
const pendingStoryError=computed(()=>store.unresolved);
const saveTone=computed(()=>!store.ready||store.busy?'pending':store.error||!store.available?'problem':store.game&&store.saved?'saved':'idle');
const saveDisplayLabel=computed(()=>store.saveLabel==='本次未保存'?'保存待确认':store.saveLabel);
const openingChoices=[{id:'help',name:'赠丹相助',detail:'结下赠药之缘'},{id:'trade',name:'以丹换简',detail:`获得剑简，剑修终结伤害 +${ruleContent.value.swordManual.damageBonus}`},{id:'leave',name:'保留丹药',detail:'保留回春丹，各自离开'}] as const;
const experience=useLocalExperience();let appActive=true;const stopObserving=store.observe(value=>{const observedNavigation=navigationRevision;if(['import','restore','restart','new_game'].includes(value.kind)){readingGeneration.value++;narrativeContext.value++;stageReturns.reset();journalWrites.value=[];}if(value.kind==='action'&&value.result&&value.operation&&store.game?.core.revision===value.result.revisionAfter){const run=store.game.core.runId,revision=value.result.revisionAfter,added=value.operation==='EVENT'?0:value.operation==='BATTLE'&&value.flags.includes('battle_won')?2:1;journalWrites.value=[...journalWrites.value.filter(w=>w.run!==run||w.revision!==revision),{run,revision,added}].slice(-100);}if(value.kind==='action'&&value.result&&store.game&&!value.replayed&&store.lastFromActivity&&store.activityOwned&&store.activity?.version===7&&store.activity.plan.action.type===value.operation&&store.activity.runId===store.game?.core.runId&&value.result.revisionAfter===store.game.core.revision&&((hubView.value==='current'&&value.operation==='CHOOSE'&&value.result.phaseBefore==='opening'&&value.result.phaseAfter==='idle')||(hubView.value==='cultivation'&&value.operation==='BREAKTHROUGH'&&value.result.delta.realm.before!==value.result.delta.realm.after)||(hubView.value==='trial-preparation'&&value.operation==='START_TRIAL'&&value.result.phaseBefore==='idle'&&value.result.phaseAfter==='trial-question')))selectTab('修行');focusObserved(value,observedNavigation);experience.record(value);},experience.fault);onScopeDispose(()=>{appActive=false;stopObserving();});
const collectionTarget = ref<CollectionTarget | null>(null), highlight = ref('');
const trainingInspectionPlan=shallowRef<CultivationPlan|null>(null);
const sourceInspectionPlan=shallowRef<SourcePlan|null>(null);
const productionInspectionPlan=shallowRef<CraftPlan|ForgePlan|null>(null);
const preparationInspectionPlan=shallowRef<PreparationPlan|null>(null),preparationInspectionSaved=ref(false),preparationInspectionExact=ref(true);
const adventureInspectionPlan=shallowRef<AdventurePlan|null>(null),adventureInspectionSaved=ref(false),activityPlanVisible=ref(false);
watch(()=>store.activity?.id,()=>activityPlanVisible.value=false);
const producing=computed(()=>!!store.activity&&store.activity.status!=='stopped'&&(store.activity.plan.kind==='craft'||store.activity.plan.kind==='forge'));
const equipmentOpen=ref(false),resumeVisible=ref(false),hubView=ref('home');
const hubEntries=[{id:'forge',label:'丹炉',kind:'item',icon:'healing_pill'},{id:'skills',label:'功法',kind:'skill',icon:'sword_mind'},{id:'relics',label:'法宝',kind:'relic',icon:'cloud_mirror'},{id:'life',label:'生平',kind:'action',icon:'export'},{id:'goal',label:'目标',kind:'action',icon:'save'},{id:'help',label:'帮助',kind:'action',icon:'help'}] as const;
let navigationRevision = 0;
const detailViews=new Set(['cultivation','goal','character','receipt','activity','journey','tradeoffs','recovery','market','trial-preparation']);
const stageReturns=useStageReturns(()=>({view:hubView.value,tab:tab.value}),()=>focus.capture());
const {detailParent,readingReturn}=stageReturns;
const clearFlowReturns=stageReturns.clearFlow;
const rememberHubOrigin=stageReturns.remember;
const captureStageReturn=stageReturns.captureDetail;
const tradeoffKind=ref<ProgressionKind>('cultivation'),tradeoffSeed=ref<ProgressionVariant>('natural'),tradeoffEntry=ref(0);
const narrativeContext=ref(0),readingGeneration=ref(0);
const journalWrites=shallowRef<JournalWrite[]>([]);
function clearInspections(){trainingInspectionPlan.value=null;sourceInspectionPlan.value=null;productionInspectionPlan.value=null;preparationInspectionPlan.value=null;preparationInspectionSaved.value=false;preparationInspectionExact.value=true;adventureInspectionPlan.value=null;adventureInspectionSaved.value=false;}
function selectTab(next: string) { stageReturns.reset();clearInspections();navigationRevision++; resumeVisible.value=false; tab.value = next;hubView.value=({'修行':'home','历练':'explore','行囊':'inventory','仙缘':'fate'} as Record<string,string>)[next]??'home'; return navigationRevision; }
const preparation = shallowRef<Action | null>(null);
const fontScale = computed({get:()=>experience.preferences.value.fontScale,set:(value:1|1.5|2)=>{void experience.setPreferences({fontScale:value});}}), reduceMotion = computed({get:()=>experience.preferences.value.reduceMotion,set:(value:boolean)=>{void experience.setPreferences({reduceMotion:value});}}), settingsView = ref<InstanceType<typeof GameSettings>>();
const settings=computed(()=>settingsView.value?.element);
const settingsButton=ref<HTMLButtonElement>(),contentPanel=ref<HTMLElement>(),navHeight=ref(0);
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
const hubTitle=computed(()=>['skills','relics'].includes(hubView.value)&&equipmentSection.value?({school:'修法 · 剑符择道',skills:'功法 · 研习与配装',relics:'法宝 · 炼制与装备',manual:'剑简 · 参悟与研习',summary:'配装 · 三法一器'} as Record<string,string>)[equipmentSection.value]:({tradeoffs:'行前取舍 · 当前一段',activity:'本段活动 · 成果与停止',market:'坊市 · 货架与取舍',recovery:'药匣 · 恢复与疗养',journey:'突破筹备 · 下一步',explore:'历练 · 云岚山海',inventory:'行囊 · 随身物资',forge:'丹炉 · 择方温炉',skills:'功法 · 研习与配装',relics:'法宝 · 炼制与装备',life:'修仙生平',goal:'目标与筹备',fate:'仙缘 · 人物与手记',cultivation:ruleContent.value.realms[game.value?.core.player.realm??'mortal'].name+'修行','trial-preparation':'登仙 · 行前核对',current:(game.value?narrativeFor(game.value)?.title:null)??(game.value?.battle?ruleContent.value.enemies[game.value.battle.enemy].name:trialView.value?.title??'仙缘 · 人物与手记'),trial:'渡劫行程与续行',battle:'术法说明与战报',receipt:'本次行动结算',character:'道者 · 寿元与配装'} as Record<string,string>)[hubView.value]??'行道详情');
const equipmentReading=shallowRef({runId:'',section:''});
const equipmentEntry=ref(0);
const equipmentSection=computed(()=>equipmentReading.value.runId===game.value?.core.runId?equipmentReading.value.section:'');
const preferHomeNavigation=ref(false);
watch(()=>store.activity?.id,()=>preferHomeNavigation.value=false);
function selectPrimaryTab(next:string){browseDirect();preferHomeNavigation.value=next==='修行';return selectTab(next);}
function openPrimaryFeature(view:string,event?:Event){browseDirect();if(view==='skills'||view==='relics')equipmentEntry.value++;return openHub(view,event);}
const navigationView=computed(()=>{
 const view=detailViews.has(hubView.value)?detailParent.value?.view??hubView.value:hubView.value;
 if(view==='current')return game.value?.battle||game.value?.trial?'explore':'fate';
 if(view==='home'&&(game.value?.battle||game.value?.trial))return'explore';
 const activity=store.activity;
 if(view==='home'&&!preferHomeNavigation.value&&activity?.version===6&&activity.runId===game.value?.core.runId&&activity.gameRevision===game.value?.core.revision&&activity.plan.kind!=='travel')return'explore';
 if(view==='home'&&phase.value==='event')return'fate';
 return ['skills','relics'].includes(view)?equipmentSection.value==='relics'?'relics':'skills':view;
});
const receiptAll=ref(false);
const trialReadMode=ref<'required'|'checkpoint'>('required');
async function openHub(view:string,event?:Event,trialMode:'required'|'checkpoint'='required'){
 trialReadMode.value=trialMode;
 if(view==='receipt')receiptAll.value=!!store.activity&&store.activity.completedCycles>0&&!store.lastResult;
 if(view==='help'){await showGameplayHelp();return null;}
 const detail=immersive.value&&detailViews.has(view);
 stageReturns.enter(view,detail,event);
 const independent=['goal','receipt','character'].includes(view);
 const owner=detail?++navigationRevision:selectTab(independent?tab.value:view==='inventory'||view==='forge'?'行囊':view==='life'||view==='fate'?'仙缘':view==='explore'?'历练':'修行');
 hubView.value=view;
 if(view==='skills'||view==='relics')equipmentOpen.value=true;
 if(view==='life')lifeOpen.value=true;
 await nextTick();
 if(owner!==navigationRevision)return null;
 if(!document.querySelector('dialog[open]'))focus.target(document.getElementById('feature-title'));
 return owner;
}
async function closeHub(){
 const {back,opener,id}=stageReturns.consume(game.value?.core.runId,narrativeContext.value);
 if(back){navigationRevision++;hubView.value=back.view;tab.value=back.tab;}else selectTab('修行');await nextTick();
 if(document.querySelector('dialog[open]'))return;
 const candidate=visibleFocusTarget(opener)?opener:id?document.querySelector<HTMLElement>(`[data-testid="${CSS.escape(id)}"]`):null;
 focus.target(visibleFocusTarget(candidate)?candidate:document.querySelector<HTMLElement>('[data-testid=hub-current]'));
}
function featureKey(event:KeyboardEvent){if(event.key==='Escape'&&singleScreen.value&&hubView.value!=='home'&&!document.querySelector('dialog[open]')){event.preventDefault();void closeHub();}}
onMounted(()=>document.addEventListener('keydown',featureKey));onScopeDispose(()=>document.removeEventListener('keydown',featureKey));
function currentContent(){return [...document.querySelectorAll<HTMLElement>('.catalogue-view .play-catalogue')].find(visibleFocusTarget)??(visibleFocusTarget(contentPanel.value??null)?contentPanel.value??null:null);}
const focus=useFocus(()=>currentContent()??settingsButton.value??null);
provide(gameFocusKey,focus);
const confirmation=useGameConfirmation({focus,appearance:()=>({fontScale:fontScale.value,reduceMotion:reduceMotion.value})});
function confirmationSource(){
 const key=()=>JSON.stringify([core.value?.runId??null,core.value?.revision??0,store.activity?.id??null,store.activity?.revision??null,store.activity?.ownerId??null,store.syncEpoch]);
 // navigationRevision also advances on ordinary input; modal return tracks the actual view.
 const viewKey=()=>JSON.stringify([hubView.value,tab.value,detailParent.value?.view??null,detailParent.value?.tab??null]);
 const original=key(),view=viewKey(),run=core.value?.runId??null;
 return{current:()=>appActive&&key()===original&&viewKey()===view,mayReturn:()=>appActive&&(core.value?.runId??null)===run&&viewKey()===view};
}
function confirmationBlocked(){return store.busy?'当前行动正在保存，请先等保存落定。':!store.available?'存档当前不可写，请先重新读取。':store.unresolved?'上次行动尚未落定，请先重试或核对原结果。':'';}
const {importNotice,exportError,importFile,exportSave,exportRaw,reset,restore,exportLife}=useSaveControls(store,session,confirmation,name,{
 source:confirmationSource,blocked:confirmationBlocked,settings:()=>settings.value,importOpener:()=>importButton.value,
 completed:()=>{selectTab('修行');settings.value?.close();},
});
let pendingContentFocus:{owner:number;opener:Element|null}|null=null;
let beginningJourney:{owner:number;run:string;anchor:Element|null}|null=null;
type StageFocus={owner:number;sync:number;id:string;run:string;generation:number;ownerId:string;command:string;revision:number;action:string;target:'stage'|'life';anchor:Element|null;ready:boolean};
let pendingStageFocus:StageFocus|null=null;
function focusStillOwned(anchor:Element|null){const active=document.activeElement;return active===document.body||active===anchor||!visibleFocusTarget(active);}
function armStageFocus(review:PreparedMilestone,owner:number,sync:number,target:StageFocus['target']){
 const a=store.activity,m=review.intent.mutation;
 if(!appActive||owner!==navigationRevision||sync!==store.syncEpoch||store.error||!store.wasConfirmedFor(m.commandId,m.runId)||a?.version!==7||a.status!=='running'||a.runId!==m.runId||a.gameRevision!==m.expectedRevision||a.ownerId!==m.ownerId||!a.nextCommand||JSON.stringify(a.plan)!==JSON.stringify(review.intent.plan))return;
 const request:StageFocus={owner,sync,id:a.id,run:a.runId,generation:a.generation,ownerId:a.ownerId,command:a.nextCommand.commandId,revision:a.gameRevision,action:a.plan.action.type,target,anchor:focus.capture(),ready:false};
 pendingStageFocus=request;void nextTick(()=>{if(pendingStageFocus===request)request.anchor=focus.capture();});
}
async function confirmMilestone(retrying=false){const review=milestoneReview.value,owner=navigationRevision,sync=store.syncEpoch;await confirmMilestoneAction(retrying);if(!retrying&&review?.prepared&&review.plan.action.type==='CHOOSE'&&!milestoneReview.value)armStageFocus(review.prepared,owner,sync,'stage');}
function focusObserved(value:Parameters<typeof experience.record>[0],navigation:number){
 const create=beginningJourney,g=store.game,a=store.activity,r=store.lastResult,p=pendingStageFocus;
 if(create&&create.owner===navigation&&value.kind==='new_game'&&!value.replayed&&value.commandId&&value.runId===g?.core.runId&&store.wasConfirmedFor(value.commandId,value.runId))create.run=value.runId;
 if(p&&p.owner===navigation&&value.kind==='action'&&!value.replayed&&!store.lastReplayed&&store.lastFromActivity&&store.activityOwned&&a?.version===7&&a.id===p.id&&a.generation===p.generation&&a.ownerId===p.ownerId&&a.runId===p.run&&a.completedCycles===1&&a.status==='stopped'&&r?.commandId===p.command&&r.runId===p.run&&r.type===p.action&&value.operation===p.action&&r.revisionBefore===p.revision&&r.revisionAfter===g?.core.revision&&g.core.revision===p.revision+1){
  p.ready=true;p.owner=navigationRevision;void deliverStageFocus();
 }
}
function ownsStageFocus(p:StageFocus){const a=store.activity,g=store.game;return appActive&&!document.hidden&&p.owner===navigationRevision&&p.sync===store.syncEpoch&&g?.core.runId===p.run&&a?.id===p.id&&a.generation===p.generation&&a.ownerId===p.ownerId&&!store.error&&!store.lastReplayed&&!store.activityPausing&&a.status!=='paused'&&(!p.ready||g.core.revision===p.revision+1&&a.status==='stopped'&&a.completedCycles===1);}
async function deliverStageFocus(){
 const p=pendingStageFocus;if(!p)return;
 if(!ownsStageFocus(p)){pendingStageFocus=null;return;}
 if(!p.ready||store.busy||!store.saved||!store.available)return;
 pendingStageFocus=null;await nextTick();
 if(!ownsStageFocus(p)||store.busy||!store.saved||!store.available||document.querySelector('dialog[open]'))return;
 const returnedToContent=p.target==='life'&&!visibleFocusTarget(p.anchor)&&document.activeElement===currentContent();
 if(!focusStillOwned(p.anchor)&&!returnedToContent)return;
 if(p.target==='life'){const title=[...document.querySelectorAll<HTMLElement>('[data-testid=life-title]')].find(visibleFocusTarget);if(title)focus.target(title);else await showLife();}else focusContent();
}
watch(()=>[store.activity,store.game,store.busy,store.error,store.syncEpoch,store.activityPausing,store.lastReplayed]as const,deliverStageFocus,{flush:'post'});
function focusContent(){const target=currentContent()??document.getElementById('welcome-content');if(target){pendingContentFocus=null;focus.target(target);}else pendingContentFocus={owner:navigationRevision,opener:document.activeElement};}
function cancelPendingContentFocus(){pendingContentFocus=null;pendingStageFocus=null;beginningJourney=null;navigationRevision++;}
onMounted(()=>{document.addEventListener('pointerdown',cancelPendingContentFocus,true);document.addEventListener('keydown',cancelPendingContentFocus,true);});
onScopeDispose(()=>{document.removeEventListener('pointerdown',cancelPendingContentFocus,true);document.removeEventListener('keydown',cancelPendingContentFocus,true);pendingContentFocus=null;pendingStageFocus=null;beginningJourney=null;});
watch([()=>store.ready,()=>contentPanel.value],async()=>{if(!pendingContentFocus)return;await nextTick();const request=pendingContentFocus,target=currentContent()??document.getElementById('welcome-content');if(!request||!target)return;pendingContentFocus=null;if(appActive&&request.owner===navigationRevision&&document.activeElement===request.opener)focus.target(target);},{flush:'post'});
function showSettings(event?:Event){const records=settings.value?.querySelector<HTMLDetailsElement>('[data-testid=local-records-panel]');if(records)records.open=false;focus.open(settings.value,event?.currentTarget instanceof HTMLElement?event.currentTarget:settingsButton.value??focus.capture());}
async function showDemoMenu(event?:Event){const opener=settings.value?.open?settingsButton.value??null:event?.currentTarget instanceof HTMLElement?event.currentTarget:focus.capture();settings.value?.close();await nextTick();focus.open(demoMenu.value,opener);}
async function initialiseGame(){if(store.busy)return;await store.init();if(appActive)resumeVisible.value=session.kind==='normal'&&!!store.game&&store.available;if(appActive&&session.kind==='demo'&&store.available&&!store.game&&!store.busy)await store.importText(JSON.stringify(session.node!.game));}
function focusRegion(id:string){if(id==='goal-panel'&&singleScreen.value&&hubView.value!=='goal'){void openHub('goal');return;}focus.target(document.getElementById(id));}
function focusPrimary(){navigationRevision++;focus.target(currentContent()?.querySelector<HTMLElement>('[data-primary-region]')??currentContent());}
const game = computed(() => store.game), core = computed(() => game.value?.core);
let journalLedger:JournalLedger|undefined,journalGeneration=-1;
const journalKeys=computed(()=>{const g=game.value,generation=readingGeneration.value;if(!g)return[];if(generation!==journalGeneration){journalLedger=undefined;journalGeneration=generation;}journalLedger=journalAnchors(journalLedger,g.journal,g.core.runId,g.core.revision,journalWrites.value);return journalLedger.keys;});
function journalKey(index:number){return journalKeys.value[(game.value?.journal.length??0)-1-index]??'missing-reading';}
const tracking = useTracking(game);
const trialView=computed(()=>game.value?trialGuidance(game.value):null);
const step=computed(()=>game.value?nextStep(game.value):null);
const needsPreparation=computed(()=>step.value?.kind==='prepare');
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
 const owner=navigationRevision;await closeHub();await nextTick();if(navigationRevision!==owner+1)return;
 const stage=document.querySelector<HTMLElement>('[data-testid=hub-current]');
 focus.target(stage?.querySelector<HTMLElement>('button.primary:not(:disabled),button.cultivate-primary:not(:disabled)')??stage);
}

const lifeBook=ref<{manage():void}>();
const lifeState=computed(()=>game.value?lifespanGuidance(game.value):null);
async function inspectLifespan(event:Event){const owns=inspectionOwner();const owner=await showLife(event);if(owns(owner??null))lifeBook.value?.manage();}
const hubGoal=computed(()=>game.value?getTrackedGoal(game.value,tracking.target.value):null);
const hudGoalContext=computed(()=>{const g=game.value,o=hubGoal.value;return g&&o&&!lifeState.value?.hint?{runId:g.core.runId,revision:g.core.revision,goal:o}:null;});
const hubGoalHint=computed(()=>{if(tracking.target.value.kind==='breakthrough'&&trialView.value)return trialView.value.state;const g=hubGoal.value;if(!g)return'';if(g.completed)return'目标已达成';const d=g.deficits.find(d=>d.kind==='xp')??g.deficits.find(d=>d.kind==='item')??g.deficits[0];if(!d)return g.preview?.failure?.message??'准备已齐，可核对行动。';const label=d.kind==='item'?ruleContent.value.items[d.id!].name:({stones:'灵石',mp:'灵力',months:'余寿游戏月',xp:'修为',hp:'气血'}as const)[d.kind];return`尚缺${label} ${d.missing}${g.deficits.length>1?'（另 '+(g.deficits.length-1)+' 项）':''}`;});
function selectTracking(target:Parameters<typeof tracking.select>[0]){navigationRevision++;tracking.select(target);}
watch([() => tracking.target.value, () => game.value?.core.runId], () => { collectionTarget.value = null; highlight.value = ''; });
watch(() => game.value?.core.player.realm, () => { if (tracking.target.value.kind === 'breakthrough') { collectionTarget.value = null; highlight.value = ''; } });
const realm = computed(() => ruleContent.value.realms[core.value?.player.realm ?? 'mortal']);
const location = computed(() => C.locations[core.value?.world.location ?? 'wilderness']);
const phase = computed(() => game.value ? gamePhase(game.value) : null);
watch([()=>game.value?.core.runId,()=>phase.value,()=>game.value?.core.activeEvent?.instanceId,()=>store.syncEpoch],()=>{narrativeContext.value++;stageReturns.clearReading();},{flush:'sync'});
const equipmentVisible=computed(()=>tab.value==='修行'&&(!singleScreen.value&&phase.value!=='opening'||singleScreen.value&&['skills','relics'].includes(hubView.value))&&game.value?.status==='active');
const needsSchool=computed(()=>!!game.value&&phase.value==='idle'&&C.rank(game.value.core.player.realm)>=C.rank('qi')&&!game.value.school);
watch(()=>game.value?.core.runId,()=>{if(beginningJourney&&!beginningJourney.run&&beginningJourney.owner===navigationRevision)beginningJourney.owner++;pendingStageFocus=null;navigationRevision++;clearFlowReturns();clearInspections();collectionTarget.value=null;highlight.value='';stageReturns.reset();equipmentOpen.value=needsSchool.value;resumeVisible.value=false;},{flush:'sync'});
watch(()=>store.syncEpoch,clearFlowReturns,{flush:'sync'});
watch([()=>store.activity?.id,()=>store.syncEpoch],()=>{trainingInspectionPlan.value=null;sourceInspectionPlan.value=null;productionInspectionPlan.value=null;preparationInspectionSaved.value=false;adventureInspectionSaved.value=false;});
// Read-only inspection belongs to a life/navigation, and to the selected activity when saved.
// Do not fence on revisions: a normal cycle or pause must preserve the draft.
function inspectionOwner(activityId?:string){const runId=game.value?.core.runId,sync=store.syncEpoch;return(owner:number|null)=>owner!==null&&appActive&&navigationRevision===owner&&game.value?.core.runId===runId&&store.syncEpoch===sync&&(activityId===undefined||store.activity?.id===activityId);}

watch(needsSchool,value=>{if(value)equipmentOpen.value=true;},{immediate:true});
async function startJourney(){
 const request={owner:++navigationRevision,run:'',anchor:focus.capture()};beginningJourney=request;await store.start(name.value);
 if(beginningJourney!==request)return;beginningJourney=null;
 if(store.error||!game.value||request.run!==game.value.core.runId||request.owner!==navigationRevision)return;
 await nextTick();if(request.owner===navigationRevision&&!document.querySelector('dialog[open]')&&focusStillOwned(request.anchor))focusRegion('opening-actions');
}
async function showEquipment(event?:Event){rememberHubOrigin(event);const opener=stageReturns.opener,owner=selectTab('修行');if(singleScreen.value)hubView.value='skills';equipmentOpen.value=true;await nextTick();if(owner===navigationRevision&&!document.querySelector('dialog[open]')&&(document.activeElement===opener||document.activeElement===document.body))focus.target(document.querySelector<HTMLElement>('[data-testid="equipment-panel"]'));}
async function showBreakthroughGoal(){captureStageReturn('goal');const opener=focus.capture();selectTracking({kind:'breakthrough'});if(singleScreen.value)hubView.value='goal';const owner=navigationRevision;await nextTick();if(owner===navigationRevision&&!document.querySelector('dialog[open]')&&(document.activeElement===opener||document.activeElement===document.body))focusRegion('goal-panel');}
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
const goal = computed(() => game.value ? getBreakthroughGoal(game.value) : null);
const journey = computed(() => game.value ? getTrialJourney(game.value) : null);
const overview = computed(() => game.value ? getLifeOverview(game.value) : null);
const lifeOpen = ref(false), lifeSection = ref<HTMLDetailsElement>();
const {quote,can,why,cost}=useActionView(store);
function choiceDetails(action:Action,detail:string){const p=quote(action);return [{label:'即刻代价',value:formatCosts(p?.actualCosts??p?.costs??null)},{label:'已知结果',value:detail},{label:'预计变化',value:p?.delta?formatDelta(p.delta):'条件未满足，当前不会执行'},{label:'当前条件',value:why(action)||'可选择；由你确认后执行'}];}
function viewReceipt(){if(store.activity?.version===7&&store.activity.stopReason?.code!=='STATE_CHANGED')return inspectMilestone(store.activity);return openHub('receipt');}
const stoppedTraining = computed(()=>store.activity?.status==='stopped'&&store.activity.stopReason?.code!=='STATE_CHANGED');
function act(action: Action) { resumeVisible.value=false;if(action.type==='TRAVEL')return travel(action.location);if(action.type==='BATTLE')return battle(action.move);if(action.type==='ENCOUNTER')return inspectAdventure(action.enemy);if(action.type==='CULTIVATE'){const n=action.count??1;return startTraining({kind:'cultivation',method:action.method,maxCycles:n,until:'cycles',stoneBudget:action.method==='natural'?0:Math.min(core.value?.player.stones??0,(quote({...action,count:1})?.costs?.stones??0)*n),stoneReserve:0});}if(action.type==='SOURCE'){const n=action.count??1,source=ruleContent.value.sources[action.sourceId],target=action.target?{kind:'item' as const,id:action.target.item,quantity:action.target.quantity}:batch.value==='target'?collectionTarget.value:null;return startSource({kind:'source',sourceId:action.sourceId,maxCycles:n,until:target?'target':'cycles',target,monthBudget:n*source.months,remainingMonthsReserve:1});}if(action.type==='CRAFT'||action.type==='FORGE')return inspectProduction(action);if(['BUY','SELL','USE','REST','LEARN','STUDY'].includes(action.type))return inspectPreparation(action);if(action.type==='SCHOOL'||action.type==='EQUIP'||action.type==='EQUIP_RELIC')return inspectConfiguration(action);if(store.activityRunning){store.activityNotice='当前活动进行中，请先暂停再行动。';return;}if (action.type === 'START_TRIAL') return showTrialPreparation(); if (action.type === 'END') return reviewAscension(action.ending); if(isMilestoneAction(action))return selectMilestone(action); const owner=navigationRevision; return focus.afterAction(async()=>{await store.act(action);},()=>owner===navigationRevision); }
const {storyAct,quickInventory,browse:browseDirect}=useDirectActions(store,focus,confirmation,{
 owner:()=>navigationRevision,viewIdentity:()=>[hubView.value,tab.value,detailParent.value?.view,detailParent.value?.tab],
 source:confirmationSource,blocked:confirmationBlocked,openCurrent:()=>openHub('current'),regular:act,
});
function trackTrialMaterial(target:Parameters<typeof selectTracking>[0]){selectTracking(target);void openHub('goal');}
function retryOperation(){const owner=navigationRevision;return focus.afterAction(()=>store.retry(),()=>owner===navigationRevision);}
// The viewing intent belongs to the accepted trip, not to a timer or a later unrelated save.
let arrivalIntent:{id:string;runId:string;navigation:number;syncEpoch:number;location:C.LocationId;arrive:()=>void|Promise<void>}|null=null;
async function arrangeTravel(location:C.LocationId,arrive:()=>void|Promise<void>):Promise<void>{
 if(!game.value||store.busy||!store.available)return;
 if(game.value.core.world.location===location){await arrive();return;}
 if(pendingStoryError.value){store.activityNotice='请先重试或取消原安排；同步待核对时重新读取。';return;}
 if(store.activityRunning){store.activityNotice='当前活动进行中，请先暂停再行旅。';return;}
 arrivalIntent=null;const owner=++navigationRevision,sync=store.syncEpoch;
 await store.startPlannedActivity({kind:'travel',location,maxCycles:1});
 const a=store.activity;
 if(store.error||owner!==navigationRevision||store.syncEpoch!==sync||a?.version!==6||a.plan.kind!=='travel'||a.plan.location!==location||a.status!=='running')return;
 arrivalIntent={id:a.id,runId:a.runId,navigation:owner,syncEpoch:sync,location,arrive};
}
watch(()=>[store.activity,game.value,store.error,store.activityOwned,store.busy,store.syncEpoch,store.activityPausing] as const,()=>{
 const pending=arrivalIntent;if(!pending)return;
 const a=store.activity,g=game.value;
 if(store.activityPausing||!g||store.syncEpoch!==pending.syncEpoch||g.core.runId!==pending.runId||navigationRevision!==pending.navigation||a?.id!==pending.id||!store.activityOwned||store.error||a.status==='paused'){arrivalIntent=null;return;}
 if(a.status!=='stopped'||store.busy)return;
 arrivalIntent=null;
 if(a.completedCycles===1&&g.core.world.location===pending.location)void pending.arrive();
},{flush:'post'});
async function travel(id:C.LocationId){return arrangeTravel(id,()=>{selectTab(id==='cave'?'修行':'历练');});}
async function inspectAdventure(enemy:string){const owns=inspectionOwner();highlight.value='';const owner=await openHub('explore');await nextTick();if(owns(owner))highlight.value='encounter-'+enemy;}
async function startAdventure(plan:AdventurePlan){
 resumeVisible.value=false;adventureInspectionPlan.value=null;adventureInspectionSaved.value=false;
 const owner=navigationRevision;await store.startPlannedActivity(plan);
 if(!store.error&&owner===navigationRevision&&plan.kind!=='travel'){selectTab('修行');}
}
const defaultTraining:CultivationPlan={kind:'cultivation',method:'natural',maxCycles:50,until:'xp-cap',stoneBudget:0,stoneReserve:0};
const hubTrainingMethod=ref<'natural'|'assisted'>('natural');
watch(()=>game.value?.core.runId,()=>hubTrainingMethod.value='natural');
async function startTraining(plan:CultivationPlan=defaultTraining){
 if(pendingStoryError.value)return;
 resumeVisible.value=false;trainingInspectionPlan.value=null;
 const from=singleScreen.value&&hubView.value==='cultivation',owner=navigationRevision,owns=inspectionOwner(),previous=store.activity?.id,signature=JSON.stringify(plan),anchor=focus.capture();
 await store.startCultivation(plan);
 const a=store.activity,r=store.activityRuntime,g=game.value;
 if(!from||!owns(owner)||document.hidden||store.error||!store.saved||!store.available||store.busy||store.activityPausing||a?.version!==1||a.status!=='running'||a.id===previous||!store.activityOwned||a.runId!==g?.core.runId||a.gameRevision!==g?.core.revision||r?.id!==a.id||r.generation!==a.generation||JSON.stringify(a.plan)!==signature)return;
 hubTrainingMethod.value=a.plan.method;const current=inspectionOwner(a.id),next=selectTab('修行');await nextTick();
 if(current(next)&&!document.hidden&&!store.error&&!store.activityPausing&&store.activity?.status==='running'&&store.activity.generation===a.generation&&store.activityRuntime?.id===a.id&&store.activityRuntime.generation===a.generation&&store.activityOwned&&focusStillOwned(anchor))focus.target(document.querySelector<HTMLElement>('[data-testid=cultivation-active-pause]'));
}
function startSource(plan:SourcePlan){resumeVisible.value=false;sourceInspectionPlan.value=null;return store.startPlannedActivity(plan);}
async function viewActivityPlan(){
 const activity=store.activity;if(!activity)return;if(activity.version===7){inspectMilestone(activity);return;}
 const plan=structuredClone(activity.plan),owns=inspectionOwner(activity.id);
 if(isPreparationPlan(plan)){await inspectPreparationPlan(plan,true);return;}
 if(plan.kind==='battle'&&(!game.value?.battle||game.value.battle.enemy!==plan.enemy||(game.value.trial?.stage??null)!==plan.trialStage)||plan.kind==='encounter'&&ruleContent.value.enemies[plan.enemy].location!==game.value?.core.world.location){const owner=await openHub('activity');if(owns(owner))activityPlanVisible.value=true;return;}
 const view=plan.kind==='cultivation'?'cultivation':plan.kind==='source'?'explore':plan.kind==='craft'?'forge':plan.kind==='forge'?'relics':isAdventurePlan(plan)?plan.kind==='battle'?'home':'explore':'cultivation';
 highlight.value='';const owner=await openHub(view);if(!owns(owner))return;
 if(plan.kind==='cultivation')trainingInspectionPlan.value=plan;
 else if(plan.kind==='source'){collectionTarget.value=plan.target;sourceInspectionPlan.value=plan;await nextTick();if(owns(owner))highlight.value='source-'+plan.sourceId;}
 else if(plan.kind==='craft'||plan.kind==='forge'){productionInspectionPlan.value=plan;await nextTick();if(owns(owner))highlight.value=plan.kind==='craft'?'craft-'+plan.recipeId:'forge-'+plan.relicId;}
 else if(isAdventurePlan(plan)){adventureInspectionPlan.value=plan;adventureInspectionSaved.value=true;if(plan.kind!=='battle')highlight.value=plan.kind==='travel'?'travel-'+plan.location:'encounter-'+plan.enemy;}
}
function startProduction(plan:CraftPlan|ForgePlan|PreparationPlan){if(isPreparationPlan(plan))return startPreparation(plan);resumeVisible.value=false;productionInspectionPlan.value=null;return store.startPlannedActivity(plan);}
async function inspectProduction(action:Extract<Action,{type:'CRAFT'|'FORGE'}>){const owns=inspectionOwner();highlight.value='';const owner=await openHub(action.type==='CRAFT'?'forge':'relics');await nextTick();if(owns(owner))highlight.value=action.type==='CRAFT'?'craft-'+action.recipeId:'forge-'+action.relic;}
async function moveProduction(plan:CraftPlan|ForgePlan){const draft=structuredClone(plan),id=draft.kind==='craft'?'craft-'+draft.recipeId:'forge-'+draft.relicId;return navigate({location:'cave',tab:draft.kind==='craft'?'行囊':'修行',focusId:id},()=>{productionInspectionPlan.value=draft;});}
async function trackProduction(target:Parameters<typeof selectTracking>[0]){selectTracking(target);await openHub('goal');}
function startPreparation(plan:PreparationPlan){resumeVisible.value=false;preparationInspectionPlan.value=null;return store.startPlannedActivity(plan);}
function preparationView(plan:PreparationPlan){return plan.kind==='learn'||plan.kind==='study'?'skills':plan.kind==='buy'||plan.kind==='sell'?'market':'recovery';}
async function inspectPreparationPlan(plan:PreparationPlan,saved=false,exact=true){
 const owns=inspectionOwner(saved?store.activity?.id:undefined),draft=structuredClone(plan);
 highlight.value='';const owner=await openHub(preparationView(draft));if(!owns(owner))return;preparationInspectionExact.value=exact;preparationInspectionPlan.value=draft;preparationInspectionSaved.value=saved;await nextTick();
 if(!owns(owner))return;highlight.value=plan.kind==='learn'?'learn-'+plan.skills[0]:plan.kind==='study'?'study-manual':plan.kind==='rest'?'recovery-rest':(plan.kind==='use'?'recovery-':'market-item-')+plan.item;
}
function inspectPreparation(action:Action){
 let plan:PreparationPlan;
 if(action.type==='LEARN')plan={kind:'learn',skills:[action.skill],maxCycles:1,stoneBudget:ruleContent.value.skills[action.skill].price,stoneReserve:0};
 else if(action.type==='STUDY')plan={kind:'study',manual:'jinghong',maxCycles:1,stoneBudget:ruleContent.value.swordManual.price,stoneReserve:0};
 else if(action.type==='BUY')plan={kind:'buy',item:action.item,maxCycles:action.quantity,until:'cycles',targetQuantity:null,stoneBudget:ruleContent.value.items[action.item].buy!*action.quantity,stoneReserve:0};
 else if(action.type==='SELL')plan={kind:'sell',item:action.item,maxCycles:action.quantity,itemReserve:0};
 else if(action.type==='USE'&&(action.item==='healing_pill'||action.item==='spirit_pill'))plan={kind:'use',item:action.item,maxCycles:3,targetPercent:100,itemReserve:0};
 else if(action.type==='REST')plan={kind:'rest',maxCycles:1,remainingMonthsReserve:1};
 else return;
 return inspectPreparationPlan(plan,false,false);
}
async function movePreparation(plan:PreparationPlan){
 const draft=structuredClone(plan),location:C.LocationId=draft.kind==='learn'||draft.kind==='study'?'sect':draft.kind==='buy'||draft.kind==='sell'?'market':'cave';
 return arrangeTravel(location,()=>inspectPreparationPlan(draft));
}
const {configurationError,configurationIntent,configurationSnapshot,configurationStale,configurationRetry,inspectConfiguration,closeConfiguration,refreshConfiguration,confirmConfiguration}=useConfigurationReview(store);
const recoveryNeeded=computed(()=>!!quote({type:'REST'})?.allowed);
const trialReturn=computed(()=>game.value?trialReturnView(game.value,store.hasCheckpoint?store.checkpointSummary:null,store.trialRecovery,store.ready&&store.available&&!store.busy&&!store.syncIssue&&!(store.warning&&!store.hasCheckpoint)):null);
const cultivationHome=computed(()=>!!game.value&&phase.value==='idle'&&tab.value==='修行'&&core.value?.world.location==='cave');
const worldArt=computed(()=>game.value?sceneAssetPath(scenePresentation(game.value),cultivationHome.value&&!producing.value&&!['home','cultivation','goal','journey'].includes(hubView.value)):undefined);
function focusCultivation(){focus.target(document.getElementById('cultivation-actions'));}
const breakthrough = computed<Action>(() => ({ type: core.value?.player.realm === 'spirit' ? 'START_TRIAL' : 'BREAKTHROUGH' }));
const primaryBreakthrough=computed(()=>cultivationHome.value&&(core.value?.player.realm==='spirit'?core.value.player.xp>=realm.value.xpCap:!!quote(breakthrough.value)?.allowed));
const breakthroughLabel=computed(()=>core.value?.player.realm==='mortal'?'引气入体':core.value?.player.realm==='spirit'?'查看渡劫准备':'确认突破');
const caveGate=computed(()=>cultivationHome.value&&(primaryBreakthrough.value||needsPreparation.value)&&step.value?.kind!=='recover');
const caveThreshold=computed(()=>immersive.value&&core.value?.world.location==='cave'&&(caveGate.value&&!trialReturn.value?.choice||store.activity?.version===7&&store.activity.status!=='stopped'&&store.activity.plan.action.type==='BREAKTHROUGH'));
const activeStory = computed(() => game.value && core.value?.activeEvent && stories[core.value.activeEvent.id] ? getStoryContext(game.value, core.value.activeEvent.id) : null);
const relationships = computed(() => game.value ? getRelationships(game.value) : []);
async function navigate(request:NavigationRequest,arrived?:()=>void):Promise<void>{
 if(!game.value||store.busy||!store.available)return;
 if(game.value.core.world.location!==request.location)return arrangeTravel(request.location,()=>navigate(request,arrived));
 ++navigationRevision;
  const focusRevision = selectTab(request.tab); highlight.value = request.focusId ?? '';
  if(request.focusId&&/^(equipment-panel|school-|learn-|equip-|forge-|study-manual)/.test(request.focusId)){equipmentOpen.value=true;if(singleScreen.value)hubView.value=request.focusId.startsWith('forge-')?'relics':'skills';}if(singleScreen.value&&request.focusId?.startsWith('craft-'))hubView.value='forge';if(singleScreen.value&&request.tab==='修行'&&request.focusId?.startsWith('trial-'))hubView.value='trial-preparation';
  if(singleScreen.value&&/^(buy-|sell-)/.test(request.focusId??''))hubView.value='market';if(singleScreen.value&&request.focusId==='rest'){hubView.value='recovery';preparationInspectionPlan.value={kind:'rest',maxCycles:1,remainingMonthsReserve:1};}if(singleScreen.value&&request.focusId==='cultivation-actions'&&step.value?.kind==='recover')hubView.value='recovery';
  if (request.quantity) quantity.value = request.quantity;
  if (request.collection) {collectionTarget.value = request.collection;batch.value='target';}
  await nextTick();
  if (navigationRevision !== focusRevision) return;
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
async function showLife(event?:Event) {
  const run=game.value?.core.runId,context=narrativeContext.value;let owner:number;
  if(singleScreen.value&&game.value){stageReturns.enterReading(game.value.core.runId,context,event,settings.value?.open?settingsButton.value??null:undefined);owner=++navigationRevision;tab.value='仙缘';hubView.value='life';}else{rememberHubOrigin(event);owner=selectTab('仙缘');}settings.value?.close();lifeOpen.value = true;
  await nextTick();if(!appActive||owner!==navigationRevision||run!==game.value?.core.runId||context!==narrativeContext.value)return;const title=document.querySelector<HTMLElement>('[data-testid=life-title]');focus.target(title??lifeSection.value??currentContent());return owner;
}
async function showTrialPreparation() {
  if (core.value?.player.realm !== 'spirit') return;
  selectTab('修行');if(singleScreen.value)hubView.value='trial-preparation'; await nextTick();
  const heading = document.querySelector<HTMLElement>('[data-testid="trial-preparation-title"]');
  heading?.scrollIntoView({block:'start'}); heading?.focus({preventScroll:true});
}
const closureDecisions=ref<InstanceType<typeof ClosureDecisions>>();
const closureNavigation:ClosureNavigation={
 owner:()=>navigationRevision,
 leaveSettings:()=>{const opener=settings.value?.open?settingsButton.value??null:focus.capture();settings.value?.close();return opener;},
 accepted:(review,owner,sync,target)=>armStageFocus(review,owner,sync,target),
 showTrialPreparation,
};
const requestEnd=(type:'RETIRE'|'END_LIFE')=>closureDecisions.value?.requestEnd(type);
const reviewTrial=()=>closureDecisions.value?.reviewTrial();
const reviewAscension=(ending:AscensionEnding)=>closureDecisions.value?.reviewAscension(ending);
const requestTrialRestore=()=>closureDecisions.value?.requestTrialRestore();
const ascension=computed(()=>game.value?getAscensionChoices(game.value):null);
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
<main v-if="store.ready&&game&&core&&(hubMain||immersive&&game.battle)" v-show="hubMain" class="game-hub" :aria-busy="store.busy" data-testid="game-hub">
<CharacterPanel v-if="!immersive" :game="game" compact @inspect="openHub('character',$event)"/>
<section class="hub-stage" :class="{'hub-battle':!!game.battle,'hub-opening':phase==='opening'}" aria-label="游戏主舞台">
<ScenePanel v-if="!game.battle" :game="game" :meditation="cultivationHome&&!producing&&!immersive" :battle-stage="!!game.battle" :eyebrow="phase==='opening'?'山雨破庙':location.subtitle" :title="phase==='opening'?'雨中故人':location.name" description="一念尘缘起，千山共问道。" :passage="immersive" @inspect="viewActivityPlan"/>
<section ref="contentPanel" :id="hubMain?'game-content':undefined" class="paper hub-current" :class="{'hub-cultivating':phase==='idle'&&game.status==='active'&&core.world.location==='cave','art17-current':caveThreshold}" data-testid="hub-current" tabindex="-1" aria-label="当前内容">
<SealedLifeStage v-if="game.status!=='active'" :game="game" :busy="store.busy" :receipt="store.activity?.version===7&&store.activity.completedCycles>0&&store.activity.stopReason?.code!=='STATE_CHANGED'" @life="showLife" @export="exportSave" @settings="showSettings" @receipt="viewReceipt"/><template v-else-if="store.activity?.version===7&&store.activity.status!=='stopped'"><MilestoneGate v-if="['CHOOSE','BREAKTHROUGH','START_TRIAL'].includes(store.activity.plan.action.type)" :game="game" :kind="store.activity.plan.action.type==='CHOOSE'?'opening':store.activity.plan.action.type==='START_TRIAL'?'trial':'breakthrough'" :action="store.activity.plan.action" :class="{'art17-threshold':caveThreshold,'art33-opening':store.activity.plan.action.type==='CHOOSE'}"><template v-if="caveThreshold" #object="{source,phase,engaged,remaining,seconds}"><CaveThresholdObject :game="source" :phase="phase" :engaged="engaged" :remaining="remaining" :seconds="seconds" :failed="!!store.error" :enabled="store.available&&!store.busy" @inspect="openPreparation($event)" @navigate="inspectCaveDestination"/></template><template v-else-if="store.activity.plan.action.type==='CHOOSE'" #object="{source,phase,engaged,remaining,seconds,view}"><OpeningOffering :game="source" :phase="phase" :engaged="engaged" :remaining="remaining" :seconds="seconds" :view-title="view?.title" :status="store.activity?.status??'idle'" :failed="!!store.error" @inspect="viewActivityPlan"/></template><OpeningResponse v-if="store.activity.plan.action.type==='CHOOSE'" :game="game" :activity="store.activity" @inspect="viewActivityPlan"/><template v-else><p>本次已安排，读秒与停手在上方；保存后显示成果。</p><button @click="viewActivityPlan">查看原安排</button></template></MilestoneGate><TrainingActivity v-if="!immersive" :store="store" @settings="viewActivityPlan" @details="viewReceipt"/><button v-if="store.activity.status==='paused'" class="text-button" @click="openHub('current',$event)">重新查看当前抉择</button></template><template v-else-if="phase==='opening'"><MilestoneGate :game="game" kind="opening" class="art33-opening"><template #object="{source,phase,engaged,remaining,seconds,view}"><OpeningOffering :game="source" :phase="phase" :engaged="engaged" :remaining="remaining" :seconds="seconds" :view-title="view?.title" :failed="!!store.error" @inspect="openHub('current',$event)"/></template><div class="hub-opening-title"><div><span>破庙初遇 · 沈清禾</span><h2>一丹，一念。</h2></div></div><p class="story">山雨将歇，沈清禾向你求药。随身回春丹 ×{{core.inventory.healing_pill}}，要不要介入这段因果，由你决定。</p><div id="opening-actions" class="choices opening-choices" tabindex="-1" data-primary-region role="group" aria-label="破庙抉择"><ChoiceCard v-for="choice in openingChoices" :key="choice.id" :choice-id="choice.id" :label="choice.name" :disabled="!can({type:'CHOOSE',choice:choice.id})" :identity="core.runId+core.revision" :details="choiceDetails({type:'CHOOSE',choice:choice.id},choice.detail)" @choose="act({type:'CHOOSE',choice:choice.id})"><strong>核对 · {{choice.name}}</strong><small>{{cost({type:'CHOOSE',choice:choice.id})}}</small><small>{{choice.detail}}</small><small v-if="why({type:'CHOOSE',choice:choice.id})">{{why({type:'CHOOSE',choice:choice.id})}}</small></ChoiceCard></div><button class="text-button" @click="openHub('current',$event)">查看三种选择与剑简说明</button></MilestoneGate></template>
<BattlePanel v-else-if="game.battle" :active="hubMain" :game="game" :can="can" :cost="cost" :why="why" compact @move="battle" @start="startAdventure" @takeover="store.pauseCultivation" :activity="store.activity" :running="store.activityRunning" :busy="store.busy" :available="store.available" :saved-adventure-plan="adventureInspectionPlan" :plan-saved="adventureInspectionSaved" @details="openHub('battle',$event)"><template #activity><TrainingActivity v-if="!immersive&&store.activity?.version===6&&store.activity.status!=='stopped'" :store="store" compact @settings="viewActivityPlan" @details="viewReceipt"/></template></BattlePanel>
<CultivationHome v-else-if="phase==='idle'&&game.status==='active'&&core.world.location==='cave'" v-model:method="hubTrainingMethod" :immersive="immersive" :cultivation-home="cultivationHome" @open="openHub" @prepare="openPreparation" @destination="inspectCaveDestination" @act="act" @start="startTraining" @school="showEquipment" @life="inspectLifespan" @settings="showSettings" @inspect-plan="viewActivityPlan" @receipt="viewReceipt" @compare="openTradeoffs('cultivation',$event)"/>
<template v-else-if="phase==='idle'&&game.status==='active'"><TrainingActivity v-if="store.activity&&store.activity.status!=='stopped'&&!immersive" :store="store" @settings="viewActivityPlan" @details="viewReceipt"/><p v-if="immersive&&store.activity&&store.activity.status!=='stopped'">本次行动的进展与停手入口在上方。</p><template v-else-if="!store.activity||store.activity.status==='stopped'"><h2>{{location.name}}</h2><p class="story">{{location.description}}</p><div data-primary-region tabindex="-1" class="hub-idle-actions"><button v-if="core.player.realm==='spirit'" class="primary" data-testid="breakthrough" @click="showTrialPreparation" :disabled="uiLocked">查看渡劫准备</button><button v-if="needsPreparation" class="primary" data-testid="journey-prepare" @click="openPreparation($event)">{{step?.title}} →</button><button :class="core.player.realm==='spirit'||needsPreparation?'':'primary'" data-testid="return-cave" @click="travel('cave')" :disabled="!can({type:'TRAVEL',location:'cave'})">返回洞府修行<small>{{cost({type:'TRAVEL',location:'cave'})}} · {{ADVENTURE_CYCLE_MS.travel/1000}} 秒行旅 {{why({type:'TRAVEL',location:'cave'})}}</small></button><button data-testid="hub-cultivation-details" @click="openHub('cultivation',$event)">预算与成长</button><button @click="selectTab('历练')">取材与挑战</button></div></template></template>
<template v-else><h2>{{trialView?.title??(game.status==='active'?(activeStory?.name??(journey?'渡劫行程':'当前机缘')):overview?.title)}}</h2><p class="story">{{trialView?.detail??(game.status==='active'?'眼前的抉择尚待继续。查看资料不会推进游戏时间。':'此卷已收，来路犹存。')}}</p><div data-primary-region tabindex="-1"><button class="primary" @click="openHub(game.status==='active'?'current':'life',$event)">{{trialView?.verb??(game.status==='active'?'继续当前遭遇':'查看生平与收卷')}}</button></div></template>
<aside v-if="milestoneResult" class="milestone-handoff" data-testid="milestone-handoff" :data-sequence="milestoneResult.sequence"><strong>{{milestoneText}}</strong><small>{{milestoneDetail}}</small></aside>
</section>
</section>
<aside v-if="!immersive" class="hub-aside"><section class="paper hub-goal"><span class="section-label">当前目标</span><AssetImage class="hub-mountain-art" :path="PANEL_MATERIAL_ASSETS.mountains" asset-id="hub-goal-mountains" fit="contain" eager aria-hidden="true"/><h2 data-testid="hub-target">{{hubGoal?.title}}</h2><ProgressTrack v-if="tracking.target.value.kind==='breakthrough'&&realm.xpCap" :value="core.player.xp" :max="realm.xpCap" label="当前目标修为" :identity="core.runId+core.player.realm" hint="当前目标按已保存修为显示。进度满后，仍需核对突破材料和条件。"/><p data-testid="hub-gap">{{hubGoalHint}}</p><button data-testid="hub-goal-open" @click="openHub('goal',$event)">查看缺口与来源 →</button></section>
<nav class="hub-services" aria-label="修仙功能"><button v-for="entry in hubEntries" :key="entry.id" :data-testid="`hub-${entry.id}`" @click="openHub(entry.id,$event)"><GameIcon :kind="entry.kind" :id="entry.icon"/><span>{{entry.label}}</span></button></nav>
<section class="paper hub-recent" aria-live="polite"><span class="section-label">行道回响</span><TrainingActivity v-if="stoppedTraining" :store="store" summary @settings="viewActivityPlan" @details="viewReceipt"/><StageOutcome v-else :game="game" :result="store.lastResult" :busy="store.busy" :saved="store.saved" :available="store.available" :error="store.error" :sync-issue="store.syncIssue" :replayed="store.lastReplayed" :execution="store.execution" :followup="false" :next="step?.title??'查看当前目标'" @next="inspectNext()" @details="viewReceipt"/><div v-if="resumeVisible" class="hub-resume" data-testid="resume-strip"><span>已续上本机进度</span></div><button v-if="demoNode" class="text-button" @click="showDemoMenu">切换演示节点</button><button v-if="overview?.remainingMonths!==null&&overview?.remainingMonths!==undefined&&overview.remainingMonths<=12" class="text-button" @click="showLife">余寿 {{overview.remainingMonths}} 月 · 查看生平</button></section></aside>
</main>
<aside v-if="!immersive&&game&&game.status==='active'&&singleScreen&&!hubMain&&catalogueView" class="feature-state" data-testid="feature-state"><CharacterPanel :game="game" compact @inspect="openHub('character',$event)"/><TrainingActivity v-if="store.activity&&store.activity.status!=='stopped'" :store="store" compact @settings="viewActivityPlan" @details="viewReceipt"/><TrainingActivity v-else-if="stoppedTraining" :store="store" summary @settings="viewActivityPlan" @details="viewReceipt"/><StageOutcome v-else :game="game" :result="store.lastResult" :busy="store.busy" :saved="store.saved" :available="store.available" :error="store.error" :sync-issue="store.syncIssue" :replayed="store.lastReplayed" :execution="store.execution" :next="step?.title??'查看当前目标'" @next="inspectNext()" @details="viewReceipt"/></aside>
<main v-if="store.ready&&game && core" v-show="!hubMain" class="game-grid" :class="{'hub-feature':singleScreen}" :aria-busy="store.busy">
<header v-if="singleScreen" class="feature-header"><div><h2 id="feature-title" tabindex="-1">{{game.status==='active'?hubTitle:hubView==='goal'?'此卷历程':['current','fate'].includes(hubView)?'修仙生平':hubTitle}}</h2></div><div class="feature-actions"><FeatureMenu :identity="game.core.runId+':'+hubView" :guide="catalogueView&&guidanceEnabled&&!skippedGuides.includes(guidance.id)" :preparation="hubView!=='journey'&&phase==='idle'&&!!realm.pill" :goal="hubView!=='goal'" :blueprints="navigationGate(game,'relics').locked" :sealed="game.status!=='active'" @browse="browseDirect()" @guide="showCatalogueGuide()" @preparation="openPreparation()" @goal="openHub('goal')" @blueprints="openPrimaryFeature('relics')"/><button data-testid="hub-close" :aria-label="detailParent||hubView==='life'&&readingReturn?'返回原玩法':'返回主舞台'" @click="closeHub">{{detailParent||hubView==='life'&&readingReturn?'返回原处':'返回舞台'}} <GameIcon kind="action" id="close"/></button></div></header>
<section v-show="!hubMain&&(!singleScreen||!['goal','character'].includes(hubView))" class="center-column" :class="{'in-battle':game.battle&&!inspectingInventory}">
<ScenePanel v-if="!singleScreen" :meditation="cultivationHome&&!producing&&!immersive" :battle-stage="!!game.battle&&!inspectingInventory" :game="game" :eyebrow="phase==='opening'?'初遇 / 山雨破庙':location.subtitle" :title="phase==='opening'?'雨中故人':game.status==='ascended'?overview!.title:game.battle?location.name:activeStory?.name??location.name" :description="game.status==='ascended'?'此卷已收，来路犹存。':game.battle?'先辨来势，再决进退。':'山海不言，修行自有回响。'" :with-action="!cultivationHome&&(!game.battle||inspectingInventory)"><button v-if="!cultivationHome&&(!game.battle||inspectingInventory)" type="button" class="scene-action-link" data-testid="scene-action-jump" @click="focusPrimary">{{phase==='opening'?'前往抉择':'前往当前操作'}} ↓</button></ScenePanel>

<ActivityRecords :view="hubView" :single-screen="singleScreen" :immersive="immersive" v-model:original-plan="activityPlanVisible" v-model:all-receipts="receiptAll" @settings="viewActivityPlan" @details="viewReceipt"/>
<KeepAlive :max="2"><MarketPlanner :key="game.core.runId+'MarketPlanner'+hubView" v-if="singleScreen&&hubView==='market'" :game="game" :busy="store.busy" :available="store.available" :running="store.activityRunning" :highlight="highlight" :plan-saved="preparationInspectionSaved" :inspection-exact="preparationInspectionExact" :saved-plan="preparationInspectionPlan?.kind==='buy'||preparationInspectionPlan?.kind==='sell'?preparationInspectionPlan:null" :consumption="consumption" @start="startPreparation" @act="act" @track="trackProduction" @travel="movePreparation"/></KeepAlive>
<KeepAlive :max="2"><RecoveryPlanner :key="game.core.runId+'RecoveryPlanner'+hubView" v-if="singleScreen&&hubView==='recovery'" :game="game" :busy="store.busy" :available="store.available" :running="store.activityRunning" :highlight="highlight" :plan-saved="preparationInspectionSaved" :inspection-exact="preparationInspectionExact" :saved-plan="preparationInspectionPlan?.kind==='use'||preparationInspectionPlan?.kind==='rest'?preparationInspectionPlan:null" @start="startPreparation" @act="act" @track="trackProduction" @travel="movePreparation"/></KeepAlive>
<MilestoneGate v-if="singleScreen&&hubView==='cultivation'&&store.activity?.version===7&&store.activity.plan.action.type==='BREAKTHROUGH'&&store.activity.status!=='stopped'" :game="game" kind="breakthrough" :action="store.activity.plan.action"><p>本次凝神已安排，读秒与停手在上方；保存后核对新境界。</p><button @click="viewActivityPlan">查看原安排</button></MilestoneGate><KeepAlive :max="2"><TrainingPlanner :key="game.core.runId+readingGeneration+game.core.player.realm+'TrainingPlanner'" v-if="singleScreen&&hubView==='cultivation'&&!(store.activity?.version===7&&store.activity.plan.action.type==='BREAKTHROUGH'&&store.activity.status!=='stopped')" :game="game" :busy="store.busy" :available="store.available" :running="store.activityRunning" :saved-plan="trainingInspectionPlan" @start="startTraining" @act="act" @prepare="openPreparation()" @trial="showTrialPreparation" @school="showEquipment" @cave="travel('cave')" @compare="openTradeoffs('cultivation',$event)"/></KeepAlive>
<KeepAlive :max="1"><PreparationPanel :key="game.core.runId+readingGeneration+game.core.player.realm+'PreparationPanel'" :blocked="pendingStoryError" v-if="singleScreen&&hubView==='journey'" :game="game" :busy="store.busy" :available="store.available" :running="store.activityRunning" @act="act" @navigate="navigate" @home="closeHub" @compare="openTradeoffs('preparation',$event)"/></KeepAlive>
<KeepAlive :max="1"><ProgressionChoices :key="game.core.runId+readingGeneration+game.core.player.realm+tradeoffKind" v-if="singleScreen&&hubView==='tradeoffs'" :game="game" :kind="tradeoffKind" :seed="tradeoffSeed" :entry="tradeoffEntry" :busy="store.busy" :available="store.available" @navigate="inspectTradeoffDestination" @inspect="openHub($event)"/></KeepAlive>
<KeepAlive :max="2"><ExplorePanel :key="game.core.runId+'ExplorePanel'+hubView" v-if="singleScreen&&hubView==='explore'" :game="game" :busy="store.busy" :available="store.available" :highlight="highlight" :collection="collectionTarget" :purchase-quantity="quantity" :running="store.activityRunning" :saved-adventure-plan="adventureInspectionPlan" :plan-saved="adventureInspectionSaved" :activity="store.activity" :runtime="store.activityRuntime" :saved-source-plan="sourceInspectionPlan" :saved-preparation-plan="preparationInspectionPlan" :preparation-saved="preparationInspectionSaved" :preparation-exact="preparationInspectionExact" :consumption="consumption" @travel-plan="movePreparation" @track="trackProduction" @start="plan=>plan.kind==='source'?startSource(plan):isAdventurePlan(plan)?startAdventure(plan):startPreparation(plan)" @act="act" @travel="travel" @home="closeHub"/></KeepAlive>
<KeepAlive :max="2"><GoodsPanel :key="game.core.runId+'GoodsPanel'+hubView" v-if="singleScreen&&(hubView==='inventory'||hubView==='forge')" :minimal="immersive&&hubView==='forge'" :mode="hubView==='forge'?'forge':'inventory'" :game="game" :busy="store.busy" :available="store.available" :highlight="highlight" :consumption="consumption" :running="store.activityRunning" :activity="store.activity" :runtime="store.activityRuntime" :saved-production="productionInspectionPlan" :saved-preparation-plan="preparationInspectionPlan" :preparation-saved="preparationInspectionSaved" @travel-plan="movePreparation" @start="startProduction" @move="moveProduction" @act="act" @quick="quickInventory" @track="trackProduction" @travel="travel"/></KeepAlive>
<NarrativeStageHost :active="storyView">
<KeepAlive :max="1"><FateCatalogue :key="game.core.runId+readingGeneration+'FateCatalogue'" v-if="storyView&&(hubView==='fate'||hubView==='current'&&phase==='idle')&&game.status==='active'" :game="game" :enabled="store.available" :running="store.activityRunning" :busy="store.busy" :highlight="highlight" :journal-key="journalKey" @browse="browseDirect()" @act="storyAct" @navigate="navigate" @life="showLife" @resume="resumeEncounter" @dialogue="openHub('current')"/></KeepAlive>
<KeepAlive :max="1"><LifeCatalogue ref="lifeBook" :key="game.core.runId+readingGeneration+game.status+'LifeCatalogue'" v-if="storyView&&(hubView==='life'||['fate','current'].includes(hubView)&&game.status!=='active')" :game="game" :end-reason="why({type:'RETIRE'})" :enabled="store.available" :running="store.activityRunning" :busy="store.busy" :has-checkpoint="store.hasCheckpoint" @end="requestEnd" @export="exportLife" @restore="restore" @restart="reset" @receipt="viewReceipt"/></KeepAlive>
<KeepAlive :max="1"><NarrativePanel :key="game.core.runId+readingGeneration+'NarrativePanel'" v-if="storyView&&hubView==='current'&&narrativeFor(game)" :game="game" :context="narrativeContext" :enabled="store.available" :running="store.activityRunning" :busy="store.busy" :consumption="consumption" @act="storyAct" @life="showLife" @progress="openHub('trial')"/></KeepAlive>
</NarrativeStageHost>
<MilestoneGate v-if="storyView&&hubView==='trial-preparation'" :game="game" kind="trial"><TrialCatalogue :block="pendingStoryError?(store.syncIssue?'请先重新读取当前进度':'请先重试或取消原安排'):null"  :game="game" kind="preparation" :enabled="store.available" :running="store.activityRunning" :busy="store.busy" :checkpoint="store.checkpointSummary" :recovery="store.trialRecovery" @review="reviewTrial" @restore="hubView==='trial-preparation'?restore():requestTrialRestore()" @export="exportSave" @prepare="showTrialPreparation" @resume="closeHub" @navigate="navigate" @track="trackTrialMaterial" @inspect-equipment="openHub('skills')"/></MilestoneGate>
<TrialCatalogue :block="pendingStoryError?(store.syncIssue?'请先重新读取当前进度':'请先重试或取消原安排'):null" v-if="storyView&&(['trial','battle'].includes(hubView)||hubView==='current'&&game.status==='active'&&!narrativeFor(game)&&phase!=='idle')" :game="game" kind="progress" :initial-mode="trialReadMode" :enabled="store.available" :running="store.activityRunning" :busy="store.busy" :checkpoint="store.checkpointSummary" :recovery="store.trialRecovery" @review="reviewTrial" @restore="hubView==='trial-preparation'?restore():requestTrialRestore()" @export="exportSave" @prepare="showTrialPreparation" @resume="closeHub" @navigate="navigate" @track="trackTrialMaterial" @inspect-equipment="openHub('skills')"/>
<TrialProgressPanel v-if="!catalogueView&&(journey || store.trialRecovery)" :journey="journey" :recovery="store.trialRecovery" :checkpoint="store.checkpointSummary" :enabled="store.available && !store.busy" @restore="requestTrialRestore" @export="exportSave" @prepare="showTrialPreparation"/>
<section v-if="!hubMain&&!storyView&&(!singleScreen||(game.status!=='active'&&hubView==='life')||(['home','fate','current','battle'].includes(hubView)||hubView==='trial-preparation'))" ref="contentPanel" id="game-content" tabindex="-1" aria-label="当前内容" class="paper content-panel" :class="{'battle-content':game.battle&&!inspectingInventory}">
<details v-if="game.battle&&!inspectingInventory&&guidanceEnabled&&!skippedGuides.includes(guidance.id)" class="battle-guidance"><summary>查看本场行道提示</summary><GuidancePanel :guide="guidance" @skip="skipGuidance" @help="showGameplayHelp"/></details>
<GuidancePanel v-else-if="!cultivationHome&&phase!=='opening'&&guidanceEnabled&&!skippedGuides.includes(guidance.id)" :guide="guidance" @skip="skipGuidance" @help="showGameplayHelp"/>
<section v-if="inspectingInventory" class="pending-inspection" data-testid="pending-inspection"><h3>当前遭遇待继续</h3><p>查看不会消耗游戏月，也不会改变当前事件、敌方意图或回合。物品使用、旅行与换装仍受当前遭遇限制。</p><button type="button" data-testid="resume-encounter" @click="resumeEncounter">返回当前遭遇</button></section>
<template v-if="phase === 'opening' && !inspectingInventory"><MilestoneGate :game="game" kind="opening" :class="{'art33-opening':singleScreen,'art33-reading':singleScreen}"><template v-if="singleScreen" #object="{source,phase,engaged,remaining,seconds,view}"><OpeningOffering :game="source" :phase="phase" :engaged="engaged" :remaining="remaining" :seconds="seconds" :view-title="view?.title" :status="store.activity?.version===7&&store.activity.plan.action.type==='CHOOSE'?store.activity.status:'idle'" :failed="!!store.error" reading @inspect="closeHub"/></template>
<div class="opening-heading"><PortraitImage class="speaker-portrait" id="shen" fallback="沈"/><div><span class="section-label">破庙初遇 · 沈清禾</span><h2>一丹，一念。</h2></div></div>
<p class="story">山雨将歇，药修沈清禾向你求药。你随身带着回春丹 ×{{core.inventory.healing_pill}}，庙柱上的引气之法人人可习。要不要介入这段因果，由你决定。</p>
<div id="opening-actions" class="choices opening-choices" tabindex="-1" data-primary-region role="group" aria-label="破庙抉择">
<ChoiceCard v-for="choice in openingChoices" :key="choice.id" :choice-id="choice.id" :label="choice.name" :disabled="!can({type:'CHOOSE',choice:choice.id})" :identity="core.runId+core.revision" :details="choiceDetails({type:'CHOOSE',choice:choice.id},choice.detail)" @choose="act({type:'CHOOSE',choice:choice.id})">
<strong>{{singleScreen?'核对 · ':''}}{{choice.name}}</strong><small>{{cost({type:'CHOOSE',choice:choice.id})}}</small><small>{{choice.detail}}</small><small v-if="why({type:'CHOOSE',choice:choice.id})">{{why({type:'CHOOSE',choice:choice.id})}}</small>
</ChoiceCard>
</div>
<details class="opening-details"><summary>三种选择与剑简说明</summary><p class="small">三种选择均可入道，剧情不会直接赋予境界。惊鸿剑简用于剑修终结术法，伤害 +{{ruleContent.swordManual.damageBonus}}；三种开场均可在筑基后到青云宗付费研读同简。</p></details></MilestoneGate>
</template>
<template v-else-if="phase === 'trial-question' && journey && !inspectingInventory">
<div class="section-label">渡劫 · 问心</div><h2>你愿如何面对来路？</h2><p class="story" data-testid="trial-question-memory">{{journey.openingMemory}}</p><p class="story">接纳旧我，稳住心神；或放下旧念，以进攻开路。两条道路皆可向前，不另判善恶成败。</p>
<details class="trial-memories"><summary>回望已记录的选择</summary><p v-for="memory in journey.memories" :key="memory.id" class="small">{{memory.person}} · {{memory.title}}：{{memory.text}}</p></details>
<div class="choices two" tabindex="-1" data-primary-region role="group" aria-label="问心选择"><ChoiceCard v-for="answer in journey.answers" :key="answer.id" :choice-id="`answer-${answer.id}`" :label="answer.label" :disabled="!can({type:'ANSWER_TRIAL',answer:answer.id})" :identity="core.runId+core.revision" :details="choiceDetails({type:'ANSWER_TRIAL',answer:answer.id},answer.record)" @choose="act({type:'ANSWER_TRIAL',answer:answer.id})"><strong>{{answer.label}} · {{answer.id==='accept'?'承受更稳':'进攻更强'}}</strong><small>{{answer.record}}</small><small>{{answer.preview.failure?.message}}</small></ChoiceCard></div>
</template>
<template v-else-if="activeStory && !inspectingInventory">
<div class="section-label">当前遭遇 · {{activeStory.npc}}</div><div class="encounter-speaker"><PortraitImage class="speaker-portrait" :id="NPC_PORTRAITS[activeStory.npc]??''" :fallback="activeStory.npc.slice(0,1)"/><span>{{activeStory.npc}}</span></div><h2 data-testid="event-title">{{activeStory.name}}</h2><p class="story" data-testid="event-body">{{activeStory.body}}</p>
<div class="choices" tabindex="-1" data-primary-region role="group" aria-label="当前遭遇选择"><ChoiceCard v-for="option in activeStory.options" :key="option.id" :choice-id="`decide-${option.id}`" :label="option.label" :disabled="!can({type:'DECIDE',option:option.id})" :identity="core.runId+core.revision" :details="choiceDetails({type:'DECIDE',option:option.id},option.detail)" @choose="act({type:'DECIDE',option:option.id})"><strong>{{option.label}}</strong><small>{{option.detail}}</small><small>{{cost({type:'DECIDE',option:option.id})}}</small><small>{{why({type:'DECIDE',option:option.id})}}</small><small>{{consumption({type:'DECIDE',option:option.id})}}</small></ChoiceCard></div>
</template>
<template v-else-if="game.battle && !inspectingInventory">
    <BattlePanel :game="game" :can="can" :cost="cost" :why="why" @move="battle" @start="startAdventure" @takeover="store.pauseCultivation" :activity="store.activity" :running="store.activityRunning" :busy="store.busy" :available="store.available" :saved-adventure-plan="adventureInspectionPlan" :plan-saved="adventureInspectionSaved"><template #activity><TrainingActivity v-if="!immersive&&store.activity?.version===6&&store.activity.status!=='stopped'" :store="store" compact @settings="viewActivityPlan" @details="viewReceipt"/></template></BattlePanel>
          </template>
          <template v-else-if="phase === 'trial-ending' && ascension && !inspectingInventory">
            <div class="section-label">天门已开 <span>三关已过，等待你的收束</span></div><h2>此生，留下些什么？</h2><p class="story">{{ascension.record.opening.text}} {{ascension.record.training.school}}的来路已经留在记录中。两种选择都以飞升成功收卷，没有善恶高低。</p>
            <p class="small">{{ascension.record.battle.trial}} 选择前可查看生平；取消不改变进度，确认保存后才封卷。</p>
            <div class="choices two" tabindex="-1" data-primary-region role="group" aria-label="飞升收束选择"><ChoiceCard v-for="choice in ascension.choices" :key="choice.ending" :choice-id="`ending-${choice.ending}`" :label="choice.label" :disabled="!can({type:'END',ending:choice.ending})" :identity="core.runId+core.revision" :details="choiceDetails({type:'END',ending:choice.ending},choice.description)" @choose="act({type:'END',ending:choice.ending})"><strong>{{choice.label}}</strong><small>{{choice.description}}</small><small>{{choice.preview.failure?.message}}</small></ChoiceCard></div>
          </template>
          <template v-else-if="game.status !== 'active'">
            <LifePanel data-primary-region tabindex="-1" :game="game" :enabled="store.available" :busy="store.busy" :has-checkpoint="store.hasCheckpoint" @export="exportLife" @restore="restore" @restart="reset"/>
          </template>
          <CultivationTab v-else-if="tab === '修行'" v-model:batch="batch" :cultivation-home="cultivationHome" @act="act" @travel="travel" @school="showEquipment" @focus="focusCultivation" @track-breakthrough="showBreakthroughGoal"/>
          <ExplorationTab v-else-if="tab === '历练'" v-model:batch="batch" v-model:quantity="quantity" :collection="collectionTarget" :highlight="highlight" @act="act" @travel="travel"/>
          <InventoryTab v-else-if="tab === '行囊'" :single-screen="singleScreen" :view="hubView" :highlight="highlight" :consumption="consumption" @act="act" @travel="travel" @track="selectTracking"/>
          <FateTab v-else :highlight="highlight" @act="act" @life="showLife" @navigate="navigate"/>
          <GuidancePanel v-if="(cultivationHome||phase==='opening')&&guidanceEnabled&&!skippedGuides.includes(guidance.id)" :guide="guidance" @skip="skipGuidance" @help="showGameplayHelp" :modal="singleScreen&&phase==='opening'" @expand="helpBook?.selectTopic(guidance.id);showGameplayHelp()"/>
        </section>
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
