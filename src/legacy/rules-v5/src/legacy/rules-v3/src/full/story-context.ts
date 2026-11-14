import { rank } from './content.ts';
import type { Game } from './types.ts';
import { stories } from './events.ts';
import type { Story, StoryCondition } from './events.ts';

/** Conditions concern immutable choices, not current inventory or a hidden morality score. */
export function conditionMatches(game: Game, condition?: StoryCondition): boolean {
  return choiceConditionMatches(game.core.openingChoice, game.choices, condition);
}
export function choiceConditionMatches(opening: unknown, choices: Record<string, unknown>, condition?: StoryCondition): boolean {
  if (!condition) return true;
  if (condition.opening && !condition.opening.some(choice => choice === opening)) return false;
  return Object.entries(condition.choices ?? {}).every(([id, options]) => options.some(option => option === choices[id]));
}
export function storyView(game: Game, story: Story) {
  const variant = story.variants?.find(candidate => conditionMatches(game, candidate.when));
  return { ...story, body: variant?.body ?? story.body,
    options: story.options.filter(option => conditionMatches(game, option.condition)).map(option => ({ ...option, result: variant?.results?.[option.id] ?? option.result })) };
}
export function causalAid(game: Game) {
  let allDamageReduction = 0, thunderDamageReduction = 0;
  for (const [id, choice] of Object.entries(game.choices)) {
    const aid = stories[id]?.options.find(option => option.id === choice)?.aid;
    allDamageReduction += aid?.allDamageReduction ?? 0;
    thunderDamageReduction += aid?.thunderDamageReduction ?? 0;
  }
  return { allDamageReduction, thunderDamageReduction };
}
const people = [
  { id: 'shen', name: '沈清禾', seal: '禾', events: ['shen_return', 'shen_pact'] },
  { id: 'pei', name: '裴照', seal: '裴', events: ['pei_meet', 'pei_echo', 'pei_pact'] },
  { id: 'lu', name: '陆玄松', seal: '松', events: ['lu_intro', 'lu_teach', 'lu_farewell'] },
  { id: 'yan', name: '砚尘', seal: '砚', events: ['yan_stone', 'yan_mirror', 'yan_gate'] },
];
export function relationshipViews(game: Game) {
  return people.map(person => {
    const facts: Array<{ id: string; title: string; choice: string; text: string }> = [];
    let label = '未识';
    if (person.id === 'shen' && game.core.openingChoice) {
      const choice = game.core.openingChoice;
      label = choice === 'help' ? '相助' : choice === 'trade' ? '相识' : '未识';
      facts.push({ id: 'temple', title: '山雨破庙', choice,
        text: choice === 'help' ? '你在雨夜赠出回春丹，沈清禾记下这次相助。' : choice === 'trade' ? '你以丹换取剑简，彼此两清。' : '你保留丹药，各自离开，尚未正式结识。' });
    }
    for (const id of person.events) {
      const story = stories[id], choice = game.choices[id];
      if (!choice) continue;
      // Historical option identities remain facts even if new content no longer offers them in this context.
      const option = story.options.find(candidate => candidate.id === choice)!;
      facts.push({ id, title: story.name, choice, text: option.memory ?? `你在「${story.name}」时选择了「${option.label}」。` });
      label = option.relationship ?? (choice === 'decline' ? '暂别' : '相识');
    }
    const nextId = person.events.find(id => !Object.hasOwn(game.choices, id) && (!stories[id].requires || Object.hasOwn(game.choices, stories[id].requires!)));
    const next = game.status === 'active' && nextId ? stories[nextId] : null;
    const unlocked = !!next && rank(game.core.player.realm) >= rank(next.min);
    return { ...person, label, facts, summary: facts.at(-1)?.text ?? '尚未会面，没有已发生的相助或约定。',
      next: next ? { id: next.id, name: next.name, location: next.location, min: next.min, unlocked,
        view: unlocked ? storyView(game, next) : null } : null };
  });
}
