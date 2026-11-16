import { nextTick } from 'vue';
import { createOwners } from './app-owners-harness';
import { useFirstPractice } from '../src/use-first-practice';
import { practiceLesson, type PracticeKind } from '../src/first-practice';
import type { Game } from '../../src/full/types';
export { RuleError } from '../../src/full/errors.ts';

export async function createPracticeOwners(game: Game) {
  const owners = await createOwners(game),
    dialog = document.createElement('dialog');
  dialog.id = 'practice-native-dialog';
  dialog.innerHTML =
    '<h2 tabindex="-1" data-dialog-initial>入门练手</h2><button id="practice-native-page">翻阅一页</button>';
  owners.host.append(dialog);
  const practice = owners.scope.run(() =>
    useFirstPractice(owners.store, owners.focus, owners.plans, {
      owner: () => owners.navigation.owner.value,
      context: () =>
        JSON.stringify([
          owners.navigation.hubView.value,
          owners.navigation.tab.value,
        ]),
      dialog: () => dialog,
      closeHelp: () => {},
      fallback: () => owners.host.querySelector('#owners-anchor'),
      inspect: (request) => owners.destinations.inspectCaveDestination(request),
      battle: () => owners.navigation.selectTab('修行'),
    }),
  )!;
  await nextTick();
  return {
    ...owners,
    practice,
    dialog,
    intent(kind: PracticeKind) {
      return {
        kind,
        source: { ...practiceLesson(owners.store.game!, kind).source },
      };
    },
  };
}
