import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { driver } from '../../tests/full-route.mjs';
import { nextTrialMove, trialJourneyScenario } from '../../tests/trial-journey-route.mjs';
import { newGame, resolve, validateGame } from '../../src/full/engine.ts';
import { previewAction } from '../../src/full/queries.ts';
import { completeActivity, type Activity } from '../../src/full/activity.ts';
import type { Action, Game } from '../../src/full/types.ts';
import { publicId, validateRecord, writeObservation, type Observation } from '../src/local-events';
import { useJourneyClock } from './support';

test.use({ viewport: { width: 1440, height: 900 }, actionTimeout: 8000, navigationTimeout: 15000 });
type RawDatabase = { version: number; names: string[]; rows: Record<string, Array<{ key: any; value: any }>> };
type Cycle = { before: Game; activity: Activity; accepted: RawDatabase; saved: RawDatabase; after: Game; formal: ReturnType<typeof resolve>; receipt: any; observation: Observation };
const gameDatabase = 'chenyuan-playable-v1', localDatabase = 'chenyuan-local-experience-v1', virtualDay = 86_400_000;
const diagnostics = new WeakMap<Page, { errors: string[]; requests: string[]; downloads: string[] }>();
test.beforeEach(async ({ page }, info) => {
  const rows = { errors: [] as string[], requests: [] as string[], downloads: [] as string[] }; diagnostics.set(page, rows);
  const origin = new URL(info.project.use.baseURL ?? 'http://127.0.0.1:4173').origin;
  page.on('pageerror', error => rows.errors.push(error.message));
  page.on('request', request => { if (request.method() !== 'GET' || new URL(request.url()).origin !== origin) rows.requests.push(request.method() + ':' + request.url()); });
  page.on('download', download => rows.downloads.push(download.suggestedFilename()));
});
test.afterEach(async ({ page }, info) => {
  const rows = diagnostics.get(page)!; await evidence(info, 'record-browser-diagnostics', rows); expect(rows.errors).toEqual([]); expect(rows.requests).toEqual([]);
});
async function evidence(info: TestInfo, name: string, value: unknown) { await info.attach(name, { body: JSON.stringify(value, null, 2), contentType: 'application/json' }); }
async function database(page: Page, name = gameDatabase): Promise<RawDatabase> {
  return page.evaluate(name => new Promise<RawDatabase>((resolve, reject) => {
    const q = indexedDB.open(name); q.onupgradeneeded = () => { q.transaction!.abort(); reject(new Error('Readonly record evidence cannot create ' + name)); }; q.onerror = () => reject(q.error);
    q.onsuccess = () => {
      const db = q.result, names = [...db.objectStoreNames], rows: RawDatabase['rows'] = {}, tx = db.transaction(names, 'readonly');
      for (const name of names) { rows[name] = []; const read = tx.objectStore(name).openCursor(); read.onsuccess = () => { if (read.result) { rows[name].push({ key: read.result.key, value: read.result.value }); read.result.continue(); } }; }
      tx.oncomplete = () => { const version = db.version; db.close(); resolve({ version, names, rows }); }; tx.onabort = () => { db.close(); reject(tx.error); };
    };
  }), name);
}
const value = (raw: RawDatabase, key: string) => raw.rows['full-state'].find(row => row.key === key)?.value;
const gameOf = (raw: RawDatabase) => value(raw, 'current') as Game;
const activityOf = (raw: RawDatabase) => value(raw, 'activity') as Activity | undefined;
async function openSettings(page: Page) {
  const dialog = page.getByRole('dialog', { name: '行旅设置', exact: true }); if (!await dialog.isVisible()) await page.getByRole('button', { name: '设置', exact: true }).click(); await expect(dialog).toBeVisible(); return dialog;
}
async function localPanel(page: Page) {
  const dialog = await openSettings(page), panel = dialog.getByTestId('local-records-panel'); if (!await panel.evaluate(node => (node as HTMLDetailsElement).open)) await panel.locator(':scope > summary').click(); return { dialog, panel };
}
async function initializeAndImport(page: Page, fixture: Game, info: TestInfo) {
  validateGame(fixture); await useJourneyClock(page); await page.goto('/'); await expect(page.getByTestId('save-status')).toHaveText('尚无存档');
  // Local readiness is a public precondition, separate from acceptance of the Game import/action.
  const { dialog, panel } = await localPanel(page); await expect(page.getByTestId('local-data-status')).toContainText('显示设置已保存'); await expect(panel.getByTestId('local-recording')).toBeEnabled(); await expect(panel.getByTestId('local-recording')).toBeChecked();
  await expect(dialog.getByTestId('reduce-effects')).toBeEnabled(); await dialog.getByRole('button', { name: '关闭设置', exact: true }).click();
  await page.getByLabel('导入已有存档', { exact: true }).setInputFiles({ name: 'check-records-formal-prefix.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(fixture)) });
  await expect(page.getByTestId('action-execution')).toBeVisible(); await page.clock.fastForward(600); await expect(page.getByTestId('save-status')).toHaveText('已保存');
  const raw = await database(page), game = gameOf(raw), expected = structuredClone(fixture); expected.core.runId = game.core.runId; expected.core.revision = 0;
  if (expected.core.activeEvent) expected.core.activeEvent.instanceId = game.core.runId + ':' + expected.core.activeEvent.id;
  expect(game).toEqual(expected); expect(publicId(game.core.runId)).toBe(game.core.runId); expect(activityOf(raw)).toBeUndefined(); expect(value(raw, 'checkpoint')).toBeUndefined(); expect(value(raw, 'checkpoint-owner')).toBeUndefined();
  await expect.poll(async () => (await database(page, localDatabase)).rows.events.some(row => row.value.data.observation.kind === 'import' && row.value.data.observation.runId === game.core.runId)).toBe(true);
  await evidence(info, 'formal-import-and-local-readiness', { fixture, game, raw, scope: 'Visible import of a formal command prefix; not a normal new-game route, user save, real-day or performance claim.' }); return game;
}
function mortalCapWithPrivateName() {
  const route = driver(), firstBreakthrough = route.actions.findIndex((action: Action) => action.type === 'BREAKTHROUGH'); expect(firstBreakthrough).toBeGreaterThan(0);
  let game = newGame('录域L1私名', randomUUID());
  for (const action of route.actions.slice(0, firstBreakthrough)) game = resolve(game, { ...action, commandId: randomUUID(), runId: game.core.runId, expectedRevision: game.core.revision }).nextState;
  validateGame(game); expect(game.core.player.realm).toBe('mortal'); expect(previewAction(game, { type: 'BREAKTHROUGH' }).allowed).toBe(true); return game;
}
function beforeWolfVictory() {
  const route = driver(); route.go('wilderness'); route.doAction({ type: 'ENCOUNTER', enemy: 'wolf' });
  for (let n = 0; n < 40; n++) {
    const before = route.game, action = { type: 'BATTLE', move: nextTrialMove(before) } as const; expect(previewAction(before, action).allowed).toBe(true);
    const formal = resolve(before, { ...action, commandId: randomUUID(), runId: before.core.runId, expectedRevision: before.core.revision });
    if (formal.result.delta.wins === 1) { validateGame(before); expect(before.battle!.enemy).toBe('wolf'); return { game: before as Game, action }; }
    route.doAction(action);
  }
  throw new Error('Formal wolf prefix did not reach its actual winning move');
}
async function beginAndComplete(page: Page, before: Game, action: Action, startId: string, period: number, flags: Observation['flags'], info: TestInfo): Promise<Cycle> {
  expect(previewAction(before, action).allowed).toBe(true); const readonly = await database(page); expect(gameOf(readonly)).toEqual(before);
  await expect(page.getByTestId(startId)).toBeEnabled(); await page.getByTestId(startId).click(); let accepted: RawDatabase;
  await expect.poll(async () => { accepted = await database(page); return activityOf(accepted)?.status; }).toBe('running');
  const a = activityOf(accepted!)!; expect([6, 7]).toContain(a.version); expect(a.plan.maxCycles).toBe(1); expect(a.cycleMs).toBe(period); expect(a.completedCycles).toBe(0); expect(a.nextCommand).toMatchObject(action); expect(a.nextCommand!.runId).toBe(before.core.runId); expect(a.nextCommand!.expectedRevision).toBe(before.core.revision); expect(a.dueAt! - a.startedAt!).toBe(period);
  const starts = accepted!.rows['full-receipts'].filter(row => row.value.input?.kind === 'START' && row.value.activity?.id === a.id); expect(starts).toHaveLength(1); expect(starts[0].value.input.plan).toEqual(a.plan);
  expect(gameOf(accepted!)).toEqual(before); await expect(page.locator('[data-testid=training-activity][data-generation="' + a.generation + '"][data-running=true]')).toBeVisible(); await expect(page.getByTestId('training-countdown')).toHaveText((period / 1000).toFixed(1) + ' 秒');
  const command = a.nextCommand!, key = a.runId + ':' + command.commandId, left = a.dueAt! - await page.evaluate(() => Date.now()); expect(left).toBe(period); expect(accepted!.rows['full-receipts'].some(row => row.key === key)).toBe(false);
  await page.clock.fastForward(left - 1); const dueMinusOne = await database(page); expect(dueMinusOne).toEqual(accepted!); await expect(page.getByTestId('training-countdown')).toHaveText('0.1 秒');
  await page.clock.fastForward(1); let saved: RawDatabase; await expect.poll(async () => { saved = await database(page); return activityOf(saved)?.completedCycles; }).toBe(1); await expect(page.getByTestId('save-status')).toHaveText('已保存');
  const formal = resolve(before, command), after = gameOf(saved!); expect(after).toEqual(formal.nextState); const receipts = saved!.rows['full-receipts'].filter(row => row.key === key); expect(receipts).toHaveLength(1); const receipt = receipts[0].value;
  expect(receipt.command).toEqual(command); expect(receipt.result).toEqual(formal.result); expect(receipt.proof.activityBefore).toEqual(a); expect(receipt.proof.stateAfter).toEqual(after); expect(receipt.proof.resolvedAt).toBeGreaterThanOrEqual(a.dueAt!);
  expect(receipt.activity).toEqual(completeActivity(after, a, formal.result, { commandId: command.commandId, now: receipt.proof.resolvedAt })); expect(activityOf(saved!)).toEqual(receipt.activity); expect(activityOf(saved!)!.status).toBe('stopped'); expect(value(saved!, 'previous')).toEqual(before);
  for (const old of accepted!.rows['full-receipts']) expect(saved!.rows['full-receipts'].find(row => row.key === old.key)).toEqual(old); expect(saved!.rows['full-receipts'].length).toBe(accepted!.rows['full-receipts'].length + 1);
  expect(saved!.names).toEqual(accepted!.names); expect(saved!.version).toBe(accepted!.version); for (const name of accepted!.names.filter(name => !['full-state', 'full-receipts'].includes(name))) expect(saved!.rows[name]).toEqual(accepted!.rows[name]);
  const changed = ['current', 'previous', 'activity', ...(action.type === 'BREAKTHROUGH' ? ['checkpoint', 'checkpoint-owner'] : [])]; expect(saved!.rows['full-state'].filter(row => !changed.includes(String(row.key)))).toEqual(accepted!.rows['full-state'].filter(row => !changed.includes(String(row.key))));
  if (action.type === 'BREAKTHROUGH') {
    const cp = value(saved!, 'checkpoint'); expect(cp.snapshot).toEqual(before); expect(cp.kind).toBe('breakthrough'); expect(cp.sourceRunId).toBe(before.core.runId); expect(cp.sourceRevision).toBe(before.core.revision);
    expect(value(saved!, 'checkpoint-owner')).toEqual({ format: 'chenyuan-checkpoint-scope', version: 1, runId: before.core.runId, sourceRunId: cp.sourceRunId, sourceRevision: cp.sourceRevision, kind: 'breakthrough' });
  } else { expect(value(saved!, 'checkpoint')).toEqual(value(accepted!, 'checkpoint')); expect(value(saved!, 'checkpoint-owner')).toEqual(value(accepted!, 'checkpoint-owner')); }
  let observations: Observation[] = []; await expect.poll(async () => {
    const raw = await database(page, localDatabase); observations = raw.rows.events.map(row => row.value.data.observation).filter(o => o.kind === 'action' && o.operation === action.type && o.runId === before.core.runId && o.revisionBefore === before.core.revision && o.revisionAfter === after.core.revision); return observations.length;
  }).toBe(1);
  const observation = observations[0]; expect(observation).toEqual(writeObservation(before, after, { kind: 'action', command }, formal.result, false)); expect(observation.flags).toEqual(flags); expect(observation.replayed).toBe(false); expect(observation.commandId).toBeNull(); expect(observation.identifiersRedacted).toBe(true); expect(observation.sourceRunId).toBe(a.runId); expect(observation.observedRevision).toBe(after.core.revision); expect(publicId(command.commandId)).toBeNull();
  await evidence(info, action.type + '-formal-cycle-and-public-observation', { readonly, accepted: accepted!, dueMinusOne, saved: saved!, a, formal, receipt, observation });
  return { before, activity: a, accepted: accepted!, saved: saved!, after, formal, receipt, observation };
}
async function previewGeometry(page: Page, info: TestInfo, name: string, screenshot: boolean) {
  const preview = page.getByTestId('local-export-ready'); const geometry = await preview.evaluate(root => {
    const dialog = root.closest('dialog')!, bounds = dialog.getBoundingClientRect(); return { scrollHeight: dialog.scrollHeight, clientHeight: dialog.clientHeight, pageHeight: document.documentElement.scrollHeight,
      rows: [...root.querySelectorAll<HTMLElement>('h3,p,button')].map(node => { const r = node.getBoundingClientRect(), top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { tag: node.tagName, text: node.textContent, font: parseFloat(getComputedStyle(node).fontSize), height: r.height, width: r.width, inside: r.left >= bounds.left && r.right <= bounds.right && r.top >= bounds.top && r.bottom <= bounds.bottom && r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight, clipped: node.scrollWidth > node.clientWidth + 1 || node.scrollHeight > node.clientHeight + 1, hit: top === node || !!top && node.contains(top) }; }) };
  });
  await evidence(info, name + '-preview-geometry', geometry); if (screenshot) await page.screenshot({ path: info.outputPath(name + '-preview.png') });
  expect(geometry.scrollHeight).toBeLessThanOrEqual(geometry.clientHeight + 1); expect(geometry.pageHeight).toBeLessThanOrEqual(900); for (const row of geometry.rows) { expect(row.font).toBeGreaterThanOrEqual(18); expect(row.inside).toBe(true); expect(row.clipped).toBe(false); if (row.tag === 'BUTTON') { expect(row.height).toBeGreaterThanOrEqual(44); expect(row.width).toBeGreaterThanOrEqual(44); expect(row.hit).toBe(true); } }
}
async function download(page: Page, cycle: Cycle, info: TestInfo, name: string, screenshot = false) {
  const readonly = await database(page); expect(readonly).toEqual(cycle.saved); const priorDownloads = diagnostics.get(page)!.downloads.length, { panel } = await localPanel(page); await expect(panel.getByTestId('local-recording')).toBeChecked(); await expect(panel.getByTestId('local-download')).toHaveCount(0);
  await panel.getByTestId('local-export-preview').click(); const preview = panel.getByTestId('local-export-ready'); await expect(preview).toBeVisible(); await expect(preview).toBeFocused(); await expect(preview).toContainText('文件不是游戏存档，不能恢复进度'); await expect(preview).toContainText('不会自动发送'); await expect(preview).toContainText('预览之后的新记录不在本次文件中');
  expect(diagnostics.get(page)!.downloads).toHaveLength(priorDownloads); expect(await database(page)).toEqual(readonly); const localAtPreview = await database(page, localDatabase); await previewGeometry(page, info, name, screenshot);
  const waiting = page.waitForEvent('download'); await preview.getByTestId('local-download').click(); const file = await waiting, path = await file.path(); expect(file.suggestedFilename()).toBe('尘缘问道-本地试玩记录与偏好.json'); expect(path).not.toBeNull(); const report = JSON.parse(await readFile(path!, 'utf8')), serialized = JSON.stringify(report);
  expect(diagnostics.get(page)!.downloads).toHaveLength(priorDownloads + 1); expect(report.format).toBe('chenyuan-local-playtest'); expect(report.version).toBe(1); expect(report.notASave).toBe(true); expect(report.policy).toMatchObject({ automaticallyUploaded: false, containsPlayerName: false, containsSave: false, containsDeviceFingerprint: false }); expect(report.policy.time).toContain('不输入Game规则'); expect(report.policy.snapshot).toContain('不含预览之后的新记录');
  expect(report.persistent.available).toBe(true); expect(report.memoryOnly).toEqual([]); expect(publicId(report.sessionId)).toBe(report.sessionId); expect(Number.isSafeInteger(report.capturedAtSessionMs)).toBe(true); expect(report.capturedAtSessionMs).toBeGreaterThanOrEqual(0);
  const nativeRows = localAtPreview.rows.events.map(row => ({ sequence: Number(row.key), record: row.value.data })); expect(report.persistent.entries).toEqual(nativeRows); const meta = localAtPreview.rows.meta.find(row => row.key === 'state')!.value; expect(report.persistent.revision).toBe(meta.revision); expect(report.persistent.epoch).toBe(meta.epoch); expect(report.persistent.preferenceRevision).toBe(meta.preferenceRevision); expect(report.persistent.controlRevision).toBe(meta.controlRevision);
  for (const entry of report.persistent.entries) { validateRecord(entry.record); expect(entry.record.seed).toBeNull(); expect(entry.record.sessionId).toBe(report.sessionId); expect(Number.isSafeInteger(entry.record.elapsedMs)).toBe(true); expect(entry.record.elapsedMs).toBeGreaterThanOrEqual(0); expect(entry.record.elapsedMs).toBeLessThanOrEqual(report.capturedAtSessionMs); }
  for (const forbidden of [cycle.before.core.player.name, '录域L1私名', 'learnedSkills', 'journal', 'userAgent', cycle.activity.nextCommand!.commandId]) expect(serialized).not.toContain(forbidden);
  const records = report.persistent.entries.map((entry: any) => entry.record.observation), matching = records.filter((o: Observation) => o.kind === 'action' && o.operation === cycle.formal.result.type && o.runId === cycle.after.core.runId && o.revisionBefore === cycle.before.core.revision && o.revisionAfter === cycle.after.core.revision);
  expect(matching).toHaveLength(1); expect(matching[0]).toEqual(cycle.observation); expect(matching[0].flags).toEqual(cycle.observation.flags); expect(matching[0].result.costs).toEqual(cycle.formal.result.costs); expect(matching[0].result.requestedSteps).toBe(1); expect(matching[0].result.executedSteps).toBe(1); expect(records.filter((o: Observation) => o.kind !== 'action').every((o: Observation) => o.flags.length === 0)).toBe(true);
  expect(records.some((o: any) => o.operation === 'CLOSE' || o.errorCode === 'PAGE_CLOSED')).toBe(false); expect(await database(page)).toEqual(readonly); expect(diagnostics.get(page)!.requests).toEqual([]);
  await evidence(info, name + '-actual-private-export', { readonly, localAtPreview, report, observation: matching[0], downloads: [...diagnostics.get(page)!.downloads] }); return { report, localAtPreview };
}

test('CHECK-MATRIX-L1 a scoped-name formal breakthrough exports exactly its realm_changed observation with full costs and no private Game text', async ({ page }, info) => {
  const before = await initializeAndImport(page, mortalCapWithPrivateName(), info); expect(before.core.player.name).toBe('录域L1私名'); const raw = await database(page); await page.getByTestId('breakthrough').click(); expect(await database(page)).toEqual(raw);
  const cycle = await beginAndComplete(page, before, { type: 'BREAKTHROUGH' }, 'milestone-confirm', 30000, ['realm_changed'], info); expect(cycle.after.core.player.realm).toBe('qi'); expect(cycle.formal.result.delta.realm).toEqual({ before: 'mortal', after: 'qi' });
  const exported = await download(page, cycle, info, 'realm-change', true); const event = exported.report.persistent.entries.find((entry: any) => entry.record.observation.operation === 'BREAKTHROUGH').record.observation; expect(event.state.realm).toBe('qi'); expect(event.result.phaseAfter).toBe('idle'); expect(event.flags).toEqual(['realm_changed']);
});

test('CHECK-MATRIX-L2 a formal final wolf turn exports exactly battle_won after its one saved three-second outcome', async ({ page }, info) => {
  const source = beforeWolfVictory(), before = await initializeAndImport(page, source.game, info), raw = await database(page); await page.getByTestId('battle-manual-takeover').click(); expect(await database(page)).toEqual(raw);
  const start = source.action.move === 'heal' || source.action.move === 'restore' ? 'battle-' + source.action.move : source.action.move;
  const cycle = await beginAndComplete(page, before, source.action, start, 3000, ['battle_won'], info); expect(cycle.after.wins - before.wins).toBe(1); expect(cycle.after.battle).toBeNull();
  const exported = await download(page, cycle, info, 'battle-victory'); const event = exported.report.persistent.entries.find((entry: any) => entry.record.observation.operation === 'BATTLE').record.observation; expect(event.enemyId).toBe('wolf'); expect(event.flags).toEqual(['battle_won']); expect(event.result.delta.wins).toBe(1);
});

test('CHECK-MATRIX-L3 an explicit depart ending exports formal spirit to ascended realm change and ending without inventing a page-close failure', async ({ page }, info) => {
  const fixture = trialJourneyScenario().states.at(-1) as Game, before = await initializeAndImport(page, fixture, info), raw = await database(page); expect(before.core.player.realm).toBe('spirit');
  await page.getByTestId('hub-current').getByRole('button', { name: '继续当前遭遇', exact: true }).click(); await page.getByTestId('story-show-choices').click(); await checkArt03Read(page,async()=>{await page.getByTestId('response-choices-open').click();await expect(page.getByTestId('response-choices-dialog')).toBeVisible();await page.getByTestId('story-select-ending-depart').click();await expect(page.getByTestId('response-choices-dialog')).not.toBeVisible();}); await page.getByTestId('ending-depart').click(); expect(await database(page)).toEqual(raw);
  const cycle = await beginAndComplete(page, before, { type: 'END', ending: 'depart' }, 'ascension-confirm', 12000, ['realm_changed', 'ending'], info); expect(cycle.after.status).toBe('ascended'); expect(cycle.after.ending).toBe('depart'); expect(cycle.after.core.player.realm).toBe('ascended');
  const exported = await download(page, cycle, info, 'depart-ending'); const event = exported.report.persistent.entries.find((entry: any) => entry.record.observation.operation === 'END').record.observation; expect(event.action).toEqual({ ending: 'depart' }); expect(event.flags).toEqual(['realm_changed', 'ending']); expect(event.state.realm).toBe('ascended'); expect(event.result.phaseAfter).toBe('ascended');
});

test('CHECK-MATRIX-L4 one stopped formal cycle and both actual exports survive a same-session virtual day without Game Activity receipt or reward changes', async ({ page }, info) => {
  const route = driver(); route.go('wilderness'); const before = await initializeAndImport(page, route.game, info);
  const cycle = await beginAndComplete(page, before, { type: 'TRAVEL', location: 'cave' }, 'return-cave', 6000, [], info); expect(cycle.after.core.world.location).toBe('cave'); expect(activityOf(cycle.saved)!.status).toBe('stopped');
  const first = await download(page, cycle, info, 'before-virtual-day'); await page.getByTestId('local-export-cancel').click(); await expect(page.getByTestId('local-export-ready')).toHaveCount(0); const localBeforeDay = await database(page, localDatabase), saved = await database(page); expect(saved).toEqual(cycle.saved);
  await page.clock.fastForward(virtualDay); expect(await database(page)).toEqual(saved); expect(activityOf(await database(page))).toEqual(activityOf(saved)); expect(await database(page, localDatabase)).toEqual(localBeforeDay);
  const second = await download(page, cycle, info, 'after-virtual-day', true); expect(second.report.sessionId).toBe(first.report.sessionId); expect(second.report.capturedAtSessionMs - first.report.capturedAtSessionMs).toBeGreaterThanOrEqual(virtualDay); expect(second.report.capturedAtSessionMs).toBeGreaterThanOrEqual(virtualDay);
  expect(second.report.persistent.entries).toEqual(first.report.persistent.entries); expect(second.report.memoryOnly).toEqual(first.report.memoryOnly); expect(second.report.preferences).toEqual(first.report.preferences); expect(second.localAtPreview).toEqual(localBeforeDay); expect(await database(page)).toEqual(saved);
  const key = cycle.activity.runId + ':' + cycle.activity.nextCommand!.commandId; expect(saved.rows['full-receipts'].filter(row => row.key === key)).toHaveLength(1); expect((await database(page)).rows['full-receipts'].filter(row => row.key === key)).toEqual(saved.rows['full-receipts'].filter(row => row.key === key));
  await evidence(info, 'virtual-day-is-diagnostic-only', { scope: '86400000ms of a virtual clock in one session after an explicitly finite stopped cycle; not a real-day or performance result.', first: first.report, second: second.report, saved, activity: activityOf(saved), localBeforeDay });
});

// CHECK-ART03: public surface access is readonly over every native Game store.
async function checkArt03Read(page:Page,body:()=>Promise<void>){const read=()=>page.evaluate(()=>new Promise<any>((accept,reject)=>{const q=indexedDB.open('chenyuan-playable-v1');q.onupgradeneeded=()=>{q.transaction!.abort();reject(Error('Readonly catalogue cannot create Game DB'));};q.onerror=()=>reject(q.error);q.onsuccess=()=>{const db=q.result,tx=db.transaction([...db.objectStoreNames],'readonly'),rows:any={};for(const name of db.objectStoreNames){rows[name]=[];const r=tx.objectStore(name).openCursor();r.onsuccess=()=>{if(r.result){rows[name].push({key:r.result.key,value:r.result.value});r.result.continue();}};}tx.oncomplete=()=>{db.close();accept({version:db.version,rows});};tx.onabort=()=>{db.close();reject(tx.error);};};}));const before=await read();await body();expect(await read()).toEqual(before);}
