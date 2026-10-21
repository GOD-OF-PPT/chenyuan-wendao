import type {ConfigurationAction,ConfigurationIntent} from '../../src/full/configuration.ts';
import { defineStore } from 'pinia';
import { computed, onScopeDispose, ref, shallowRef } from 'vue';
import { getTrialRecovery } from '../../src/full/queries.ts';
import type { Action, Command, Game } from '../../src/full/types.ts';
import type { ActionResult, CommitOutcome, SaveCheckpoint } from '../../src/full/contracts.ts';
import { FullSaveRepository, rawBackupText } from './full-persistence';
import type { ControlOutcome, SaveMutation } from './full-persistence';
import {loadedObservation,writeObservation,inputErrorObservation,storageErrorObservation,type Observation,type WriteObservationSource} from './local-events';
import {useSession} from './session';
import {createActionClock,actionSeconds,actionLabel,type Execution} from './action-timing';
import {createActivityClock} from './activity-clock';
import type {Activity,ActivityPlan,CultivationPlan,ActivityMutation,ActivityTick,ActivityOutcome} from '../../src/full/activity.ts';
import {isMilestoneAction} from '../../src/full/milestones.ts';
import type {MilestoneAction,MilestonePlan} from '../../src/full/milestones.ts';
export interface MilestoneIntent { plan:MilestonePlan;mutation:ActivityMutation; }

export type CheckpointSummary = Pick<SaveCheckpoint, 'kind' | 'sourceRunId' | 'sourceRevision' | 'versions'> & { target: { name: string; realm: Game['core']['player']['realm']; months: number; hp: number; mp: number; inventory: Record<string, number> } };

export const useGame = defineStore('game', () => {
  const session=useSession();
  const game = shallowRef<Game | null>(null), busy = ref(false), ready = ref(false), available = ref(false);
  const error = ref(''), warning = ref(''), saved = ref(false), hasCheckpoint = ref(false);
  const checkpointSummary = shallowRef<CheckpointSummary | null>(null);
  const trialRecovery = shallowRef<ReturnType<typeof getTrialRecovery>>(null);
  const lastResult = shallowRef<ActionResult | null>(null), lastReplayed = ref(false), canRetry = ref(false);
  const execution=shallowRef<Execution|null>(null),actionClock=createActionClock();
  const activity=shallowRef<Activity|null>(null),activityNotice=ref(''),lastFromActivity=ref(false);
  const syncEpoch=ref(0);
  const activityRuntime=shallowRef<{id:string;generation:number;remainingMs:number;totalMs:number;phase:'running'|'saving'|'pausing'}|null>(null);
  const activityOwner=crypto.randomUUID(),activityClock=createActivityClock();
  const activityRunning=computed(()=>activity.value?.status==='running');
  const activityLocal=computed(()=>!!activityRuntime.value&&activity.value?.ownerId===activityOwner);
  const activityOwned=computed(()=>activity.value?.ownerId===activityOwner);
  const activityPausing=ref(false);
  let activityEpoch=0,activityInFlight:Promise<void>|null=null;
  let writeInFlight:Promise<void>|null=null;
  let repository: FullSaveRepository | undefined, channel: BroadcastChannel | undefined;
  let pending: (() => Promise<CommitOutcome | ControlOutcome | ActivityOutcome>) | null = null;
  let pendingInstant=false;
  let pendingCycle:Activity|null=null;
  let pendingCommandId: string | undefined;
  let pendingObservation: WriteObservationSource | undefined;
  const observers=new Set<{next:(value:Observation)=>void;fault:()=>void}>();
  function observe(next:(value:Observation)=>void,fault:()=>void=()=>{}){const observer={next,fault};observers.add(observer);return()=>observers.delete(observer);}
  function emit(make:()=>Observation){if(!observers.size)return;let value:Observation;try{value=make();}catch{for(const o of observers)try{o.fault();}catch{}return;}for(const o of observers)try{o.next(structuredClone(value));}catch{try{o.fault();}catch{}}}
  let failedIntent = false, refreshQueued = false, disposed = false;
  const message = (value: unknown) => value instanceof Error ? value.message : String(value);
  const codeOf = (value: unknown) => value && typeof value === 'object' && 'code' in value ? String(value.code) : '';
  const mutation = (): SaveMutation => ({ commandId: crypto.randomUUID(), runId: crypto.randomUUID(),
    expectedRunId: game.value?.core.runId ?? null, expectedRevision: game.value?.core.revision ?? 0 });

  function stopActivityRuntime(){activityEpoch++;activityClock.cancel();activityRuntime.value=null;}
  function acceptActivity(next:Activity|null){
    const runtime=activityRuntime.value;
    if(runtime&&(!next||next.id!==runtime.id||next.generation!==runtime.generation||next.ownerId!==activityOwner||next.status!=='running'))stopActivityRuntime();
    activity.value=next;
  }
  function activityMutation():ActivityMutation|null{
    if(!game.value||!repository||!available.value)return null;
    return{commandId:crypto.randomUUID(),runId:game.value.core.runId,expectedRevision:game.value.core.revision,
      expectedActivityId:activity.value?.id??null,expectedActivityRevision:activity.value?.revision??null,ownerId:activityOwner};
  }
  async function submitActivityWhenDue(current:Activity,operation:()=>Promise<ActivityOutcome>,commandId:string,
    observation:WriteObservationSource,owner:number){
    const base={id:current.id,generation:current.generation,totalMs:current.cycleMs};
    while(!disposed&&owner===activityEpoch){
      const due=await activityClock.waitUntil(current.dueAt!,remaining=>{
        if(owner===activityEpoch&&!disposed)activityRuntime.value={...base,remainingMs:remaining,phase:'running'};
      });
      if(!due||disposed||owner!==activityEpoch)return;
      activityRuntime.value={...base,remainingMs:0,phase:'saving'};
      let notDue=false;
      const saving=write(operation,commandId,observation,true,current,()=>{notDue=true;});
      activityInFlight=saving;await saving;if(activityInFlight===saving)activityInFlight=null;
      if(disposed||owner!==activityEpoch)return;
      // Date.now can move between the gate and the transaction. Retain this exact command and only wait its remainder.
      if(!notDue)return;
    }
  }
  function beginActivityRuntime(){
    const current=activity.value;
    if(disposed||!repository||!available.value||error.value||!current||current.status!=='running'||current.ownerId!==activityOwner||!current.nextCommand||activityPausing.value)return;
    stopActivityRuntime();const owner=activityEpoch;
    const base={id:current.id,generation:current.generation,totalMs:current.cycleMs};
    activityRuntime.value={...base,remainingMs:current.cycleMs,phase:'running'};
    void(async()=>{
      try{
        const due=await activityClock.wait(current.cycleMs,remaining=>{if(owner===activityEpoch&&!disposed)activityRuntime.value={...base,remainingMs:remaining,phase:'running'};});
        if(!due||disposed||owner!==activityEpoch||activity.value?.revision!==current.revision)return;
        const command=current.nextCommand!;
        const tick:ActivityTick={commandId:command.commandId,runId:current.runId,expectedRevision:current.gameRevision,
          activityId:current.id,expectedActivityRevision:current.revision,ownerId:activityOwner,generation:current.generation};
        await submitActivityWhenDue(current,()=>repository!.settleActivity(tick),tick.commandId,{kind:'action',command},owner);
        if(disposed||owner!==activityEpoch)return;
        activityRuntime.value=null;
        if(!error.value&&!activityPausing.value)beginActivityRuntime();
      }catch(value){if(owner!==activityEpoch||disposed)return;stopActivityRuntime();activityNotice.value=message(value);}
    })();
  }

  async function checkpointInfo() {
    const current = game.value;
    if (!repository || !current) { hasCheckpoint.value = false; checkpointSummary.value = null; trialRecovery.value = null; return; }
    let cp: SaveCheckpoint | null = null;
    try {
      cp = await repository.loadCheckpoint();
      if (game.value !== current) return;
      hasCheckpoint.value = !!cp;
      checkpointSummary.value = cp ? { kind: cp.kind, sourceRunId: cp.sourceRunId, sourceRevision: cp.sourceRevision, versions: { ...cp.versions },
        target: { name: cp.snapshot.core.player.name, realm: cp.snapshot.core.player.realm, months: cp.snapshot.core.world.elapsedMonths,
          hp: cp.snapshot.core.player.hp, mp: cp.snapshot.core.player.mp, inventory: { ...cp.snapshot.core.inventory } } } : null;
      warning.value = '';
    } catch (value) { if (game.value !== current) return; hasCheckpoint.value = false; checkpointSummary.value = null; warning.value = '检查点无法读取：' + message(value); }
    try {
      const previous = await repository.loadPrevious();
      if (game.value === current) trialRecovery.value = getTrialRecovery(current, previous, cp);
    } catch (value) { if (game.value === current) { trialRecovery.value = null; warning.value += ' 上一行动无法核对：' + message(value); } }
  }
  async function refresh(reason?:'sync') {
    if (!repository) return;
    const snapshot=await repository.loadActivitySnapshot(),current=snapshot.state;
    if (disposed) return;
    const changed=current?.core.runId !== game.value?.core.runId || current?.core.revision !== game.value?.core.revision;
    const changedActivity=snapshot.activity?.id!==activity.value?.id||snapshot.activity?.revision!==activity.value?.revision;
    if(changedActivity&&activityRuntime.value?.phase==='running')stopActivityRuntime();
    if (changed) {
      lastResult.value = null; lastReplayed.value = false;lastFromActivity.value=false;
    }
    game.value = current;
    acceptActivity(snapshot.activity);
    await checkpointInfo();
    if (!failedIntent && !busy.value) saved.value = !!current;
    if(reason==='sync'&&changed&&current)emit(()=>loadedObservation(current,'sync'));
  }
  async function init() {
    if (busy.value) return;
    const hadUnconfirmedIntent=failedIntent;
    stopActivityRuntime();activityNotice.value='';
    busy.value = true; ready.value = false; available.value = false; error.value = ''; warning.value = '';
    repository?.close(); channel?.close(); repository = undefined; channel = undefined;
    pending = null; pendingCommandId = undefined; pendingObservation=undefined; pendingCycle=null;canRetry.value = false;
    try {
      const opened = await FullSaveRepository.open(session.gameDatabase);
      if (disposed) { opened.close(); return; }
      repository = opened; available.value = true;
      await refresh();
      failedIntent=false;saved.value=!!game.value;
      if(hadUnconfirmedIntent)warning.value=[warning.value,'已重新读取已保存进度；上次未确认的操作未自动重试，请核对当前成果后再安排。'].filter(Boolean).join(' ');
      if(game.value)emit(()=>loadedObservation(game.value!,'resume'));
      if ('BroadcastChannel' in globalThis) {
        channel = new BroadcastChannel(session.gameChannel);
        channel.onmessage = () => {
          // Viewing intents must be invalidated immediately, even while a local write is finishing.
          syncEpoch.value++;
          if (busy.value) { refreshQueued = true; return; }
          refresh('sync').catch(value => {
            error.value = '无法同步存档：' + message(value); saved.value = false;
            emit(()=>storageErrorObservation(game.value,codeOf(value)));
            if (codeOf(value) === 'STORAGE_CLOSED') available.value = false;
          });
        };
      }
    } catch (value) {
      error.value = '无法读取存档：' + message(value); saved.value = false; available.value = false;
      emit(()=>storageErrorObservation(game.value,codeOf(value)));
      repository?.close(); repository = undefined;
    } finally { ready.value = true; busy.value = false; }
  }
  function write(operation: () => Promise<CommitOutcome | ControlOutcome | ActivityOutcome>, commandId?: string, observation?:WriteObservationSource, instant=false,cycle:Activity|null=null,onNotDue?:()=>void):Promise<void>{
    if(disposed||busy.value||!repository)return Promise.resolve();
    const current=performWrite(operation,commandId,observation,instant,cycle,onNotDue);writeInFlight=current;
    return current.finally(()=>{if(writeInFlight===current)writeInFlight=null;});
  }
  async function performWrite(operation: () => Promise<CommitOutcome | ControlOutcome | ActivityOutcome>, commandId?: string, observation?:WriteObservationSource, instant=false,cycle:Activity|null=null,onNotDue?:()=>void) {
    if (disposed || busy.value || !repository) return;
    const before=game.value,wasSaved=saved.value,wasFailed=failedIntent;
    busy.value = true; error.value = ''; saved.value = false; canRetry.value = false; pending = operation; pendingCommandId = commandId;
    pendingObservation=observation;
    pendingInstant=instant;
    pendingCycle=cycle;
    try {
      const action=observation?.kind==='action'?observation.command:null;
      const seconds=action?actionSeconds(action):.6,totalMs=Number.isFinite(seconds)?seconds*1000:0;
      const label=action?actionLabel(action):observation?.kind==='restore'?'恢复准备':observation?.kind==='import'?'载入进度':'展开新的人生';
      const initial:Execution={id:commandId??'',label,totalMs,remainingMs:totalMs,phase:'acting',batch:!!action&&('count'in action&&(action.count??1)>1||'quantity'in action&&action.quantity>1)};
      if(!instant){const completed=await actionClock.wait(totalMs,remaining=>{execution.value={...initial,remainingMs:remaining};});
        if(!completed||disposed)return;execution.value={...initial,remainingMs:0,phase:'saving'};}
      const outcome = await operation();
      if (disposed) return;
      game.value = outcome.state;
      if('activity'in outcome)acceptActivity(outcome.activity);
      else{const snapshot=await repository!.loadActivitySnapshot();if(disposed)return;game.value=snapshot.state;acceptActivity(snapshot.activity);}
      if('result'in outcome&&outcome.result){lastResult.value=outcome.result;lastFromActivity.value=cycle!==null;lastReplayed.value=outcome.replayed;}
      else if(!instant){lastResult.value=null;lastFromActivity.value=false;lastReplayed.value=outcome.replayed;}
      failedIntent = false; pending = null; pendingCommandId = undefined; pendingObservation=undefined; pendingCycle=null;saved.value = true;
      if(observation)emit(()=>writeObservation(before,outcome.state,observation,'result'in outcome?outcome.result:null,outcome.replayed));
      await checkpointInfo();
      try { channel?.postMessage({ runId: outcome.state.core.runId, revision: outcome.state.core.revision }); }
      catch { warning.value = '进度已保存，其他页面暂未收到同步提示'; }
    } catch (value) {
      if(onNotDue&&codeOf(value)==='ACTIVITY_NOT_DUE'){
        // Nothing committed. This is still the same running cycle, not a failed save or a new reward.
        saved.value=wasSaved;failedIntent=wasFailed;onNotDue();return;
      }
      failedIntent = true; error.value = message(value); saved.value = false; lastResult.value = null;
      const code = codeOf(value);
      if(observation)emit(()=>writeObservation(before,null,observation,null,false,code||'OTHER'));
      if (code === 'STORAGE_CLOSED') available.value = false;
      canRetry.value = ['STORAGE_QUOTA', 'STORAGE_ABORTED', 'STORAGE_DENIED'].includes(code);
      if (!canRetry.value) { pending = null; pendingCommandId = undefined; pendingObservation=undefined; pendingCycle=null; }
      try { await refresh(); } catch (readError) { warning.value = '原进度暂时无法重读：' + message(readError); }
    } finally {
      execution.value=null;
      busy.value = false;
      if (refreshQueued) { refreshQueued = false; refresh('sync').catch(value => { warning.value = message(value);emit(()=>storageErrorObservation(game.value,codeOf(value))); }); }
    }
  }
  function validationError(text: string) {
    failedIntent = true; error.value = text; saved.value = false; canRetry.value = false; pending = null; pendingCommandId = undefined;
    pendingObservation=undefined;emit(()=>inputErrorObservation(game.value));
    pendingCycle=null;
  }
  async function start(name: string) {
    if (!repository || game.value) return;
    const intent = mutation(); await write(() => repository!.create(name.trim(), intent),intent.commandId,{kind:'new_game',commandId:intent.commandId,runId:intent.runId,sourceRunId:intent.expectedRunId,expectedRevision:intent.expectedRevision});
  }
  function prepareAction(action: Action): Command | null {
    if (!game.value || !repository || !available.value || busy.value) return null;
    if(activityRunning.value){activityNotice.value='当前活动正在进行，请先暂停再行动。';return null;}
    return structuredClone({ ...action, commandId: crypto.randomUUID(), runId: game.value.core.runId, expectedRevision: game.value.core.revision });
  }
  async function actPrepared(input: Command) {
    if (!repository) return;
    if(['CULTIVATE','SOURCE','CRAFT','FORGE','BUY','SELL','USE','REST','LEARN','STUDY','SCHOOL','EQUIP','EQUIP_RELIC','TRAVEL','ENCOUNTER','BATTLE',
      'CHOOSE','EVENT','DECIDE','BREAKTHROUGH','START_TRIAL','ANSWER_TRIAL','END','RETIRE','END_LIFE'].includes(input.type)){activityNotice.value='请安排活动，按周期积累。';return;}
    if(activityRunning.value){activityNotice.value='当前活动正在进行，请先暂停再行动。';return;}
    const command = structuredClone({ ...input });
    await write(() => repository!.execute(command), command.commandId,{kind:'action',command});
  }
  async function act(action: Action) {
    const command = prepareAction(action);
    if (command) await actPrepared(command);
  }
  function prepareConfiguration(action:ConfigurationAction):ConfigurationIntent|null{
    if(disposed||!game.value||!repository||!available.value||busy.value)return null;
    if(activityRunning.value){activityNotice.value='请先暂停当前活动，再核对配装。';return null;}
    return structuredClone({command:{...action,commandId:crypto.randomUUID(),runId:game.value.core.runId,expectedRevision:game.value.core.revision},
      expectedActivityId:activity.value?.id??null,expectedActivityRevision:activity.value?.revision??null});
  }
  async function applyConfiguration(input:ConfigurationIntent){
    if(disposed||!repository||!available.value)return;
    if(activityRunning.value){activityNotice.value='请先暂停当前活动，再确认配装。';return;}
    const intent=structuredClone(input);
    await write(()=>repository!.configure(intent),intent.command.commandId,{kind:'action',command:intent.command},true);
  }
  function prepareImport(): SaveMutation | null {
    if (disposed || !repository || !available.value || busy.value) return null;
    return structuredClone(mutation());
  }
  async function importPrepared(raw: string, input: SaveMutation) {
    if (disposed || !repository || !available.value) return;
    stopActivityRuntime();const intent = structuredClone(input);
    await write(() => repository!.importText(raw, intent),intent.commandId,{kind:'import',commandId:intent.commandId,runId:intent.runId,sourceRunId:intent.expectedRunId,expectedRevision:intent.expectedRevision});
  }
  async function importText(raw: string) {
    const intent = prepareImport(); if (intent) await importPrepared(raw, intent);
  }
  async function restart(name: string) {
    if (!repository || !game.value) return;
    stopActivityRuntime();const intent = mutation(); await write(() => repository!.create(name.trim(), intent),intent.commandId,{kind:'restart',commandId:intent.commandId,runId:intent.runId,sourceRunId:intent.expectedRunId,expectedRevision:intent.expectedRevision});
  }
  function prepareCheckpoint(): SaveMutation | null {
    if (!repository || !game.value || !available.value || busy.value || !hasCheckpoint.value) return null;
    return structuredClone(mutation());
  }
  async function restorePrepared(input: SaveMutation) {
    if (!repository) return;
    stopActivityRuntime();const intent = structuredClone(input);
    await write(() => repository!.restoreCheckpoint(intent), intent.commandId,{kind:'restore',commandId:intent.commandId,runId:intent.runId,sourceRunId:intent.expectedRunId,expectedRevision:intent.expectedRevision});
  }
  async function checkpoint() {
    const intent = prepareCheckpoint(); if (intent) await restorePrepared(intent);
  }
  async function retry() {
    if(!pending||!canRetry.value||busy.value)return;
    const operation=pending,commandId=pendingCommandId,observation=pendingObservation,instant=pendingInstant,cycle=pendingCycle;
    if(cycle&&commandId&&observation){
      canRetry.value=false;error.value='';stopActivityRuntime();const owner=activityEpoch;
      try{await submitActivityWhenDue(cycle,operation as ()=>Promise<ActivityOutcome>,commandId,observation,owner);
        if(owner!==activityEpoch||disposed)return;activityRuntime.value=null;
      }catch(value){if(owner!==activityEpoch||disposed)return;stopActivityRuntime();activityNotice.value=message(value);return;}
    }else await write(operation,commandId,observation,instant);
    if(instant&&!error.value)beginActivityRuntime();
  }
  function canRetryFor(commandId: string) { return canRetry.value && pendingCommandId === commandId; }
  async function retryFor(commandId: string) { if (canRetryFor(commandId)) await retry(); }
  function discardRetryFor(commandId: string) {
    if (pendingCommandId !== commandId) return;
    pending = null; pendingCommandId = undefined; pendingObservation=undefined; pendingCycle=null;canRetry.value = false;
  }
  async function rawText(): Promise<string | null> {
    try{const backup = await FullSaveRepository.exportRaw(session.gameDatabase); return backup ? rawBackupText(backup) : null;}catch(value){emit(()=>storageErrorObservation(game.value,codeOf(value)));throw value;}
  }
  async function startPlannedActivity(plan:ActivityPlan){
    if(disposed||busy.value||!repository)return;
    if(activityRunning.value){activityNotice.value='请先暂停当前活动，再重新安排。';return;}
    const intent=activityMutation();if(!intent)return;const selected=structuredClone(plan);activityNotice.value='';stopActivityRuntime();
    await write(()=>repository!.startActivity(selected,intent),intent.commandId,undefined,true);
    if(!error.value)beginActivityRuntime();
  }
  function prepareMilestone(action:MilestoneAction):MilestoneIntent|null{
    if(disposed||busy.value||!repository||!available.value||!game.value)return null;
    if(!isMilestoneAction(action)){validationError('本次安排必须是已明确选定的一项正式选择。');return null;}
    if(activityRunning.value){activityNotice.value='请先暂停当前活动，再核对本次选择。';return null;}
    const intent=activityMutation();if(!intent)return null;
    return structuredClone({plan:{kind:'milestone',action,maxCycles:1},mutation:intent});
  }
  async function startPreparedMilestone(input:MilestoneIntent){
    if(disposed||busy.value||!repository||!available.value)return;
    const intent=structuredClone(input);activityNotice.value='';stopActivityRuntime();
    await write(()=>repository!.startActivity(intent.plan,intent.mutation),intent.mutation.commandId,undefined,true);
    if(!error.value)beginActivityRuntime();
  }
  async function loadActivityHistory(id:string,page=0){
    if(disposed||!repository||!game.value)throw new Error('存档未就绪');
    return repository.loadActivityHistory(id,page,4);
  }
  const startCultivation=(plan:CultivationPlan)=>startPlannedActivity(plan);
  async function pauseCultivation(){
    if(disposed||!repository||activityPausing.value||!activity.value)return;
    activityPausing.value=true;stopActivityRuntime();
    try{const writing=writeInFlight??activityInFlight;if(writing)await writing;const intent=activityMutation();if(!intent||!activity.value||activity.value.status!=='running')return;
      await write(()=>repository!.pauseActivity(intent),intent.commandId,undefined,true);
      if(!error.value)activityNotice.value='活动已暂停。未完成的这一轮在继续时重新计时。';
    }finally{activityPausing.value=false;}
  }
  async function resumeCultivation(){
    if(disposed||busy.value||!repository)return;const intent=activityMutation();if(!intent)return;
    activityNotice.value='';stopActivityRuntime();await write(()=>repository!.resumeActivity(intent),intent.commandId,undefined,true);
    if(!error.value)beginActivityRuntime();
  }
  const saveLabel = computed(() => !ready.value ? '读取中' : execution.value?.phase==='acting' ? '行动中' : busy.value ? '保存中' : saved.value ? '已保存' : failedIntent ? '本次未保存' : available.value ? '尚无存档' : '存储不可用');
  onScopeDispose(() => { disposed = true;stopActivityRuntime();actionClock.cancel();execution.value=null; repository?.close(); channel?.close();observers.clear(); });
  return { game, busy, ready, available, error, warning, saved, hasCheckpoint, checkpointSummary, trialRecovery, canRetry, lastResult, lastReplayed, saveLabel,execution,
    activity,activityRuntime,activityRunning,activityLocal,activityOwned,activityPausing,activityNotice,lastFromActivity,syncEpoch,loadActivityHistory,startPlannedActivity,prepareMilestone,startPreparedMilestone,startCultivation,pauseCultivation,resumeCultivation,
    init, refresh, start, act, prepareAction, actPrepared, prepareConfiguration, applyConfiguration, discardRetryFor, importText, prepareImport, importPrepared, restart, checkpoint, prepareCheckpoint, restorePrepared, retry, canRetryFor, retryFor, rawText, validationError,observe };
});
