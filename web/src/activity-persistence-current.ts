import { validateActivity, validateActivityMutation, validateActivityPlan, validateActivityTick, completeActivity, preparationCycleAction } from '../../src/full/activity.ts';
import { canonicalFingerprint as fingerprint, validateCommandReceipt } from '../../src/full/receipts.ts';
import { RuleError } from '../../src/full/errors.ts';
import type { Activity, ActivityMutation, ActivityPlan, ActivityTick } from '../../src/full/activity.ts';
import type { ActionResult } from '../../src/full/contracts.ts';
import type { Command, Game } from '../../src/full/types.ts';
import * as C from '../../src/full/content.ts';
import { costsForAction } from '../../src/full/costs.ts';
import { validateGame } from '../../src/full/engine.ts';
import {assertActivityRules,rulesVersion} from '../../src/full/rule-profile.ts';

export type ActivityReceiptInput =
  | { kind: 'START'; plan: ActivityPlan; mutation: ActivityMutation }
  | { kind: 'PAUSE' | 'RESUME'; mutation: ActivityMutation }
  | { kind: 'TICK'; tick: ActivityTick };
export interface ActivityReceipt {
  format: 'chenyuan-activity-receipt'; version: 1 | 2; input: ActivityReceiptInput; fingerprint: string;
  activity: Activity; command: Command | null; result: ActionResult | null;
  proof?: { activityBefore: Activity; stateAfter: Game; resolvedAt: number };
}
function invalid(): never { throw new RuleError('RECEIPT_INVALID', '活动回执损坏，未重复执行或覆盖原记录'); }
function shape(value: unknown, fields: string[]): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== fields.length ||
      Object.keys(value).some(key => !fields.includes(key))) invalid();
}
/** Historical activity snapshots are checked structurally; replay returns the current snapshot. */
export function validateActivityReceipt(value: unknown, current: Game): asserts value is ActivityReceipt {
  try {
    const proven = !!value && typeof value === 'object' && 'version' in value && value.version === 2;
    shape(value, ['format', 'version', 'input', 'fingerprint', 'activity', 'command', 'result', ...(proven ? ['proof'] : [])]);
    if (value.format !== 'chenyuan-activity-receipt' || value.version !== 1 && value.version !== 2) invalid();
    const input = value.input as ActivityReceiptInput;
    if (!input || typeof input !== 'object' || !('kind' in input)) invalid();
    if (input.kind === 'START') {
      shape(input, ['kind', 'plan', 'mutation']); validateActivityPlan(input.plan); validateActivityMutation(input.mutation);
    } else if (input.kind === 'PAUSE' || input.kind === 'RESUME') {
      shape(input, ['kind', 'mutation']); validateActivityMutation(input.mutation);
    } else if (input.kind === 'TICK') {
      shape(input, ['kind', 'tick']); validateActivityTick(input.tick);
    } else invalid();
    if (value.fingerprint !== fingerprint(input)) invalid();
    assertActivityRules(value.activity,current);validateActivity(value.activity);
    const activity = value.activity, intent = input.kind === 'TICK' ? input.tick : input.mutation;
    if (activity.runId !== current.core.runId || intent.runId !== current.core.runId || activity.gameRevision > current.core.revision) invalid();
    if (input.kind === 'TICK') {
      if (!value.command || !value.result) invalid();
      const receipt = { format: 'chenyuan-receipt', version: 1, command: value.command,
        fingerprint: fingerprint(value.command), result: value.result };
      validateCommandReceipt(receipt, current);
      const command = receipt.command;
      const identity = { commandId: input.tick.commandId, runId: input.tick.runId, expectedRevision: input.tick.expectedRevision };
      let proof: { activityBefore: Activity; stateAfter: Game; resolvedAt: number } | null = null;
      if (activity.version === 5 || activity.version === 6 || activity.version === 7) {
        if (!proven) invalid();
        shape(value.proof, ['activityBefore', 'stateAfter', 'resolvedAt']);
        assertActivityRules(value.proof.activityBefore,current);validateActivity(value.proof.activityBefore); validateGame(value.proof.stateAfter);
        if(rulesVersion(value.proof.stateAfter)!==rulesVersion(current))invalid();
        if (value.proof.activityBefore.version !== activity.version || value.proof.activityBefore.id !== activity.id ||
            value.proof.activityBefore.revision !== input.tick.expectedActivityRevision ||
            value.proof.activityBefore.generation !== input.tick.generation || value.proof.activityBefore.ownerId !== input.tick.ownerId ||
            value.proof.stateAfter.core.runId !== current.core.runId || value.proof.stateAfter.core.revision > current.core.revision ||
            !Number.isSafeInteger(value.proof.resolvedAt) || Number(value.proof.resolvedAt) < 0) invalid();
        proof = value.proof as unknown as NonNullable<ActivityReceipt['proof']>;
      }
      const expected: Command = activity.version === 6 || activity.version === 7 ? proof!.activityBefore.nextCommand! :
        activity.version === 5 ? { ...preparationCycleAction(activity.plan, activity.completedCycles - 1), ...identity } :
        activity.version === 1 ? { type: 'CULTIVATE', method: activity.plan.method, count: 1, ...identity } :
        activity.version === 2 ? { type: 'SOURCE', sourceId: activity.plan.sourceId, count: 1,
          ...(activity.plan.target?.kind === 'item' ? { target: { item: activity.plan.target.id, quantity: activity.plan.target.quantity } } : {}), ...identity } :
        activity.version === 3 ? { type: 'CRAFT', recipeId: activity.plan.recipeId, ...identity } :
          { type: 'FORGE', relic: activity.plan.relicId, ...identity };
      if (fingerprint(command) !== fingerprint(expected) || command.commandId !== identity.commandId || command.runId !== identity.runId ||
          command.expectedRevision !== identity.expectedRevision || activity.id !== input.tick.activityId ||
          activity.ownerId !== input.tick.ownerId || activity.generation !== input.tick.generation || activity.completedCycles < 1 ||
          command.commandId !== `cycle:${activity.id}:${activity.generation}:${activity.completedCycles}` ||
          activity.revision !== input.tick.expectedActivityRevision + 1 || activity.gameRevision !== input.tick.expectedRevision + 1) invalid();
      const result = receipt.result, delta = result.delta;
      if (delta.realm.before !== activity.realm || activity.version !== 7 && delta.realm.after !== activity.realm ||
          activity.version !== 6 && delta.wins !== 0) invalid();
      if (proof) {
        const completed = completeActivity(proof.stateAfter, proof.activityBefore, result,
          { commandId: command.commandId, now: proof.resolvedAt });
        if (fingerprint(completed) !== fingerprint(activity)) invalid();
      } else if (proven || delta.hp !== 0 || delta.mp !== 0) invalid();
      else if (activity.version === 2) {
        const source = C.sources[activity.plan.sourceId];
        if (fingerprint(result.costs) !== fingerprint({ stones: 0, mp: 0, months: source.months, items: {} }) ||
            delta.stones !== source.stones || fingerprint(delta.inventory) !== fingerprint(source.items) ||
            delta.xp < 0 || delta.xp > source.xp) invalid();
      } else if (activity.version === 1) {
        const stones = activity.plan.method === 'assisted' ? C.assistedCosts[activity.realm] : C.cultivation.natural.stones;
        if (fingerprint(result.costs) !== fingerprint({ stones, mp: 0, months: C.cultivation[activity.plan.method].months, items: {} }) ||
            delta.stones !== -stones || Object.keys(delta.inventory).length !== 0 || delta.xp < 1) invalid();
      } else {
        const costs = costsForAction(current, expected), inventory: Record<string, number> = {};
        for (const [id, quantity] of Object.entries(costs.items)) inventory[id] = -quantity;
        if (activity.version === 3) {
          const output = C.recipes[activity.plan.recipeId].output;
          inventory[output] = (inventory[output] ?? 0) + 1;
          if (inventory[output] === 0) delete inventory[output];
        } else if (activity.version === 4) {
          if (!current.ownedRelics.includes(activity.plan.relicId) ||
              activity.gameRevision === current.core.revision && current.loadout.relic !== activity.relicBefore) invalid();
        } else invalid();
        if (fingerprint(result.costs) !== fingerprint(costs) || delta.stones !== -costs.stones || delta.xp !== 0 ||
            fingerprint(delta.inventory) !== fingerprint(inventory)) invalid();
      }
    } else {
      if (proven) invalid();
      if (value.command !== null || value.result !== null || activity.gameRevision !== intent.expectedRevision || activity.ownerId !== input.mutation.ownerId) invalid();
      if (input.kind === 'START') {
        if (activity.status !== 'running' || activity.revision !== 0 || activity.generation !== 0 || activity.completedCycles !== 0 ||
            fingerprint(activity.plan) !== fingerprint(input.plan)) invalid();
      } else if (activity.id !== input.mutation.expectedActivityId || input.mutation.expectedActivityRevision === null ||
          activity.revision !== input.mutation.expectedActivityRevision + 1 ||
          activity.status !== (input.kind === 'PAUSE' ? 'paused' : 'running')) invalid();
    }
  } catch { invalid(); }
}
export function activityReceipt(input: ActivityReceiptInput, activity: Activity, command: Command | null = null, result: ActionResult | null = null,
  proof?: ActivityReceipt['proof']): ActivityReceipt {
  return { format: 'chenyuan-activity-receipt', version: proof ? 2 : 1, input: structuredClone(input), fingerprint: fingerprint(input),
    activity: structuredClone(activity), command: command ? structuredClone(command) : null, result: result ? structuredClone(result) : null,
    ...(proof ? { proof: structuredClone(proof) } : {}) };
}
