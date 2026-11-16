import { isV5Rules, PUBLISHED_V5_RULES_VERSION } from './rule-profile.ts';
import * as published from '../legacy/rules-v5/src/full/queries.ts';
import { isPreviousRules, PREVIOUS_RULES_VERSION } from './rule-profile.ts';
import { legacyCheckpoint } from './rule-profile.ts';
import * as current from './queries-current.ts';
import * as old from '../legacy/rules-v3/src/full/queries.ts';
import * as prior from '../legacy/rules-v4/src/full/queries.ts';
import { isLegacyRules, legacyCall, rulesVersion } from './rule-profile.ts';
export * from './queries-current.ts';
import { buildLifeLedger } from './life-ledger.ts';
import { validateGame } from './engine.ts';
import type { Game } from './types.ts';
import { stories } from './events.ts';
import { storyInIncarnation } from './incarnation.ts';
import { contentForGame } from './rule-content.ts';
export function getLifeLedger(game: Game) {
  validateGame(game);
  return buildLifeLedger(game, getLifeRecord(game));
}
export function getLocalStoryAtlas(game: Game) {
  validateGame(game);
  const content = contentForGame(game);
  return Object.keys(stories)
    .filter((id) => id.startsWith('local_'))
    .map((id) => {
      const story = getStoryContext(game, id),
        inLife = storyInIncarnation(game, id),
        completed = Object.hasOwn(game.choices, id);
      return {
        id,
        inLife,
        completed,
        label: completed
          ? '本卷已记'
          : !inLife
            ? '未入本卷'
            : game.status !== 'active'
              ? '本卷有缘 · 已收卷未遇'
              : content.rank(game.core.player.realm) < content.rank(story.min)
                ? '后续有缘'
                : '本卷有缘',
        location: story.location,
        locationName: content.locations[story.location].name,
        realmName: content.realms[story.min].name,
        story,
      };
    });
}
export const previewAction: typeof current.previewAction = (game, ...args) =>
  isLegacyRules(game)
    ? legacyCall(() => old.previewAction(game, ...args))
    : isPreviousRules(game)
      ? legacyCall(() => prior.previewAction(game, ...args))
      : isV5Rules(game)
        ? legacyCall(() => published.previewAction(game, ...args))
        : current.previewAction(game, ...args);
export const costDeficits: typeof current.costDeficits = (game, ...args) =>
  isLegacyRules(game)
    ? legacyCall(() => old.costDeficits(game, ...args))
    : isPreviousRules(game)
      ? legacyCall(() => prior.costDeficits(game, ...args))
      : isV5Rules(game)
        ? legacyCall(() => published.costDeficits(game, ...args))
        : current.costDeficits(game, ...args);
export const getItemSources: typeof current.getItemSources = (game, ...args) =>
  isLegacyRules(game)
    ? legacyCall(() => old.getItemSources(game, ...args))
    : isPreviousRules(game)
      ? legacyCall(() => prior.getItemSources(game, ...args))
      : isV5Rules(game)
        ? legacyCall(() => published.getItemSources(game, ...args))
        : current.getItemSources(game, ...args);
export const getCurrencySources: typeof current.getCurrencySources = (
  game,
  ...args
) =>
  isLegacyRules(game)
    ? legacyCall(() => old.getCurrencySources(game, ...args))
    : isPreviousRules(game)
      ? legacyCall(() => prior.getCurrencySources(game, ...args))
      : isV5Rules(game)
        ? legacyCall(() => published.getCurrencySources(game, ...args))
        : current.getCurrencySources(game, ...args);
export const getActionResources: typeof current.getActionResources = (
  game,
  ...args
) =>
  isLegacyRules(game)
    ? legacyCall(() => old.getActionResources(game, ...args))
    : isPreviousRules(game)
      ? legacyCall(() => prior.getActionResources(game, ...args))
      : isV5Rules(game)
        ? legacyCall(() => published.getActionResources(game, ...args))
        : current.getActionResources(game, ...args);
export const getBreakthroughGoal: typeof current.getBreakthroughGoal = (
  game,
  ...args
) =>
  isLegacyRules(game)
    ? legacyCall(() => old.getBreakthroughGoal(game, ...args))
    : isPreviousRules(game)
      ? legacyCall(() => prior.getBreakthroughGoal(game, ...args))
      : isV5Rules(game)
        ? legacyCall(() => published.getBreakthroughGoal(game, ...args))
        : current.getBreakthroughGoal(game, ...args);
export const getStoryContext: typeof current.getStoryContext = (
  game,
  ...args
) =>
  isLegacyRules(game)
    ? legacyCall(() => old.getStoryContext(game, ...args))
    : isPreviousRules(game)
      ? legacyCall(() => prior.getStoryContext(game, ...args))
      : isV5Rules(game)
        ? legacyCall(() => published.getStoryContext(game, ...args))
        : current.getStoryContext(game, ...args);
export const getRelationships: typeof current.getRelationships = (
  game,
  ...args
) =>
  isLegacyRules(game)
    ? legacyCall(() => old.getRelationships(game, ...args))
    : isPreviousRules(game)
      ? legacyCall(() => prior.getRelationships(game, ...args))
      : isV5Rules(game)
        ? legacyCall(() => published.getRelationships(game, ...args))
        : current.getRelationships(game, ...args);
export const getCausalAid: typeof current.getCausalAid = (game, ...args) =>
  isLegacyRules(game)
    ? legacyCall(() => old.getCausalAid(game, ...args))
    : isPreviousRules(game)
      ? legacyCall(() => prior.getCausalAid(game, ...args))
      : isV5Rules(game)
        ? legacyCall(() => published.getCausalAid(game, ...args))
        : current.getCausalAid(game, ...args);
export const getLifeOverview: typeof current.getLifeOverview = (
  game,
  ...args
) =>
  isLegacyRules(game)
    ? legacyCall(() => old.getLifeOverview(game, ...args))
    : isPreviousRules(game)
      ? legacyCall(() => prior.getLifeOverview(game, ...args))
      : isV5Rules(game)
        ? legacyCall(() => published.getLifeOverview(game, ...args))
        : current.getLifeOverview(game, ...args);
export const getLifeRecord: typeof current.getLifeRecord = (game, ...args) =>
  isLegacyRules(game)
    ? legacyCall(() => old.getLifeRecord(game, ...args))
    : isPreviousRules(game)
      ? legacyCall(() => prior.getLifeRecord(game, ...args))
      : isV5Rules(game)
        ? legacyCall(() => published.getLifeRecord(game, ...args))
        : current.getLifeRecord(game, ...args);
export const exportLifeText: typeof current.exportLifeText = (game, ...args) =>
  isLegacyRules(game)
    ? legacyCall(() => old.exportLifeText(game, ...args))
    : isPreviousRules(game)
      ? legacyCall(() => prior.exportLifeText(game, ...args))
      : isV5Rules(game)
        ? legacyCall(() => published.exportLifeText(game, ...args))
        : current.exportLifeText(game, ...args);
export const getTrialPreparation: typeof current.getTrialPreparation = (
  game,
  ...args
) =>
  isLegacyRules(game)
    ? legacyCall(() => old.getTrialPreparation(game, ...args))
    : isPreviousRules(game)
      ? legacyCall(() => prior.getTrialPreparation(game, ...args))
      : isV5Rules(game)
        ? legacyCall(() => published.getTrialPreparation(game, ...args))
        : current.getTrialPreparation(game, ...args);
export const getTrialJourney: typeof current.getTrialJourney = (
  game,
  ...args
) =>
  isLegacyRules(game)
    ? legacyCall(() => old.getTrialJourney(game, ...args))
    : isPreviousRules(game)
      ? legacyCall(() => prior.getTrialJourney(game, ...args))
      : isV5Rules(game)
        ? legacyCall(() => published.getTrialJourney(game, ...args))
        : current.getTrialJourney(game, ...args);
export const getAscensionChoices: typeof current.getAscensionChoices = (
  game,
  ...args
) =>
  isLegacyRules(game)
    ? legacyCall(() => old.getAscensionChoices(game, ...args))
    : isPreviousRules(game)
      ? legacyCall(() => prior.getAscensionChoices(game, ...args))
      : isV5Rules(game)
        ? legacyCall(() => published.getAscensionChoices(game, ...args))
        : current.getAscensionChoices(game, ...args);
export const getTrialRecovery: typeof current.getTrialRecovery = (
  game,
  previous,
  checkpoint,
) => {
  if (
    (previous && rulesVersion(previous) !== rulesVersion(game)) ||
    (checkpoint && rulesVersion(checkpoint.snapshot) !== rulesVersion(game))
  )
    return null;
  return isLegacyRules(game)
    ? legacyCall(() =>
        old.getTrialRecovery(game, previous, legacyCheckpoint(checkpoint)),
      )
    : isPreviousRules(game)
      ? legacyCall(() => prior.getTrialRecovery(game, previous, checkpoint))
      : isV5Rules(game)
        ? legacyCall(() =>
            published.getTrialRecovery(game, previous, checkpoint),
          )
        : current.getTrialRecovery(game, previous, checkpoint);
};
