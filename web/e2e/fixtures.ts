import { createAdventure, advance } from '../../src/game/adventure.ts';
import { driver } from '../../tests/full-route.mjs';
import type { Page } from '@playwright/test';

export function legacyFixture(stage: 'opening' | 'battle' | 'foundation') {
  let game = createAdventure('旧档测试', 'legacy-ui-' + stage), checkpoint: unknown;
  const act = (action: any) => {
    if (action.type === 'BREAKTHROUGH') checkpoint = structuredClone(game);
    game = advance(game, { ...action, commandId: 'legacy-' + game.core.revision, runId: game.core.runId, expectedRevision: game.core.revision });
  };
  if (stage !== 'opening') {
    for (const action of [{ type: 'CHOOSE', choice: 'leave' }, { type: 'TRAVEL', location: 'cave' },
      { type: 'CULTIVATE', method: 'natural', count: 5 }, { type: 'BREAKTHROUGH' }, { type: 'SCHOOL', school: 'sword' }]) act(action);
    if (stage === 'battle') {
      for (const action of [{ type: 'TRAVEL', location: 'wilderness' }, { type: 'ENCOUNTER', enemy: 'wolf' }, { type: 'BATTLE', move: 'attack' }]) act(action);
    } else {
      for (const action of [{ type: 'TRAVEL', location: 'sect' }, { type: 'SOURCE', sourceId: 'work', count: 6 },
        { type: 'TRAVEL', location: 'market' }, { type: 'BUY', item: 'foundation_pill', quantity: 1 },
        { type: 'TRAVEL', location: 'cave' }, { type: 'CULTIVATE', method: 'natural', count: 20 }, { type: 'BREAKTHROUGH' }]) act(action);
    }
  }
  return { current: game, checkpoint };
}
export async function seedLegacy(page: Page, fixture: ReturnType<typeof legacyFixture>) {
  await page.addInitScript(({ current, checkpoint }) => {
    const key = 'legacy-fixture-seeded';
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, 'yes');
    const request = indexedDB.open('chenyuan-playable-v1', 1);
    request.onupgradeneeded = () => { request.result.createObjectStore('state'); request.result.createObjectStore('receipts'); };
    request.onsuccess = () => {
      const db = request.result; db.onversionchange = () => db.close();
      const tx = db.transaction('state', 'readwrite'); tx.objectStore('state').put(current, 'current');
      if (checkpoint) tx.objectStore('state').put(checkpoint, 'checkpoint');
      tx.oncomplete = () => db.close();
    };
  }, fixture);
}
export function npcFixture() {
  const d = driver(); d.realm(); d.resource('herb', 2); d.go('sect'); d.doAction({ type: 'EVENT', event: 'shen_return' });
  return d.game;
}
