import type { Game, Action, Command } from './types.ts';
import type { RealmId } from './content.ts';
import type { SaveVersions } from './versions.ts';

export const GAME_PHASES = Object.freeze(['opening', 'event', 'idle', 'battle', 'trial-question', 'trial-battle', 'trial-ending', 'ascended', 'ended'] as const);
export type GamePhase = typeof GAME_PHASES[number];
export const BATCH_STOP_CODES: readonly string[] = Object.freeze(['XP_CAP', 'AGE_LIMIT', 'TARGET_MET', 'INSUFFICIENT_STONES', 'INSUFFICIENT_ITEM', 'CAPACITY']);
export function gamePhase(game: Game): GamePhase {
  if (game.status !== 'active') return game.status;
  if (game.trial) return game.trial.stage === 0 ? 'trial-question' : game.trial.stage === 4 ? 'trial-ending' : 'trial-battle';
  if (game.battle) return 'battle';
  if (game.core.mode === 'event') return game.core.activeEvent?.id === 'temple' ? 'opening' : 'event';
  return 'idle';
}
export interface RuleFailure { code: string; message: string; }
export interface ActionCosts { stones: number; mp: number; months: number; items: Record<string, number>; }
export interface StateDelta {
  stones: number; xp: number; hp: number; mp: number; months: number; wins: number;
  inventory: Record<string, number>;
  realm: { before: RealmId; after: RealmId };
}
export interface ActionResult {
  commandId: string; runId: string; type: Action['type'];
  revisionBefore: number; revisionAfter: number;
  requestedSteps: number; executedSteps: number;
  stopReason: RuleFailure | null;
  phaseBefore: GamePhase; phaseAfter: GamePhase;
  costs: ActionCosts; delta: StateDelta; versions: SaveVersions;
}
export type CheckpointKind = 'breakthrough' | 'trial';
export interface Resolution { nextState: Game; result: ActionResult; checkpointKind: CheckpointKind | null; }
export interface CommandReceipt {
  format: 'chenyuan-receipt'; version: 1; command: Command;
  fingerprint: string; result: ActionResult;
}
/** On replay, result describes the original command; state is the latest snapshot. */
export interface CommitOutcome { state: Game; result: ActionResult; replayed: boolean; }
export interface SaveCheckpoint {
  format: 'chenyuan-checkpoint'; version: 1; kind: CheckpointKind;
  sourceRunId: string; sourceRevision: number; versions: SaveVersions; snapshot: Game;
}
