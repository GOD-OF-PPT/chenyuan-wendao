import type { Action, Command, Game } from './types.ts';
import type { ActionCosts, RuleFailure } from './contracts.ts';
import { previewResolution, stats, validateCommand, validateGame } from './engine.ts';
import { RuleError } from './errors.ts';

export type ConfigurationAction = Extract<Action, { type: 'SCHOOL' | 'EQUIP' | 'EQUIP_RELIC' }>;
export type ConfigurationCommand = ConfigurationAction & Pick<Command, 'commandId' | 'runId' | 'expectedRevision'>;
export interface ConfigurationIntent {
  command: ConfigurationCommand; expectedActivityId: string | null; expectedActivityRevision: number | null;
}
export interface ConfigurationState {
  school: Game['school']; loadout: Game['loadout']; learned: string[]; ownedRelics: string[]; manuals: string[];
  cultivationBonus: number; guard: number; markDamage: number; manualDamageBonus: number;
}
export interface ConfigurationPreview {
  allowed: boolean; failure: RuleFailure | null; before: ConfigurationState; after: ConfigurationState; costs: ActionCosts;
}
export function configurationState(game: Game): ConfigurationState {
  validateGame(game); const actual = stats(game);
  return { school: game.school, loadout: { ...game.loadout }, learned: [...game.learned], ownedRelics: [...game.ownedRelics],
    manuals: [...game.core.learnedSkills], cultivationBonus: actual.cultivationBonus, guard: actual.guard,
    markDamage: actual.markDamage, manualDamageBonus: actual.manualDamageBonus };
}
export function validateConfigurationIntent(value: unknown): asserts value is ConfigurationIntent {
  const fail = (): never => { throw new RuleError('INVALID_COMMAND', '配装确认的指令或活动归属无效'); };
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== 3 ||
      Object.keys(value).some(key => !['command', 'expectedActivityId', 'expectedActivityRevision'].includes(key))) fail();
  const intent = value as ConfigurationIntent;
  validateCommand(intent.command);
  if (!['SCHOOL', 'EQUIP', 'EQUIP_RELIC'].includes(intent.command.type)) fail();
  if (intent.command.type === 'SCHOOL' && intent.command.school !== 'sword' && intent.command.school !== 'talisman') fail();
  if (intent.command.type === 'EQUIP' && typeof intent.command.skill !== 'string' ||
      intent.command.type === 'EQUIP_RELIC' && typeof intent.command.relic !== 'string') fail();
  if (intent.expectedActivityId === null ? intent.expectedActivityRevision !== null :
      typeof intent.expectedActivityId !== 'string' || !intent.expectedActivityId.trim() || intent.expectedActivityId.length > 64 ||
      !Number.isSafeInteger(intent.expectedActivityRevision) || Number(intent.expectedActivityRevision) < 0) fail();
}
/** Selection is read-only. Configuration has no invented reward period or hidden travel. */
export function configurationPreview(game: Game, action: ConfigurationAction): ConfigurationPreview {
  const before = configurationState(game), preview = previewResolution(game, action);
  if (!['SCHOOL', 'EQUIP', 'EQUIP_RELIC'].includes(action.type)) throw new RuleError('INVALID_COMMAND', '此处只可确认修法、功法槽或本命法宝');
  return preview.ok ? { allowed: true, failure: null, before, after: configurationState(preview.value.nextState), costs: structuredClone(preview.value.result.costs) } :
    { allowed: false, failure: { code: preview.error.code, message: preview.error.message }, before, after: structuredClone(before),
      costs: { stones: 0, mp: 0, months: 0, items: {} } };
}
