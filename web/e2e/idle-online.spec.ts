import {test, expect, type Page, type Locator} from '@playwright/test';
import {performance} from 'node:perf_hooks';
import {createHash} from 'node:crypto';
import {mkdir, writeFile, readFile, rename} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {assertWebBuild} from '../../scripts/assert-web-build.mjs';
import {newGame, resolve, validateGame} from '../../src/full/engine.ts';
import type {Game} from '../../src/full/types.ts';
import type {Activity, ActivityPlan} from '../../src/full/activity.ts';
import {validateActivityReceipt} from '../src/activity-persistence';
import {validateConfigurationReceipt} from '../src/configuration-persistence';
import * as C from '../../src/full/content.ts';

const OBSERVATION_MS = 30 * 60_000;
const sha = (text: string | Buffer) => createHash('sha256').update(text).digest('hex');
const print = (value: unknown) => sha(JSON.stringify(value));
type NativeSnapshot = {game: Game; activity: Activity | null; receipts: any[];
  wall: number; browserNow: number; timeOrigin: number; visibility: string; focused: boolean};

/** All three stores are observed in one native readonly transaction, after its completion. */
async function persisted(page: Page): Promise<NativeSnapshot> {
  return page.evaluate(() => new Promise<any>((resolveRead, reject) => {
    const request = indexedDB.open('chenyuan-playable-v1');
    request.onupgradeneeded = () => { request.transaction?.abort(); reject(new Error('Readonly observation cannot create a game database')); };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('full-state') || !db.objectStoreNames.contains('full-receipts')) {
        db.close(); reject(new Error('The normal game database is not initialized')); return;
      }
      const tx = db.transaction(['full-state', 'full-receipts'], 'readonly');
      const state = tx.objectStore('full-state');
      const current = state.get('current'), activity = state.get('activity');
      const receipts = tx.objectStore('full-receipts').getAll();
      tx.onerror = () => { db.close(); reject(tx.error); };
      tx.onabort = () => { db.close(); reject(tx.error ?? new Error('Readonly snapshot aborted')); };
      tx.oncomplete = () => {
        db.close();
        resolveRead({game: current.result, activity: activity.result ?? null, receipts: receipts.result,
          wall: Date.now(), browserNow: window.performance.now(), timeOrigin: window.performance.timeOrigin,
          visibility: document.visibilityState, focused: document.hasFocus()});
      };
    };
  }));
}

test('a normal new life remains observable for thirty real online minutes through finite work and recovery controls', async ({page}, info) => {
  test.setTimeout(35 * 60_000);
  const began = performance.now(), utcBegan = new Date().toISOString(), deadline = began + OBSERVATION_MS;
  const build = assertWebBuild(), samples: any[] = [], commits: any[] = [], interventions: any[] = [];
  const segments: any[] = [], observations: any[] = [], errors: string[] = [], screenshots: string[] = [];
  const armed = new Map<string, any>(), receiptIds = new Set<string>(), countdowns = new Map<string, number>();
  const completed = new Set<string>();
  let last: NativeSnapshot | null = null, expected: Game | null = null, clicks = 0, fieldEdits = 0;
  let failure: string | null = null, finished = false, phase = 'boot', lastProgressMs = -15_000;
  const artifactDirectory = fileURLToPath(new URL('../../artifacts/goal-4/u8-c/', import.meta.url));
  const livePath = fileURLToPath(new URL('../../artifacts/goal-4/u8-c/online-live.json', import.meta.url));
  page.on('pageerror', error => errors.push(error.message));
  const host = () => performance.now() - began;
  async function progress(status = 'observing') {
    const data = {sourceDigest: build.sourceDigest, status, utcBegan, utc: new Date().toISOString(),
      elapsedHostMs: host(), intendedObservationMs: OBSERVATION_MS, phase,
      revision: last?.game.core.revision ?? null, realm: last?.game.core.player.realm ?? null,
      activityId: last?.activity?.id ?? null, completedCycles: last?.activity?.completedCycles ?? null,
      activityStatus: last?.activity?.status ?? null, committedCommands: commits.length,
      interventions: interventions.length, failure};
    await mkdir(artifactDirectory, {recursive: true});
    await writeFile(livePath + '.tmp', JSON.stringify(data, null, 2) + '\n');
    await rename(livePath + '.tmp', livePath); lastProgressMs = host();
  }

  async function sample(label: string) {
    const beforeRead = host(), s = await persisted(page), afterRead = host();
    validateGame(s.game);
    if (!expected) {
      expected = newGame(s.game.core.player.name, s.game.core.runId);
      expect(s.game, 'the initial life must be created normally, without a fixture').toEqual(expected);
    }
    expect(s.game.core.runId).toBe(expected.core.runId);
    const transitions = s.receipts.filter(r => r.result?.revisionAfter > expected!.core.revision)
      .sort((a, b) => a.result.revisionAfter - b.result.revisionAfter);
    for (const receipt of transitions) {
      const command = receipt.command ?? receipt.intent?.command;
      expect(command, 'every Game transition needs its native command receipt').toBeTruthy();
      expect(receiptIds.has(command.commandId), 'one command cannot award twice').toBe(false);
      expect(command.expectedRevision).toBe(expected.core.revision);
      const before = expected, formal = resolve(before, command);
      expect(receipt.result).toEqual(formal.result);
      let hostTiming = null;
      if (receipt.format === 'chenyuan-activity-receipt') {
        validateActivityReceipt(receipt, s.game);
        if (receipt.input.kind !== 'TICK') throw new Error('Only a committed activity tick may change Game');
        const seen = armed.get(command.commandId);
        expect(seen, 'the pending cycle must be observed before its saved result').toBeTruthy();
        expect(command).toEqual(seen.activity.nextCommand);
        expect(s.wall, 'native saved results cannot precede the persisted deadline').toBeGreaterThanOrEqual(seen.activity.dueAt);
        const elapsedAtFirstRead = Math.max(0, seen.browserWall - seen.activity.startedAt);
        const latestAdmissionHostMs = seen.firstSeenHostMs - elapsedAtFirstRead;
        const elapsedHostMs = afterRead - latestAdmissionHostMs;
        // Only measured native-read brackets plus integer Date quantization are allowed;
        // there is no blanket half-second discount from the formal cycle duration.
        const toleranceMs = (seen.firstSeenHostMs - seen.beforeReadHostMs) + (afterRead - beforeRead) + 5;
        expect(elapsedHostMs + toleranceMs, 'the observed host interval must cover a complete cycle within its measured read brackets')
          .toBeGreaterThanOrEqual(seen.activity.cycleMs);
        hostTiming = {latestAdmissionHostMs, firstObservedCommitHostMs: afterRead, elapsedHostMs,
          formalCycleMs: seen.activity.cycleMs, toleranceMs, passed: true,
          uncertainty: 'first pending-read span + committing-read span + 5ms integer wall-time quantization'};
        expect(receipt.input.tick.activityId).toBe(seen.activity.id);
        expect(receipt.input.tick.generation).toBe(seen.activity.generation);
        expect(receipt.input.tick.ownerId).toBe(seen.activity.ownerId);
        if (receipt.proof) {
          expect(receipt.proof.stateAfter).toEqual(formal.nextState);
          expect(receipt.proof.resolvedAt).toBeGreaterThanOrEqual(seen.activity.dueAt);
        }
      } else {
        expect(receipt.format).toBe('chenyuan-configuration-receipt');
        validateConfigurationReceipt(receipt, s.game);
      }
      receiptIds.add(command.commandId);
      commits.push({label, firstObservedHostMs: afterRead, utc: new Date().toISOString(), command,
        before, after: formal.nextState, receipt, hostTiming, pendingObservation: armed.get(command.commandId) ?? null});
      expected = formal.nextState;
    }
    expect(s.game, 'the native state must equal the contiguous formally resolved receipt chain').toEqual(expected);
    const a = s.activity;
    if (a?.status === 'running' && a.nextCommand && !armed.has(a.nextCommand.commandId))
      armed.set(a.nextCommand.commandId, {activity: structuredClone(a), beforeReadHostMs: beforeRead, firstSeenHostMs: afterRead,
        browserWall: s.wall, timeOrigin: s.timeOrigin, browserNow: s.browserNow,
        admissionAlreadyElapsedMs: Math.max(0, s.wall - a.startedAt!)});
    const clock = page.getByTestId('training-countdown');
    const clockText = await clock.isVisible() ? await clock.innerText() : null;
    // IDB and DOM are separate observations: a cycle can commit between them.
    // Attribute this frame only when a second native read brackets the same cycle.
    const clockAfter = clockText ? await persisted(page) : null;
    const clockStable = !!a && !!clockAfter?.activity && a.id === clockAfter.activity.id &&
      a.generation === clockAfter.activity.generation && a.nextCommand?.commandId === clockAfter.activity.nextCommand?.commandId;
    let countdownAligned = false;
    if (clockStable && clockText && a?.status === 'running' && a.nextCommand && /^\d/.test(clockText)) {
      const number = parseFloat(clockText), key = a.nextCommand.commandId;
      expect(number).toBeGreaterThanOrEqual(0);
      expect(number).toBeLessThanOrEqual(a.cycleMs / 1000 + .2);
      // A committed snapshot can precede Vue's replacement of the previous 0.0 frame.
      if (countdowns.has(key)) expect(number).toBeLessThanOrEqual(countdowns.get(key)! + .2);
      if (number > .5 || countdowns.has(key)) { countdowns.set(key, number); countdownAligned = true; }
    }
    samples.push({label, beforeReadHostMs: beforeRead, afterReadHostMs: afterRead, utc: new Date().toISOString(),
      browserWall: s.wall, timeOrigin: s.timeOrigin, browserNow: s.browserNow, visibility: s.visibility,
      focused: s.focused, revision: s.game.core.revision, stateHash: print(s.game),
      activityId: a?.id ?? null, activityRevision: a?.revision ?? null, generation: a?.generation ?? null,
      ownerId: a?.ownerId ?? null, completedCycles: a?.completedCycles ?? null,
      status: a?.status ?? null, nextCommandId: a?.nextCommand?.commandId ?? null, countdown: clockText, countdownAligned,
      clockStable, clockAfterCommandId: clockAfter?.activity?.nextCommand?.commandId ?? null});
    last = s;
    if (transitions.length || afterRead - lastProgressMs >= 15_000) await progress();
    expect(errors).toEqual([]);
    await expect(page.getByTestId('error')).toHaveCount(0);
    return s;
  }
  async function hit(control: Locator) {
    await expect(control).toBeVisible(); await expect(control).toBeEnabled();
    const geometry = await control.evaluate(el => {
      const r = el.getBoundingClientRect(), hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      const nav = document.getElementById('primary-navigation')?.getBoundingClientRect();
      return {inside: r.x >= 0 && r.y >= 0 && r.right <= innerWidth && r.bottom <= innerHeight,
        aboveNav: !!el.closest('#primary-navigation') || !nav || r.bottom <= nav.top, hit: !!hit && (hit === el || el.contains(hit))};
    });
    expect(geometry).toEqual({inside: true, aboveNav: true, hit: true});
    clicks++; await control.click();
  }
  async function fill(label: string, value: number) {
    fieldEdits++; await page.getByLabel(label, {exact: true}).fill(String(value));
  }
  async function poll(label: string, predicate: (s: NativeSnapshot) => boolean, limitMs: number) {
    const end = performance.now() + limitMs;
    for (;;) {
      const s = await sample(label);
      if (predicate(s)) return s;
      if (performance.now() >= end) throw new Error(label + ': no expected state by its finite observation bound');
      await page.waitForTimeout(500);
    }
  }
  async function hold(ms: number, label: string, unchanged?: Game) {
    phase = label;
    const end = performance.now() + ms;
    while (performance.now() < end) {
      const s = await sample(label); if (unchanged) expect(s.game).toEqual(unchanged);
      await page.waitForTimeout(Math.min(1000, Math.max(1, end - performance.now())));
    }
    const s = await sample(label + '-end'); if (unchanged) expect(s.game).toEqual(unchanged);
    return s;
  }
  async function home() {
    if (await page.getByTestId('milestone-cancel').isVisible()) await hit(page.getByTestId('milestone-cancel'));
    await hit(page.getByTestId('tab-0'));
  }
  async function screenshot(name: string) {
    const target = info.outputPath(name + '.png'); await page.screenshot({path: target}); screenshots.push(target);
  }
  async function startSegment(label: string, plan: ActivityPlan | null, control: Locator) {
    phase = label;
    const before = await sample(label + '-before'), startedHostMs = host();
    await hit(control);
    const started = await poll(label + '-accepted', s => !!s.activity && s.activity.id !== before.activity?.id && s.activity.status === 'running', 8_000);
    expect(started.game, 'accepting a finite arrangement must not award its first cycle').toEqual(before.game);
    if (plan) expect(started.activity!.plan).toEqual(plan);
    segments.push({label, startedHostMs, acceptedHostMs: host(), plan: started.activity!.plan,
      activityId: started.activity!.id, firstCommand: started.activity!.nextCommand,
      before: before.game, clickCountAtStart: clicks});
    interventions.push({kind: 'finite-authorization', reason: label, atHostMs: host(),
      activityId: started.activity!.id, plan: started.activity!.plan});
    await progress(); console.log(`[online ${Math.round(host()/1000)}s] ${label}: accepted ${started.activity!.id}`);
    return started.activity!;
  }
  async function stopped(label: string, a: Activity, maxMs = a.cycleMs * a.plan.maxCycles + 15_000) {
    phase = label;
    const s = await poll(label + '-automatic', value => value.activity?.id === a.id && value.activity.status !== 'running', maxMs);
    const row = segments.find(row => row.activityId === a.id);
    if (row) Object.assign(row, {endedHostMs: host(), activity: s.activity, after: s.game,
      clickCountAtStop: clicks, automaticWindowClicks: clicks - row.clickCountAtStart});
    expect(s.activity!.status).toBe('stopped'); completed.add(label);
    await progress(); console.log(`[online ${Math.round(host()/1000)}s] ${label}: ${s.activity!.stopReason?.code}, revision ${s.game.core.revision}`);
    return s;
  }
  async function travel(location: C.LocationId) {
    await hit(page.getByTestId('tab-1')); await hit(page.getByTestId('explore-mode-travel'));
    const pager = page.getByRole('navigation', {name: '目的地翻页', exact: true});
    for (let n = 0; !await page.getByTestId('travel-' + location).isVisible() && n < 3; n++)
      await hit(pager.getByTestId('catalogue-next'));
    await hit(page.getByTestId('travel-' + location));
    const plan = {kind: 'travel', location, maxCycles: 1} as const;
    const a = await startSegment('travel-' + location, plan, page.getByTestId('adventure-start'));
    const s = await stopped('travel-' + location, a); expect(s.game.core.world.location).toBe(location);
  }
  async function source(id: string, target: number | null, cycles: number, months: number, label: string) {
    await hit(page.getByTestId('tab-1')); await hit(page.getByTestId('explore-mode-source'));
    await hit(page.getByTestId('source-' + id)); await hit(page.getByTestId('source-plan-open'));
    fieldEdits++; await page.getByLabel('取材次数', {exact: true}).selectOption(target === null ? '5' : 'target');
    if (target !== null) {
      const resource = Object.keys(C.sources[id].items)[0];
      fieldEdits++; await page.getByLabel('目标资源', {exact: true}).selectOption(resource);
      await fill('目标库存', target); await fill('目标最多轮数', cycles);
    }
    const limits = page.getByTestId('source-plan-dialog').locator('.source-limits');
    if (!await limits.evaluate(n => (n as HTMLDetailsElement).open)) await hit(limits.locator('summary'));
    await fill('累计游戏月预算', months); await fill('余寿保留量', 1);
    await hit(page.getByTestId('source-plan-close'));
    const plan: ActivityPlan = {kind: 'source', sourceId: id, maxCycles: target === null ? 5 : cycles,
      until: target === null ? 'cycles' : 'target', target: target === null ? null : {kind: 'item', id: Object.keys(C.sources[id].items)[0], quantity: target},
      monthBudget: months, remainingMonthsReserve: 1};
    const a = await startSegment(label, plan, page.getByTestId('source-start'));
    return stopped(label, a, cycles * C.sources[id].months * 30_000 + 15_000);
  }
  async function production(recipeId: string, quantity: number, cycles: number) {
    await home(); await hit(page.getByTestId('hub-forge')); await hit(page.getByTestId('craft-' + recipeId));
    const intent = page.getByTestId('production-intent-toggle');
    if (await intent.isVisible() && !await intent.evaluate(n => (n.parentElement as HTMLDetailsElement).open)) await hit(intent);
    fieldEdits++; await page.getByLabel('炼丹炉次', {exact: true}).selectOption('target');
    await fill('成品目标库存', quantity); await fill('目标最多炉次', cycles);
    await hit(page.getByTestId('production-limits'));
    const recipe = C.recipes[recipeId];
    await fill('累计生产灵石预算', recipe.stones * cycles); await fill('生产灵石保留量', 0);
    await fill('累计生产游戏月预算', recipe.months * cycles); await fill('生产余寿保留量', 1);
    for (const id of Object.keys(recipe.inputs)) await fill(C.items[id].name + '保留量', 0);
    await hit(page.getByTestId('production-apply-limits'));
    const plan: ActivityPlan = {kind: 'craft', recipeId, maxCycles: cycles, until: 'target', targetQuantity: quantity,
      stoneBudget: recipe.stones * cycles, stoneReserve: 0, monthBudget: recipe.months * cycles,
      remainingMonthsReserve: 1, itemReserves: Object.fromEntries(Object.keys(recipe.inputs).map(id => [id, 0]))};
    const a = await startSegment('production-' + recipeId, plan, page.getByTestId('production-start'));
    return stopped('production-' + recipeId, a);
  }
  async function training(method: 'natural' | 'assisted', cycles: number, budget = 0, reserve = 0) {
    await home(); await hit(page.getByTestId('hub-cultivation-details'));
    await hit(page.getByTestId('cultivation-method-' + method));
    fieldEdits++; await page.getByLabel('修行目标', {exact: true}).selectOption('xp-cap');
    await fill('圆满最多轮数', cycles);
    const limits = page.locator('.training-budget');
    if (!await limits.evaluate(n => (n as HTMLDetailsElement).open)) await hit(limits.locator('summary'));
    await fill('累计灵石预算', budget); await fill('灵石保留量', reserve);
    if (await limits.evaluate(n => (n as HTMLDetailsElement).open)) await hit(limits.locator('summary'));
    const plan: ActivityPlan = {kind: 'cultivation', method, maxCycles: cycles, until: 'xp-cap', stoneBudget: budget, stoneReserve: reserve};
    return startSegment('training-' + method + '-' + segments.length, plan, page.getByTestId('training-start'));
  }

  try {
    await progress();
    const response = await page.request.get('/');
    expect(sha(await response.body())).toBe(build.files.find((row: any) => row.path === 'index.html')!.sha256);
    await page.goto('/'); await expect(page.getByRole('button', {name: /^踏入仙途/})).toBeVisible();
    interventions.push({kind: 'new-life', atHostMs: host(), reason: 'Create an isolated normal new life through the welcome control'});
    await hit(page.getByRole('button', {name: /^踏入仙途/}));
    await expect(page.getByTestId('save-status')).toHaveText('已保存');
    await sample('normal-created');
    await hit(page.getByTestId('leave'));
    const opening = await startSegment('opening-leave', {kind: 'milestone', action: {type: 'CHOOSE', choice: 'leave'}, maxCycles: 1}, page.getByTestId('milestone-confirm'));
    await stopped('opening-leave', opening);
    await travel('cave');
    const mortal = await training('natural', 2); await stopped('mortal-cap', mortal);
    expect(last!.game.core.player.xp).toBe(10); await home(); await hit(page.getByTestId('breakthrough'));
    const entry = await startSegment('explicit-qi-entry', {kind: 'milestone', action: {type: 'BREAKTHROUGH'}, maxCycles: 1}, page.getByTestId('milestone-confirm'));
    await stopped('explicit-qi-entry', entry); expect(last!.game.core.player.realm).toBe('qi');
    await home(); await hit(page.getByTestId('hub-skills')); await hit(page.getByTestId('equipment-mode-school'));
    await hit(page.getByTestId('school-sword')); const configBefore = await sample('school-preview');
    interventions.push({kind: 'configuration-confirmation', atHostMs: host(), reason: 'Explicitly choose sword school; no fictitious cycle', action: {type: 'SCHOOL', school: 'sword'}});
    await hit(page.getByTestId('configuration-confirm'));
    await poll('school-confirmed', s => s.game.core.revision === configBefore.game.core.revision + 1, 8_000);
    expect(last!.game.school).toBe('sword'); await screenshot('online-early-qi');

    await travel('wilderness'); await source('herbs', 12, 6, 6, 'herbs-six-automatic-cycles');
    await source('dew', 2, 2, 2, 'dew-two-automatic-cycles');
    await travel('sect'); await source('core', 1, 1, 4, 'core-one-long-cycle');
    const funded = await source('work', null, 2, 2, 'work-budget-stop');
    expect(funded.activity!.stopReason!.code).toBe('ACTIVITY_BUDGET');
    const oldWork = funded.activity!.id;
    interventions.push({kind: 'new-authorization', reason: 'The first month budget was exhausted; player explicitly confirms another finite segment', atHostMs: host(), previousActivityId: oldWork});
    const fundedAgain = await source('work', null, 2, 2, 'work-new-authorization');
    expect(fundedAgain.activity!.id).not.toBe(oldWork);
    expect(fundedAgain.game.core.player.stones).toBe(funded.game.core.player.stones + 40);
    await travel('cave'); await production('foundation', 1, 1); await production('healing', 3, 2);
    completed.add('materials-and-production'); await screenshot('online-materials-and-production');

    const natural = await training('natural', 5);
    await poll('natural-two-committed', s => s.activity?.id === natural.id && s.activity.completedCycles === 2, 135_000);
    await hold(15_000, 'natural-unfinished-third-cycle');
    const beforePause = last!;
    interventions.push({kind: 'pause', atHostMs: host(), reason: 'Explicitly abandon one incomplete third cycle', activity: beforePause.activity});
    await hit(page.getByTestId('training-pause'));
    await poll('natural-paused', s => s.activity?.id === natural.id && s.activity.status === 'paused', 8_000);
    expect(last!.game).toEqual(beforePause.game);
    await hold(20_000, 'paused-reading', beforePause.game);
    interventions.push({kind: 'refresh', atHostMs: host(), reason: 'Reload the explicitly paused plan, without offline settlement'});
    await page.reload(); await expect(page.getByTestId('training-resume')).toBeVisible();
    const paused = await sample('paused-plan-reloaded'); expect(paused.game).toEqual(beforePause.game);
    expect(paused.activity!.plan).toEqual(natural.plan);
    await screenshot('online-paused-plan-reloaded');
    interventions.push({kind: 'resume', atHostMs: host(), reason: 'Explicitly resume the remaining natural cycles after paused reload'});
    await hit(page.getByTestId('training-resume'));
    await poll('natural-resumed', s => s.activity?.id === natural.id && s.activity.generation > paused.activity!.generation, 8_000);
    await stopped('natural-five-with-pause', last!.activity!, 195_000);
    completed.add('pause-reload-resume');

    const assisted = await training('assisted', 5, 60, 36);
    await hold(20_000, 'assisted-unfinished-first-cycle');
    const abandoned = last!, oldCommand = assisted.nextCommand!.commandId;
    interventions.push({kind: 'refresh', atHostMs: host(), reason: 'Abandon an uncompleted paid cycle and cross its old persisted deadline', activity: abandoned.activity});
    await page.reload(); await expect(page.getByTestId('training-resume')).toBeVisible();
    const loaded = await sample('running-plan-reloaded'); expect(loaded.game).toEqual(abandoned.game);
    expect(loaded.activity!.plan).toEqual(assisted.plan);
    await hold(Math.max(45_000, assisted.dueAt! - loaded.wall + 5_000), 'reloaded-no-offline-settlement', abandoned.game);
    expect(last!.wall).toBeGreaterThan(assisted.dueAt!);
    expect(last!.receipts.some(r => r.command?.commandId === oldCommand && r.result)).toBe(false);
    interventions.push({kind: 'resume', atHostMs: host(), reason: 'Explicitly take over the saved plan; require a new full paid cycle'});
    await hit(page.getByTestId('training-resume'));
    await poll('assisted-resumed', s => s.activity?.id === assisted.id && s.activity.generation > loaded.activity!.generation, 8_000);
    const resumed = last!.activity!;
    expect(resumed.nextCommand!.commandId).not.toBe(oldCommand);
    await hold(1_000, 'resumed-no-early-charge', abandoned.game);
    const paid = await stopped('assisted-budget-stop', resumed, 195_000);
    expect(paid.activity!.completedCycles).toBe(3);
    expect(paid.activity!.spentStones).toBe(60);
    expect(paid.activity!.stopReason!.code).toBe('ACTIVITY_BUDGET');
    completed.add('running-refresh-no-offline');

    const remaining = deadline - performance.now();
    if (remaining > 65_000) {
      const maxCycles = Math.min(7, Math.max(1, Math.floor((remaining - 20_000) / 60_000)));
      observations.push({kind: 'finite-final-plan', atHostMs: host(), requestedMaximum: 7, actualMaximum: maxCycles,
        reason: 'Use only whole normal cycles that fit the observation; never accelerate or force a realm'});
      const finalPlan = await training('natural', maxCycles);
      await stopped('final-finite-natural', finalPlan, maxCycles * 60_000 + 15_000);
    } else observations.push({kind: 'final-plan-not-started', atHostMs: host(), reason: 'Observation time belongs to actual work already completed; no rushed final action'});
    await home(); await hit(page.getByTestId('hub-goal'));
    const closing = await sample('closing-read-only');
    await screenshot('online-closing-goal');
    await hold(Math.max(0, deadline - performance.now()), 'closing-read-only-observation', closing.game);
    expect(host()).toBeGreaterThanOrEqual(OBSERVATION_MS);
    expect(last!.game.core.player.realm).toBe('qi');
    expect(last!.game.core.inventory.foundation_pill).toBe(1);
    expect(last!.game.core.inventory.healing_pill).toBe(3);
    for (const required of ['materials-and-production', 'pause-reload-resume', 'running-refresh-no-offline'])
      expect(completed.has(required), required).toBe(true);
    expect(errors).toEqual([]); expect(assertWebBuild().sourceDigest).toBe(build.sourceDigest);
    for (const commit of commits.filter(row => row.hostTiming)) {
      const values = samples.filter(row => row.nextCommandId === commit.command.commandId && row.countdownAligned)
        .map(row => parseFloat(row.countdown));
      expect(new Set(values).size, 'each committed real cycle must expose a decreasing readable countdown').toBeGreaterThan(1);
    }
    finished = true;
  } catch (error) {
    failure = error instanceof Error ? error.stack ?? error.message : String(error); throw error;
  } finally {
    await progress(finished ? 'complete' : 'failed');
    const report = {format: 'chenyuan-real-online-observation', version: 1, sourceDigest: build.sourceDigest,
      buildSource: build.source, configurationMetadata: info.config.metadata,
      testSha256: sha(await readFile(fileURLToPath(import.meta.url))),
      configSha256: sha(await readFile(fileURLToPath(new URL('../playwright.online.config.ts', import.meta.url)))),
      utcBegan, utcEnded: new Date().toISOString(), observedHostMs: host(), intendedObservationMs: OBSERVATION_MS,
      complete: finished, failure, node: process.version, clicks, fieldEdits, samples, commits, segments,
      interventions, observations, armedCycles: [...armed.values()], screenshots, pageErrors: errors,
      finalNativeSnapshot: last,
      limits: ['Normal isolated synthetic new life through visible controls; no saved-game fixture or granted resources.',
        'Host monotonic time spans reloads. Browser timeOrigin changes and acceptance/sampling brackets are retained.',
        'Readonly native IDB current/activity/receipts are sampled atomically and every observed Game transition is formally resolved.',
        'Cycle commit timestamps are sampled intervals, except persisted proof.resolvedAt when available; not invented exact timings.',
        'Fault injection, accelerated-clock cases, compatibility/performance and human/long-term balance acceptance are separate.']};
    const output = fileURLToPath(new URL('../../artifacts/goal-4/u8-c/online-observation.json', import.meta.url));
    await mkdir(artifactDirectory, {recursive: true});
    await writeFile(output, JSON.stringify(report, null, 2) + '\n');
    await info.attach('online-evidence', {path: output, contentType: 'application/json'});
  }
});
