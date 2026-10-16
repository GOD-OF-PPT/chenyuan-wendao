import { ASCENSION_ENDINGS, type AscensionEnding } from './ascension.ts';
import * as C from './content.ts';
import { stories } from './events.ts';
import { buildLifeRecord, lifeOverview, lifeRecordText } from './life-record.ts';
import { conditionMatches, storyView, relationshipViews, causalAid } from './story-context.ts';
import { resolve, validateCommand, validateGame, stats } from './engine.ts';
import { RuleError, fail } from './errors.ts';
import { costsForAction, multiplyCosts, requirementsForAction, remainingMonths } from './costs.ts';
import type { ActionRequirements } from './costs.ts';
import { gamePhase } from './contracts.ts';
import { TRIAL_STAGES, TRIAL_ANSWERS } from './trial-rules.ts';
import type { ActionCosts, RuleFailure, StateDelta, SaveCheckpoint } from './contracts.ts';
import type { Action, Command, Game } from './types.ts';

const previewCommand = (game: Game, action: Action): Command => ({
  ...action, commandId: 'preview', runId: game.core.runId, expectedRevision: game.core.revision,
});
export interface ActionPreview {
  action: Action; allowed: boolean; failure: RuleFailure | null;
  requirements: ActionRequirements; costs: ActionCosts | null; maximumCosts: ActionCosts | null;
  actualCosts: ActionCosts | null; delta: StateDelta | null;
  deficits: ResourceDeficit[];
  requestedSteps: number; executedSteps: number; stopReason: RuleFailure | null;
}
export function previewAction(game: Game, action: Action): ActionPreview {
  validateGame(game);
  const command = previewCommand(game, action);
  let requirements: ActionRequirements = {}, costs: ActionCosts | null = null;
  let requestedSteps = 0;
  try {
    const resolved = resolve(game, command);
    requirements = requirementsForAction(game, action);
    costs = costsForAction(game, action);
    requestedSteps = resolved.result.requestedSteps;
    return { action: structuredClone(action), allowed: true, failure: null, requirements, costs,
      maximumCosts: multiplyCosts(costs, requestedSteps), actualCosts: resolved.result.costs,
      delta: resolved.result.delta, requestedSteps, executedSteps: resolved.result.executedSteps,
      deficits: costDeficits(game, costs, requirements, action.type === 'END_LIFE'),
      stopReason: resolved.result.stopReason };
  } catch (error) {
    if (!(error instanceof RuleError)) throw error;
    // Preserve the resolver's first failure. Metadata must not replace it with
    // a secondary quote error (for example DECIDE after the run has ended).
    try {
      validateCommand(command);
      requestedSteps = action.type === 'CULTIVATE' || action.type === 'SOURCE' ? action.count ?? 1 : 1;
      requirements = requirementsForAction(game, action);
      costs = costsForAction(game, action);
    } catch (metadataError) {
      if (!(metadataError instanceof RuleError)) throw metadataError;
    }
    return { action: structuredClone(action), allowed: false, failure: { code: error.code, message: error.message },
      requirements, costs, maximumCosts: costs ? multiplyCosts(costs, requestedSteps) : null,
      actualCosts: null, delta: null, deficits: costs ? costDeficits(game, costs, requirements, action.type === 'END_LIFE') : [],
      requestedSteps, executedSteps: 0, stopReason: null };
  }
}
export interface ResourceDeficit {
  kind: 'stones' | 'mp' | 'months' | 'item' | 'xp' | 'hp';
  id?: string; required: number; have: number; missing: number;
}
export function costDeficits(game: Game, costs: ActionCosts, requirements: ActionRequirements = {}, endingLife = false): ResourceDeficit[] {
  validateGame(game);
  const deficits: ResourceDeficit[] = [];
  const add = (kind: ResourceDeficit['kind'], required: number, have: number, id?: string) => {
    const missing = Math.max(0, required - have);
    if (missing) deficits.push({ kind, ...(id ? { id } : {}), required, have, missing });
  };
  add('stones', costs.stones, game.core.player.stones);
  add('mp', costs.mp, game.core.player.mp);
  add('months', costs.months, Math.max(0, remainingMonths(game) - (endingLife ? 0 : 1)));
  for (const [id, n] of Object.entries(costs.items)) {
    if (!Object.hasOwn(C.items, id)) fail('INVALID_QUERY', '未知物品');
    add('item', n, game.core.inventory[id], id);
  }
  if (requirements.xp !== undefined) add('xp', requirements.xp, game.core.player.xp);
  if (requirements.hp !== undefined) add('hp', requirements.hp, game.core.player.hp);
  return deficits;
}

export interface ItemSource {
  resource: { kind: 'item'; id: string } | { kind: 'stones' };
  kind: 'source' | 'recipe' | 'purchase' | 'battle' | 'event';
  id: string; label: string; location: C.LocationId; rewardCount: number;
  repeatable: boolean; conditionalOnVictory: boolean;
  navigation: Action | null; steps: Action[]; previews: ActionPreview[];
  available: boolean; failure: RuleFailure | null; costs: ActionCosts | null;
  deficits: ResourceDeficit[];
}
function sourcePlan(game: Game, source: Omit<ItemSource, 'navigation' | 'steps' | 'previews' | 'available' | 'failure' | 'costs' | 'deficits'>, actions: Action[]): ItemSource {
  const navigation: Action | null = game.core.world.location === source.location ? null : { type: 'TRAVEL', location: source.location };
  const steps = navigation ? [navigation, ...actions] : actions;
  const previews: ActionPreview[] = [];
  let projected = game, failure: RuleFailure | null = null, deficits: ResourceDeficit[] = [];
  const total: ActionCosts = { stones: 0, mp: 0, months: 0, items: {} };
  for (const action of steps) {
    const preview = previewAction(projected, action);
    previews.push(preview);
    if (preview.maximumCosts) {
      total.stones += preview.maximumCosts.stones; total.mp += preview.maximumCosts.mp; total.months += preview.maximumCosts.months;
      for (const [id, n] of Object.entries(preview.maximumCosts.items)) total.items[id] = (total.items[id] ?? 0) + n;
      deficits = preview.deficits;
    }
    if (!preview.allowed) { failure = preview.failure; break; }
    projected = resolve(projected, previewCommand(projected, action)).nextState;
  }
  const completePreview = previews.length === steps.length && previews.every(preview => preview.costs !== null);
  return { ...source, navigation, steps, previews, available: failure === null, failure,
    costs: completePreview ? total : null, deficits };
}

/** One configured acquisition at a time. Battle rewards require a future win. */
export function getItemSources(game: Game, item: string, purchaseQuantity = 1, kinds?: readonly ItemSource['kind'][]): ItemSource[] {
  validateGame(game);
  if (!Object.hasOwn(C.items, item) || !Number.isSafeInteger(purchaseQuantity) || purchaseQuantity < 1 || purchaseQuantity > C.maxQuantity) fail('INVALID_QUERY', '物品或采购数量无效');
  const allKinds: ItemSource['kind'][] = ['source', 'recipe', 'purchase', 'battle', 'event'];
  if (kinds !== undefined && (!Array.isArray(kinds) || kinds.some(kind => !allKinds.includes(kind)))) fail('INVALID_QUERY', '来源类别无效');
  const selected = new Set(kinds ?? allKinds);
  const result: ItemSource[] = [];
  for (const [id, source] of Object.entries(C.sources)) {
    if (!selected.has('source') || !source.items[item]) continue;
    result.push(sourcePlan(game, { resource: { kind: 'item', id: item }, kind: 'source', id, label: source.name, location: source.location,
      rewardCount: source.items[item], repeatable: true, conditionalOnVictory: false }, [{ type: 'SOURCE', sourceId: id }]));
  }
  for (const [id, recipe] of Object.entries(C.recipes)) {
    if (!selected.has('recipe') || recipe.output !== item) continue;
    result.push(sourcePlan(game, { resource: { kind: 'item', id: item }, kind: 'recipe', id, label: recipe.name, location: 'cave',
      rewardCount: 1, repeatable: true, conditionalOnVictory: false }, [{ type: 'CRAFT', recipeId: id }]));
  }
  if (selected.has('purchase')) result.push(sourcePlan(game, { resource: { kind: 'item', id: item }, kind: 'purchase', id: item, label: `购买${C.items[item].name}`, location: 'market',
    rewardCount: purchaseQuantity, repeatable: true, conditionalOnVictory: false }, [{ type: 'BUY', item, quantity: purchaseQuantity }]));
  for (const [id, enemy] of Object.entries(C.enemies)) {
    if (!selected.has('battle') || !enemy.loot[item] || enemy.trial) continue;
    result.push(sourcePlan(game, { resource: { kind: 'item', id: item }, kind: 'battle', id, label: enemy.name, location: enemy.location,
      rewardCount: enemy.loot[item], repeatable: true, conditionalOnVictory: true }, [{ type: 'ENCOUNTER', enemy: id }]));
  }
  for (const [id, story] of Object.entries(stories)) {
    if (!selected.has('event')) continue;
    for (const option of story.options) {
      if (!conditionMatches(game, option.condition)) continue;
      const rewardCount = option.gain?.[item];
      if (!rewardCount) continue;
      const actions: Action[] = game.core.activeEvent?.id === id ? [] : [{ type: 'EVENT', event: id }];
      actions.push({ type: 'DECIDE', option: option.id });
      result.push(sourcePlan(game, { resource: { kind: 'item', id: item }, kind: 'event', id: `${id}:${option.id}`, label: `${story.name} · ${option.label}`,
        location: story.location, rewardCount, repeatable: false, conditionalOnVictory: false }, actions));
    }
  }
  return result;
}

export function getCurrencySources(game: Game): ItemSource[] {
  validateGame(game);
  return Object.entries(C.sources).filter(([, source]) => source.stones > 0).map(([id, source]) =>
    sourcePlan(game, { resource: { kind: 'stones' }, kind: 'source', id, label: source.name,
      location: source.location, rewardCount: source.stones, repeatable: true, conditionalOnVictory: false },
    [{ type: 'SOURCE', sourceId: id }]));
}

/** Preparation data also serves skill/relic targets without another UI formula. */
export function getActionResources(game: Game, action: Action) {
  const preview = previewAction(game, action);
  return { preview,
    materials: preview.deficits.flatMap(deficit => deficit.kind === 'item' && deficit.id ?
      [{ deficit, sources: getItemSources(game, deficit.id, deficit.missing) }] : []),
    currency: preview.deficits.some(deficit => deficit.kind === 'stones') ? getCurrencySources(game) : [] };
}

export function getBreakthroughGoal(game: Game) {
  validateGame(game);
  const phase = gamePhase(game), realm = C.realms[game.core.player.realm];
  if (game.status !== 'active') return { phase, title: game.status === 'ascended' ? '此生已飞升' : game.ending === 'retired' ? '此生主动归隐' : '此生寿元已尽',
    action: null, preview: null, deficits: [], sources: [], targetRealm: null };
  if (game.trial) return { phase, title: phase === 'trial-question' ? '回答问心' : phase === 'trial-ending' ? '选择此生结尾' : '渡过当前天劫',
    action: null, preview: null, deficits: [], sources: [], targetRealm: 'ascended' as C.RealmId };
  const action: Action = { type: game.core.player.realm === 'spirit' ? 'START_TRIAL' : 'BREAKTHROUGH' };
  const preview = previewAction(game, action);
  return { phase, title: game.core.player.realm === 'mortal' ? '引气入体' : game.core.player.realm === 'spirit' ? '筹备渡劫' : `筹备${C.realms[realm.next!].name}`,
    action, preview, deficits: preview.deficits,
    sources: realm.pill ? getItemSources(game, realm.pill) : [], targetRealm: realm.next ?? 'ascended' };
}


export function getStoryContext(game: Game, id: string) {
  validateGame(game);
  if (!Object.hasOwn(stories, id)) fail('INVALID_QUERY', '未知人物事件');
  return structuredClone(storyView(game, stories[id]));
}
export function getRelationships(game: Game) { validateGame(game); return structuredClone(relationshipViews(game)); }
export function getCausalAid(game: Game) { validateGame(game); return causalAid(game); }


export function getLifeOverview(game: Game) { validateGame(game); return lifeOverview(game); }
export function getLifeRecord(game: Game) { validateGame(game); return buildLifeRecord(game); }
export function exportLifeText(game: Game) { validateGame(game); return lifeRecordText(buildLifeRecord(game)); }


/** Shared START_TRIAL quote is the sole eligibility authority; recommendations never become gates. */
export function getTrialPreparation(game: Game) {
  validateGame(game);
  const preview = previewAction(game, { type: 'START_TRIAL' }), requirements = preview.requirements;
  const costs = preview.costs!, player = game.core.player, currentStats = stats(game), phase = gamePhase(game);
  const loadout = (['mind','builder','finisher'] as const).map(slot => ({ slot, id: game.loadout[slot], name: game.loadout[slot] ? C.skills[game.loadout[slot]!].name : '未装备' }));
  const items = Object.entries(costs.items).map(([id, quantity]) => ({ id, name: C.items[id].name, have: game.core.inventory[id], quantity, ready: game.core.inventory[id] >= quantity }));
  const mandatory = [
    { id: 'realm', label: '境界', ready: player.realm === requirements.minRealm, value: C.realms[player.realm].name, need: C.realms[requirements.minRealm!].name },
    { id: 'xp', label: '修为', ready: player.xp >= requirements.xp!, value: String(player.xp), need: String(requirements.xp) },
    { id: 'school', label: '合法修法与功法槽', ready: !!game.school && loadout.every(slot => !!slot.id), value: game.school === 'sword' ? '剑修' : game.school === 'talisman' ? '符修' : '尚未择法', need: '已选择修法并具备合法配装' },
    { id: 'hp', label: '入场气血', ready: player.hp >= requirements.hp!, value: String(player.hp), need: String(requirements.hp) },
    { id: 'location', label: '地点', ready: game.core.world.location === requirements.location, value: C.locations[game.core.world.location].name, need: C.locations[requirements.location!].name },
    { id: 'phase', label: '当前状态', ready: phase === 'idle', value: phase === 'idle' ? '可自行行动' : '先处理当前遭遇或结局', need: '没有未决事件、战斗或进行中的天劫' },
  ];
  return { identity: { runId: game.core.runId, revision: game.core.revision }, preview, mandatory, items, costs,
    canEnter: preview.allowed, failure: preview.failure, entryLocation: requirements.location!,
    preparation: { loadout, school: game.school, relic: game.loadout.relic ? C.relics[game.loadout.relic].name : '未装备法宝',
      hp: player.hp, maxHp: currentStats.maxHp, mp: player.mp, maxMp: currentStats.maxMp,
      medicine: ['healing_pill','spirit_pill'].map(id => ({ id, name: C.items[id].name, quantity: game.core.inventory[id] })),
      aid: causalAid(game), guard: currentStats.guard, manualDamageBonus: currentStats.manualDamageBonus, markDamage: currentStats.markDamage },
    snapshotSummary: { realm: C.realms[player.realm].name, name: player.name, elapsedMonths: game.core.world.elapsedMonths, stones: player.stones,
      ageMonths: player.startAgeMonths + game.core.world.elapsedMonths, manualOwned: !!game.core.learnedSkills.length, milestoneCount: Object.keys(game.milestones).length,
      learned: game.learned.map(id => C.skills[id].name), relics: game.ownedRelics.map(id => C.relics[id].name),
      inventory: Object.entries(game.core.inventory).filter(([,n]) => n > 0).map(([id,n]) => ({ id, name: C.items[id].name, quantity: n })),
      choiceCount: Object.keys(game.choices).length, school: game.school },
  };
}


export function getTrialJourney(game: Game) {
  validateGame(game);
  if (!game.trial) return null;
  const stage = game.trial.stage, answer = game.trial.answer;
  const opening = {
    help: '雨夜里，你赠出回春丹相助；这一选择仍是来路的一部分。',
    trade: '雨夜里，你以丹换简，彼此两清；问心不会将交易改写成赠药。',
    leave: '雨夜里，你保留丹药，各自离开；今日的问心不会补写未曾发生的救助。',
  };
  return { stage, completed: Math.max(0, stage - 1), answer,
    answerLabel: answer ? TRIAL_ANSWERS[answer].label : null,
    effect: answer ? TRIAL_ANSWERS[answer].record : null,
    title: stage === 0 ? '入场已保存 · 待答问心' : stage === 4 ? '三关已过 · 待择结尾' : C.enemies[TRIAL_STAGES[stage - 1]].name,
    steps: [{ id: 'question', name: '问心选择', status: stage === 0 ? 'current' : 'complete' },
      ...TRIAL_STAGES.map((id, index) => ({ id, name: C.enemies[id].name,
        status: stage > index + 1 ? 'complete' : stage === index + 1 ? 'current' : 'pending' }))],
    openingMemory: game.core.openingChoice ? opening[game.core.openingChoice] : '',
    memories: relationshipViews(game).flatMap(person => person.facts.map(fact => ({ person: person.name, id: fact.id, title: fact.title, text: fact.text }))),
    answers: (Object.keys(TRIAL_ANSWERS) as Array<keyof typeof TRIAL_ANSWERS>).map(id => ({ id,
      ...TRIAL_ANSWERS[id], preview: previewAction(game, { type: 'ANSWER_TRIAL', answer: id }) })),
  };
}

/** Only an adjacent, same-run persisted transition proves a just-ended trial. */
export function getTrialRecovery(game: Game, previous: Game | null, checkpoint: SaveCheckpoint | null) {
  validateGame(game);
  if (!previous) return null;
  validateGame(previous);
  if (game.status !== 'active' || game.trial || game.battle || game.core.mode !== 'idle' || game.core.player.realm !== 'spirit' ||
      game.core.world.location !== 'cave' || !previous.trial || !previous.battle || previous.trial.stage < 1 || previous.trial.stage > 3 ||
      game.core.runId !== previous.core.runId || game.core.revision !== previous.core.revision + 1) return null;
  const prepared = checkpoint?.kind === 'trial' && checkpoint.sourceRunId === game.core.runId &&
    checkpoint.sourceRevision === checkpoint.snapshot.core.revision && checkpoint.sourceRunId === checkpoint.snapshot.core.runId &&
    checkpoint.sourceRevision < previous.core.revision ? checkpoint.snapshot : null;
  if (prepared) validateGame(prepared);
  // Trials have no loot and cannot buy, sell or craft. If this invariant is not evidenced, do not infer consumption.
  const known = !!prepared && prepared.core.world.elapsedMonths === game.core.world.elapsedMonths &&
    Object.keys(C.items).every(id => prepared.core.inventory[id] >= game.core.inventory[id]);
  return { stage: previous.trial.stage, stageName: C.enemies[previous.battle.enemy].name,
    answer: previous.trial.answer, reason: game.journal.at(-1) ?? '', consumptionKnown: known,
    consumed: known ? Object.keys(C.items).flatMap(id => {
      const quantity = prepared!.core.inventory[id] - game.core.inventory[id];
      return quantity > 0 ? [{ id, name: C.items[id].name, quantity }] : [];
    }) : [],
    inventory: ['ascension_seal', 'healing_pill', 'spirit_pill'].map(id => ({ id, name: C.items[id].name, quantity: game.core.inventory[id] })),
  };
}


/** Review is factual preparation data; only the shared END preview grants eligibility. */
export function getAscensionChoices(game: Game) {
  validateGame(game);
  const record = buildLifeRecord(game);
  return { identity: { runId: game.core.runId, revision: game.core.revision },
    record,
    choices: (Object.keys(ASCENSION_ENDINGS) as AscensionEnding[]).map(ending => ({ ending,
      ...ASCENSION_ENDINGS[ending], preview: previewAction(game, { type: 'END', ending }) })),
  };
}
