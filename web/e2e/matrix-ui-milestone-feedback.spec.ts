import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { driver, prepareTrial } from '../../tests/full-route.mjs';
import { resolve, validateGame } from '../../src/full/engine.ts';
import { completeActivity, type MilestoneActivity } from '../../src/full/activity.ts';
import { previewAction, getLifeOverview, getTrialJourney } from '../../src/full/queries.ts';
import type { Action, Game } from '../../src/full/types.ts';
import * as C from '../../src/full/content.ts';
import { lifeReadings, readingPages } from '../src/story-pages';
import { useJourneyClock, finishJourneyClock, snapshot, activitySnapshot as activity } from './support';

test.use({ viewport: { width: 1440, height: 900 }, actionTimeout: 8000, navigationTimeout: 15000 });
type Kind = 'ANSWER_TRIAL' | 'RETIRE' | 'END_LIFE';
type Database = { version: number; names: string[]; rows: Record<string, Array<{ key: any; value: any }>> };
const databaseName = 'chenyuan-playable-v1', localName = 'chenyuan-local-experience-v1';
const localResults = '[data-testid=encounter-result],[data-testid=response-result],[data-testid=life-scroll-result]';
const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => { const rows: string[] = []; errors.set(page, rows); page.on('pageerror', error => rows.push(error.message)); });
test.afterEach(async ({ page }, info) => {
  if (!page.isClosed()) await page.evaluate(() => (window as any).__m03MilestoneObserver?.disconnect());
  await attach(info, 'milestone-browser-errors', errors.get(page) ?? []); expect(errors.get(page) ?? []).toEqual([]);
});
async function attach(info: TestInfo, name: string, value: unknown) { await info.attach(name, { body: JSON.stringify(value, null, 2), contentType: 'application/json' }); }
async function database(page: Page, name = databaseName): Promise<Database> {
  return page.evaluate(name => new Promise<Database>((resolve, reject) => {
    const q = indexedDB.open(name); q.onupgradeneeded = () => { q.transaction!.abort(); reject(new Error('Readonly feedback proof cannot create ' + name)); }; q.onerror = () => reject(q.error);
    q.onsuccess = () => {
      const db = q.result, names = [...db.objectStoreNames], rows: Database['rows'] = {}, tx = db.transaction(names, 'readonly');
      for (const name of names) { rows[name] = []; const read = tx.objectStore(name).openCursor(); read.onsuccess = () => { if (read.result) { rows[name].push({ key: read.result.key, value: read.result.value }); read.result.continue(); } }; }
      tx.oncomplete = () => { const version = db.version; db.close(); resolve({ version, names, rows }); }; tx.onabort = () => { db.close(); reject(tx.error); };
    };
  }), name);
}
const state = (raw: Database, key: string) => raw.rows['full-state'].find(row => row.key === key)?.value;
const gameOf = (raw: Database) => state(raw, 'current') as Game;
const activityOf = (raw: Database) => state(raw, 'activity') as MilestoneActivity | undefined;
async function load(page: Page, fixture: Game, info: TestInfo) {
  validateGame(fixture); await useJourneyClock(page); await page.goto('/'); await expect(page.getByTestId('save-status')).toHaveText('尚无存档');
  await expect(page.getByTestId('local-data-status')).not.toHaveText('正在读取本地设置……');
  await page.getByLabel('导入已有存档', { exact: true }).setInputFiles({ name: 'formal-milestone-feedback-prefix.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(fixture)) });
  await finishJourneyClock(page); await expect(page.getByTestId('save-status')).toHaveText('已保存');
  const raw = await database(page), actual = gameOf(raw), expected = structuredClone(fixture);
  expected.core.runId = actual.core.runId; expected.core.revision = 0;
  if (expected.core.activeEvent) expected.core.activeEvent.instanceId = actual.core.runId + ':' + expected.core.activeEvent.id;
  expect(actual).toEqual(expected); expect(activityOf(raw)).toBeUndefined(); expect(state(raw, 'checkpoint')).toBeUndefined(); expect(state(raw, 'checkpoint-owner')).toBeUndefined();
  await attach(info, 'lawful-import-prefix', { fixture, actual, raw, boundary: 'Formal command prefix imported through the visible UI; not a normal new-game route or a human pace measurement.' }); return actual;
}
async function begin(page: Page, confirmation: string, type: Action['type'], period: number) {
  await expect(page.getByTestId(confirmation)).toBeEnabled(); await page.getByTestId(confirmation).click();
  let raw: Database; await expect.poll(async () => { raw = await database(page); return activityOf(raw)?.status; }).toBe('running');
  const a = activityOf(raw!)!; expect(a.version).toBe(7); expect(a.plan.kind).toBe('milestone'); expect(a.plan.action.type).toBe(type); expect(a.plan.maxCycles).toBe(1); expect(a.completedCycles).toBe(0); expect(a.cycleMs).toBe(period); expect(a.dueAt! - a.startedAt!).toBe(period);
  await expect(page.locator('[data-testid=training-activity][data-generation="' + a.generation + '"][data-running=true]')).toBeVisible();
  await expect(page.getByTestId('training-countdown')).toHaveText((period / 1000).toFixed(1) + ' 秒');
  return a;
}
async function exactCompletion(page: Page, a: MilestoneActivity, before: Game, info: TestInfo, prefix: string) {
  const accepted = await database(page); expect(gameOf(accepted)).toEqual(before); expect(activityOf(accepted)).toEqual(a);
  const key = a.runId + ':' + a.nextCommand!.commandId, formal = resolve(before, a.nextCommand!);
  expect(accepted.rows['full-receipts'].filter(row => row.key === key)).toHaveLength(0);
  const left = a.dueAt! - await page.evaluate(() => Date.now()); expect(left).toBeGreaterThan(1);
  await page.clock.fastForward(left - 1); const dueMinusOne = await database(page); expect(dueMinusOne).toEqual(accepted);
  await expect(page.getByTestId('training-countdown')).toHaveText('0.1 秒');
  await expect(page.locator(localResults)).toHaveCount(0); await expect(page.locator('[data-testid=action-motion][data-operation="' + a.plan.action.type + '"]')).toHaveCount(0);
  await page.clock.fastForward(1); let saved: Database; await expect.poll(async () => { saved = await database(page); return activityOf(saved)?.completedCycles; }).toBe(1);
  expect(gameOf(saved!)).toEqual(formal.nextState); const rows = saved!.rows['full-receipts'].filter(row => row.key === key); expect(rows).toHaveLength(1);
  const receipt = rows[0].value; expect(receipt.command).toEqual(a.nextCommand); expect(receipt.result).toEqual(formal.result);
  expect(receipt.proof.activityBefore).toEqual(a); expect(receipt.proof.stateAfter).toEqual(formal.nextState); expect(receipt.proof.resolvedAt).toBeGreaterThanOrEqual(a.dueAt!);
  const complete = completeActivity(formal.nextState, a, formal.result, { commandId: a.nextCommand!.commandId, now: receipt.proof.resolvedAt });
  expect(receipt.activity).toEqual(complete); expect(activityOf(saved!)).toEqual(complete); expect(complete.status).toBe('stopped'); expect(complete.completedCycles).toBe(1);
  expect(saved!.version).toBe(accepted.version); expect(saved!.names).toEqual(accepted.names); expect(state(saved!, 'previous')).toEqual(before);
  const changedState = ['current', 'previous', 'activity', ...(['BREAKTHROUGH', 'START_TRIAL'].includes(a.plan.action.type) ? ['checkpoint', 'checkpoint-owner'] : [])];
  for (const row of accepted.rows['full-state'].filter(row => !changedState.includes(String(row.key)))) expect(saved!.rows['full-state'].find(other => other.key === row.key)).toEqual(row);
  expect(saved!.rows['full-state'].filter(row => !changedState.includes(String(row.key)))).toEqual(accepted.rows['full-state'].filter(row => !changedState.includes(String(row.key))));
  for (const name of accepted.names) {
    if (name === 'full-state' || name === 'full-receipts') continue;
    expect(saved!.rows[name], prefix + ' preserves unrelated ' + name).toEqual(accepted.rows[name]);
  }
  for (const old of accepted.rows['full-receipts']) expect(saved!.rows['full-receipts'].find(row => row.key === old.key)).toEqual(old);
  expect(saved!.rows['full-receipts'].length).toBe(accepted.rows['full-receipts'].length + 1);
  if (!['BREAKTHROUGH', 'START_TRIAL'].includes(a.plan.action.type)) {
    expect(state(saved!, 'checkpoint')).toEqual(state(accepted, 'checkpoint')); expect(state(saved!, 'checkpoint-owner')).toEqual(state(accepted, 'checkpoint-owner'));
  }
  await attach(info, prefix + '-exact-cycle', { accepted, dueMinusOne, saved: saved!, activity: a, complete, formal, receipt });
  return { saved: saved!, after: formal.nextState, formal, receipt, complete };
}
async function observe(page: Page, operation: Kind) {
  await page.evaluate(operation => {
    const w = window as any, rows: any[] = [], seen = new WeakMap<Element, string>(), selector = '[data-testid=life-scroll-result],[data-testid=response-result],[data-testid=action-motion]';
    const collect = (root: Node) => {
      if (!(root instanceof Element)) return;
      for (const node of root.matches(selector) ? [root] : root.querySelectorAll(selector)) {
        if (node.getAttribute('data-testid') === 'action-motion' && node.getAttribute('data-operation') !== operation) continue;
        const identity = node.getAttribute('data-sequence') ?? node.getAttribute('data-receipt'); if (!identity || seen.get(node) === identity) continue; seen.set(node, identity);
        rows.push({ id: node.getAttribute('data-testid'), identity, operation: node.getAttribute('data-operation'), family: node.getAttribute('data-family'), text: node.textContent,
          life: node.closest('[data-testid=life-scroll]')?.getAttribute('data-life') ?? null, question: node.closest('[data-testid=response-table]')?.getAttribute('data-model') ?? null, visible: !!node.getClientRects().length, wall: Date.now() });
      }
    };
    const observer = new MutationObserver(changes => { for (const change of changes) { if (change.type === 'attributes') collect(change.target); else for (const node of change.addedNodes) collect(node); } });
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-sequence', 'data-receipt'] }); w.__m03MilestoneObserver = observer; w.__m03MilestoneEffects = rows;
  }, operation);
}
async function effects(page: Page) { return page.evaluate(() => (window as any).__m03MilestoneEffects as any[]); }
async function painted(page: Page, selector: string) {
  await expect.poll(async () => { await page.clock.runFor(16); return page.locator(selector).count(); }).toBe(1);
  await expect(page.locator(selector)).toBeVisible();
}
async function publicObservation(page: Page, a: MilestoneActivity, formal: ReturnType<typeof resolve>) {
  let rows: any[]; await expect.poll(async () => {
    const raw = await database(page, localName); rows = raw.rows.events.map(row => row.value.data.observation).filter(o => o.kind === 'action' && o.operation === a.plan.action.type && o.runId === a.runId && o.revisionAfter === formal.result.revisionAfter); return rows.length;
  }).toBe(1);
  const observation = rows![0]; expect(observation.replayed).toBe(false); expect(observation.commandId).toBeNull(); expect(observation.identifiersRedacted).toBe(true);
  expect(observation.observedRevision).toBe(formal.result.revisionAfter); expect(observation.sourceRunId).toBe(a.runId);
  const { commandId, runId, type, versions, stopReason, ...rest } = formal.result;
  expect(observation.result).toEqual({ ...rest, stopCode: stopReason?.code ?? null }); return observation;
}
async function geometry(page: Page, info: TestInfo, name: string, resultId?: string, picture = false) {
  const data = await page.evaluate(resultId => {
    const visible = (node: Element) => !!node.getClientRects().length && getComputedStyle(node).visibility !== 'hidden';
    const rect = (node: Element) => { const r = node.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }; };
    const inside = (r: any, p: any) => r.left >= p.left - 1 && r.right <= p.right + 1 && r.top >= p.top - 1 && r.bottom <= p.bottom + 1;
    const overlap = (a: any, b: any) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    const nav = document.getElementById('primary-navigation'), navTop = nav?.getBoundingClientRect().top ?? innerHeight, modal = document.querySelector('dialog[open]'), violations: string[] = [];
    const text: any[] = [], controls: any[] = [];
    for (const node of document.querySelectorAll<HTMLElement>('.reading-text p,main small,main .small,dialog[open] p,dialog[open] small')) {
      if (!visible(node)) continue; const r = rect(node), minimum = node.matches('small,.small,.milestone-boundary,[data-testid=milestone-saved-state]') || !!node.closest('small,.small') ? 14 : 18, font = parseFloat(getComputedStyle(node).fontSize), parents: any[] = [];
      for (let p = node.parentElement; p && p !== document.body; p = p.parentElement) {
        if (getComputedStyle(p).display === 'contents') continue; const box = rect(p); if (box.width && box.height && !inside(r, box)) parents.push({ tag: p.tagName, class: p.className, box }); if (p === modal) break;
      }
      text.push({ text: node.textContent, r, minimum, font, parents });
      if (font < minimum || parents.length || r.left < 0 || r.right > innerWidth || r.top < 0 || r.bottom > (modal || nav?.contains(node) ? innerHeight : navTop) || node.scrollHeight > node.clientHeight + 1 || node.scrollWidth > node.clientWidth + 1) violations.push('unreadable text: ' + node.textContent);
    }
    for (const node of document.querySelectorAll<HTMLElement>(modal ? 'dialog[open] button' : 'main button,#primary-navigation button,.training-activity button,.training-stop-summary button')) {
      if (!visible(node)) continue; const r = rect(node), top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2), hit = top === node || !!top && node.contains(top);
      controls.push({ id: node.getAttribute('data-testid') ?? node.textContent, r, hit }); if (r.width < 44 || r.height < 44 || !hit || r.left < 0 || r.right > innerWidth || r.top < 0 || r.bottom > (modal || nav?.contains(node) ? innerHeight : navTop)) violations.push('unusable control: ' + node.textContent);
    }
    const result = resultId ? document.querySelector<HTMLElement>('[data-testid="' + resultId + '"]') : null; let short: any = null;
    if (result) {
      const r = rect(result), canvas = result.closest('.book-canvas'), bounds = canvas ? rect(canvas) : null;
      const obstacles = [...document.querySelectorAll('.reading-text,.choice-card,main button,#primary-navigation button')].filter(visible).map(rect);
      const style = getComputedStyle(result); short = { r, bounds, clashes: obstacles.filter(box => overlap(r, box)), font: parseFloat(style.fontSize), opacity: style.opacity };
      if (short.font < 14 || short.opacity !== '1' || bounds && !inside(r, bounds) || short.clashes.length) violations.push('short result masks content or is not readable');
    }
    return { text, controls, short, violations, page: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight } };
  }, resultId ?? null);
  await attach(info, name + '-geometry', data); if (picture) await page.screenshot({ path: info.outputPath(name + '.png') });
  expect(data.page.width).toBeLessThanOrEqual(1440); expect(data.page.height).toBeLessThanOrEqual(900); expect(data.violations).toEqual([]);
}
async function answerMotionClearance(page: Page, info: TestInfo, selector: string) {
  const data = await page.locator(selector).evaluate(motion => {
    const rect = (node: Element) => { const r = node.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }; };
    const visible = (node: Element) => { const s = getComputedStyle(node), r = rect(node); return !!node.getClientRects().length && s.visibility !== 'hidden' && s.display !== 'none' && r.width > 0 && r.height > 0; };
    const inside = (a: ReturnType<typeof rect>, b: ReturnType<typeof rect>) => a.left >= b.left - .5 && a.right <= b.right + .5 && a.top >= b.top - .5 && a.bottom <= b.bottom + .5;
    const overlap = (a: ReturnType<typeof rect>, b: ReturnType<typeof rect>) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    const canvases = [...document.querySelectorAll<HTMLElement>('.trial-book .book-canvas')].filter(visible), canvas = canvases[0], book = canvas?.closest('.trial-book'), r = rect(motion), margin = 90;
    const outer = { left: r.left - margin, right: r.right + margin, top: r.top - margin, bottom: r.bottom + margin, width: r.width + margin * 2, height: r.height + margin * 2 };
    const obstacleNodes = new Set<Element>([
      ...(book ? [...book.querySelectorAll(':scope>header,:scope>.catalogue-tabs,:scope>.catalogue-tabs>button,:scope>.catalogue-pager,:scope>.catalogue-pager button,:scope>.story-footer,:scope>.story-footer button,.reading-text,.book-caption')] : []),
      ...document.querySelectorAll('.game-hud,#primary-navigation,.feature-header'),
    ]);
    const obstacles = [...obstacleNodes].filter(visible).map(node => ({ tag: node.tagName, id: node.getAttribute('data-testid') ?? node.id, class: node.className, text: node.textContent, r: rect(node) }));
    const bounds = canvas ? rect(canvas) : null;
    const nodes = [motion, ...motion.querySelectorAll('*')].map(node => {
      const s = getComputedStyle(node), r = rect(node), animations = node.getAnimations().map(a => {
        const timing = a.effect?.getTiming();
        return { name: a instanceof CSSAnimation ? a.animationName : null, playState: a.playState, currentTime: typeof a.currentTime === 'number' ? a.currentTime : String(a.currentTime), delay: timing?.delay, duration: timing?.duration, iterations: timing?.iterations };
      });
      return { tag: node.tagName, class: node.getAttribute('class'), r, hasArea: r.width > 0 && r.height > 0, transform: s.transform, opacity: s.opacity, visibility: s.visibility, display: s.display, boxShadow: s.boxShadow, filter: s.filter, animations, insideCanvas: bounds ? inside(r, bounds) : false, insideConservativeOuter: inside(r, outer), clashes: obstacles.filter(o => overlap(r, o.r) > 0).map(o => ({ id: o.id, class: o.class, area: overlap(r, o.r) })) };
    });
    return { operation: motion.getAttribute('data-operation'), family: motion.getAttribute('data-family'), receipt: motion.getAttribute('data-receipt'), canvasCount: canvases.length, canvas: bounds, margin, actualMotion: r, conservativeOuter: outer, outerInsideCanvas: bounds ? inside(outer, bounds) : false, outerClashes: obstacles.filter(o => overlap(outer, o.r) > 0).map(o => ({ id: o.id, class: o.class, area: overlap(outer, o.r) })), tabs: book ? [...book.querySelectorAll(':scope>.catalogue-tabs>button')].filter(visible).map(node => ({ text: node.textContent, r: rect(node) })) : [], obstacles, nodes, wall: Date.now(), sampledPerformanceMs: performance.now() };
  });
  await attach(info, 'answer-trial-motion-conservative-clearance', data);
  expect(data.canvasCount).toBe(1); expect(data.tabs).toHaveLength(3); expect(data.operation).toBe('ANSWER_TRIAL'); expect(data.margin).toBe(90);
  expect(data.outerInsideCanvas, 'the actual answer motion plus its full90px conservative extent must remain inside the current trial canvas').toBe(true);
  expect(data.outerClashes, 'the full decorative extent must not cross reading text/caption, tabs, header/footer/pager, HUD or navigation').toEqual([]);
  for (const node of data.nodes.filter(node => node.hasArea)) {
    expect(node.insideCanvas, node.tag + '.' + node.class + ' actual animated box remains inside the canvas').toBe(true);
    expect(node.insideConservativeOuter, node.tag + '.' + node.class + ' is covered by the conservative outer bound').toBe(true);
    expect(node.clashes, node.tag + '.' + node.class + ' must not overlap full content or controls even at transparent animation frames').toEqual([]);
  }
}
async function readReceipt(page: Page, a: MilestoneActivity, after: Game, info: TestInfo, name: string) {
  if(after.status !== 'active')await art12Open(page,'manage');await page.getByTestId(after.status === 'active' ? 'hub-receipt' : 'life-receipt').click(); const review = page.getByTestId('milestone-review'); await expect(review).toHaveAttribute('data-readonly', 'true'); await expect(page.getByTestId('milestone-confirm')).toHaveCount(0);
  const read: string[] = []; for (let i = 0; i < 100; i++) {
    const copy = review.locator('.reading-text p'); read.push(await copy.innerText()); expect(await copy.evaluate(node => parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(18);
    const next = review.getByRole('button', { name: '下一页', exact: true }); if (await next.isDisabled()) break; await next.click(); if (i === 99) throw new Error('Saved milestone receipt did not finish');
  }
  const text = read.join(''); expect(text).toContain(after.journal.at(-1)!); expect(text).toContain(`实际耗物：无 · 灵石 0 · 游戏月 ${a.plan.action.type === 'END_LIFE' ? 1 : 0}`); expect(text).toContain('修为 0 · 气血 0 · 灵力 0 · 灵石净变 0'); expect(text).toContain('未自动');
  await geometry(page, info, name + '-readonly-receipt'); await page.getByTestId('milestone-cancel').click(); return read;
}
async function noReplays(page: Page, a: MilestoneActivity, after: Game, info: TestInfo, name: string) {
  const saved = await database(page), seen = await effects(page); await page.clock.fastForward(1700); await expect(page.locator(localResults)).toHaveCount(0); await expect(page.getByTestId('action-motion')).toHaveCount(0);
  const firstRead = await readReceipt(page, a, after, info, name); expect(await effects(page)).toEqual(seen); expect(await database(page)).toEqual(saved);
  await page.reload(); await expect(page.getByTestId('save-status')).toHaveText('已保存'); expect(await database(page)).toEqual(saved); await expect(page.locator(localResults)).toHaveCount(0); await expect(page.getByTestId('action-motion')).toHaveCount(0);
  if (after.status !== 'active') { await page.getByTestId('hub-current').getByRole('button', { name: '查看生平与收卷', exact: true }).click(); await expect(page.getByTestId('life-panel')).toBeVisible(); expect(await database(page)).toEqual(saved); }
  await observe(page, a.plan.action.type as Kind); const secondRead = await readReceipt(page, a, after, info, name + '-after-refresh'); expect(secondRead).toEqual(firstRead); expect(await effects(page)).toEqual([]); expect(await database(page)).toEqual(saved);
  await page.clock.fastForward(120000); expect(await database(page)).toEqual(saved); await expect(page.getByTestId('action-motion')).toHaveCount(0); await expect(page.locator(localResults)).toHaveCount(0);
  await attach(info, name + '-history-no-replay', { saved, seen, firstRead, secondRead, final: await database(page) });
}

test('M03-MF1 the explicitly selected six-second answer saves once before its own trial feedback and leaves the real first enemy unacted', async ({ page }, info) => {
  const d = driver(); for (let i = 0; i < 4; i++) d.realm(); prepareTrial(d); let before = await load(page, d.checkpoints.trial, info);
  await page.getByTestId('breakthrough').click(); await page.getByTestId('trial-review-entry').click(); const entry = await begin(page, 'trial-confirm-entry', 'START_TRIAL', 15000);
  const entered = await exactCompletion(page, entry, before, info, 'lawful-trial-preparation'); before = entered.after;
  const checkpoint = state(entered.saved, 'checkpoint'), owner = state(entered.saved, 'checkpoint-owner'); expect(checkpoint.kind).toBe('trial'); expect(checkpoint.snapshot).toEqual(entry.originGame);
  expect(owner).toEqual({ format: 'chenyuan-checkpoint-scope', version: 1, runId: before.core.runId, sourceRunId: checkpoint.sourceRunId, sourceRevision: checkpoint.sourceRevision, kind: 'trial' });
  const action = { type: 'ANSWER_TRIAL', answer: 'accept' } as const; expect(previewAction(before, action).allowed).toBe(true);
  await page.getByTestId('hub-current').getByRole('button', { name: '继续当前遭遇', exact: true }).click(); await page.getByTestId('story-show-choices').click(); await art12Choice(page,'story-select-answer-accept');
  await expect(page.getByTestId('response-table')).toHaveAttribute('data-model', 'question'); await expect(page.getByTestId('response-table')).toHaveAttribute('data-action', 'ANSWER_TRIAL'); await page.getByTestId('answer-accept').click();
  await observe(page, action.type); const a = await begin(page, 'milestone-confirm', action.type, 6000); expect(a.plan.action).toEqual(action); await expect(page.getByTestId('response-clock')).toHaveText('6 / 6 秒');
  const result = await exactCompletion(page, a, before, info, 'ANSWER_TRIAL'); expect(result.after.trial!.answer).toBe('accept'); expect(result.after.trial!.stage).toBe(1); expect(result.after.battle!.round).toBe(0); expect(result.after.battle!.log).toEqual([]);
  const motion = '[data-testid=action-motion][data-operation=ANSWER_TRIAL]'; await painted(page, motion); await expect(page.locator(motion)).toHaveAttribute('data-family', 'trial'); await expect(page.locator(motion)).toHaveAttribute('data-variant', 'answer'); await expect(page.locator(motion)).toHaveAttribute('data-receipt', JSON.stringify([a.runId, a.nextCommand!.commandId]));
  await expect(page.getByTestId('response-result')).toHaveCount(0); await expect(page.getByTestId('action-number')).toHaveCount(0); await expect(page.locator('.actor-impact,.actor-arrival')).toHaveCount(0);
  const shown = await effects(page); expect(shown).toHaveLength(1); expect(shown[0]).toMatchObject({ id: 'action-motion', operation: 'ANSWER_TRIAL', family: 'trial', visible: true });
  await answerMotionClearance(page, info, motion);
  const observation = await publicObservation(page, a, result.formal); await expect(page.getByTestId('trial-progress')).toBeVisible(); await geometry(page, info, 'answer-saved-current-trial', undefined, true);
  const journey = getTrialJourney(result.after)!; await expect(page.getByTestId('trial-progress-title')).toHaveText('渡劫行程'); const panel = page.getByTestId('trial-progress'), next = panel.getByRole('button', { name: '下一页', exact: true });
  for (let i = 0; i < 12 && !await page.getByTestId('trial-selected-effect').isVisible(); i++) { expect(await next.isEnabled()).toBe(true); await next.click(); }
  await expect(page.getByTestId('trial-selected-effect')).toHaveText(journey.effect + '。本轮贯穿三关，不能在关间改选。');
  await panel.getByTestId('resume-encounter').click(); await expect(page.getByTestId('battle-presence')).toHaveAttribute('data-state', 'ready'); await expect(page.getByTestId('battle-presence').getByRole('heading', { name: C.enemies[result.after.battle!.enemy].name, exact: true })).toBeVisible();
  await expect(page.locator('[data-asset-id="enemy-' + result.after.battle!.enemy + '"]')).toBeVisible(); await expect(page.getByTestId('round')).toHaveText('第 1 回合'); await expect(page.getByTestId('action-number')).toHaveCount(0); expect(await database(page)).toEqual(result.saved);
  await attach(info, 'answer-own-observation', { observation, shown, currentEnemy: result.after.battle!.enemy, checkpoint, owner }); await noReplays(page, a, result.after, info, 'ANSWER_TRIAL');
});

async function closing(page: Page, info: TestInfo, kind: 'RETIRE' | 'END_LIFE') {
  const d = driver(); let before: Game;
  if (kind === 'RETIRE') {
    before = await load(page, d.checkpoints.mortal, info); await page.getByTestId('breakthrough').click(); const breakthrough = await begin(page, 'milestone-confirm', 'BREAKTHROUGH', 30000);
    const prepared = await exactCompletion(page, breakthrough, before, info, 'lawful-qi-checkpoint'); before = prepared.after; expect(before.core.player.realm).toBe('qi');
    const cp = state(prepared.saved, 'checkpoint'); expect(cp.snapshot).toEqual(breakthrough.originGame); expect(cp.kind).toBe('breakthrough'); expect(state(prepared.saved, 'checkpoint-owner')).toEqual({ format: 'chenyuan-checkpoint-scope', version: 1, runId: before.core.runId, sourceRunId: cp.sourceRunId, sourceRevision: cp.sourceRevision, kind: cp.kind });
  } else {
    d.go('sect'); while (getLifeOverview(d.game).remainingMonths! > 1) d.doAction({ type: 'SOURCE', sourceId: 'work', count: Math.min(50, getLifeOverview(d.game).remainingMonths! - 1) });
    before = await load(page, d.game, info); expect(getLifeOverview(before).remainingMonths).toBe(1); const empty = await database(page); expect(state(empty, 'checkpoint')).toBeUndefined(); expect(state(empty, 'checkpoint-owner')).toBeUndefined();
  }
  const action = { type: kind } as const; expect(previewAction(before, action).allowed).toBe(true); await page.getByTestId('hub-life').click(); await page.getByTestId('life-mode-seal').click(); await art12Open(page,'manage'); await page.getByTestId(kind === 'RETIRE' ? 'retire' : 'end-life').click();
  await expect(page.getByTestId('life-confirmation')).toContainText(kind === 'RETIRE' ? '不消耗剩余游戏月' : '最后1游戏月'); await observe(page, kind); const a = await begin(page, 'life-confirm-end', kind, 12000); expect(a.plan.action).toEqual(action); await expect(page.getByTestId('life-scroll-clock')).toHaveText('12 / 12 秒');
  const result = await exactCompletion(page, a, before, info, kind); expect(result.after.status).toBe('ended'); expect(result.after.ending).toBe(kind === 'RETIRE' ? 'retired' : 'lifespan'); expect(result.after.core.runId).toBe(before.core.runId); expect(result.after.core.world.elapsedMonths - before.core.world.elapsedMonths).toBe(kind === 'RETIRE' ? 0 : 1);
  await painted(page, '[data-testid=life-scroll-result]'); await expect(page.getByTestId('life-scroll-result')).toHaveText('本次已保存 · ' + (kind === 'RETIRE' ? '归隐收卷' : '寿尽收卷')); await expect(page.getByTestId('life-scroll')).toHaveAttribute('data-sealed', 'true'); await expect(page.getByTestId('life-scroll')).toHaveAttribute('data-life', 'ended');
  const shown = await effects(page); expect(shown).toHaveLength(1); expect(shown[0]).toMatchObject({ id: 'life-scroll-result', life: 'ended', visible: true }); expect(Number(shown[0].identity)).toBeGreaterThan(0);
  const observation = await publicObservation(page, a, result.formal); await geometry(page, info, kind.toLowerCase() + '-saved-life', 'life-scroll-result', kind === 'END_LIFE');
  const pageRow = readingPages(lifeReadings(result.after).filter(row => row.group === 'life'))[0]; await expect(page.getByTestId('life-mode-life')).toHaveAttribute('aria-pressed', 'true'); await expect(page.getByTestId('life-panel').locator('.reading-text p')).toHaveText(pageRow.text);
  await attach(info, kind + '-own-observation', { observation, shown, expectedStaticConclusion: pageRow, checkpoint: state(result.saved, 'checkpoint'), owner: state(result.saved, 'checkpoint-owner') }); await noReplays(page, a, result.after, info, kind);
}

test('M03-MF2 explicitly confirmed retirement preserves a real complete checkpoint and shows only its own saved life scroll once', async ({ page }, info) => { await closing(page, info, 'RETIRE'); });
test('M03-MF3 the lawful final-month closure saves its one month only at twelve seconds and never replays the sealed-life result', async ({ page }, info) => { await closing(page, info, 'END_LIFE'); });

// ART12: the same controls now live inside explicit readonly surfaces.
async function art12Stores(page:Page){return page.evaluate(()=>new Promise<any>((accept,reject)=>{const q=indexedDB.open('chenyuan-playable-v1');q.onupgradeneeded=()=>{q.transaction!.abort();reject(Error('Readonly surface cannot create DB'));};q.onerror=()=>reject(q.error);q.onsuccess=()=>{const db=q.result,tx=db.transaction([...db.objectStoreNames],'readonly'),rows:any={};for(const name of db.objectStoreNames){rows[name]=[];const r=tx.objectStore(name).openCursor();r.onsuccess=()=>{if(r.result){rows[name].push({key:r.result.key,value:r.result.value});r.result.continue();}};}tx.oncomplete=()=>{db.close();accept({version:db.version,rows});};tx.onabort=()=>{db.close();reject(tx.error);};};}));}
async function art12Read(page:Page,body:()=>Promise<void>){const g=await snapshot(page),a=await activity(page),db=await art12Stores(page);await body();expect(await snapshot(page)).toEqual(g);expect(await activity(page)).toEqual(a);expect(await art12Stores(page)).toEqual(db);}
async function art12Open(page:Page,kind:'people'|'route'|'choices'|'manage'){const prefix=kind==='people'?'fate-people':kind==='route'?'fate-route':kind==='choices'?'response-choices':'life-manage';if(!await page.getByTestId(prefix+'-dialog').isVisible())await art12Read(page,async()=>{await page.getByTestId(prefix+'-open').click();await expect(page.getByTestId(prefix+'-dialog')).toBeVisible();});}
async function art12Close(page:Page,kind:'manage'){if(await page.getByTestId('life-manage-dialog').isVisible())await art12Read(page,async()=>{await page.getByTestId('life-manage-close').click();await expect(page.getByTestId('life-manage-dialog')).not.toBeVisible();});}
async function art12Person(page:Page,id:string){await art12Open(page,'people');await art12Read(page,async()=>{await page.getByTestId(id).click();await expect(page.getByTestId('fate-people-dialog')).not.toBeVisible();});}
async function art12Choice(page:Page,id:string){await art12Open(page,'choices');await art12Read(page,async()=>{await page.getByTestId(id).click();await expect(page.getByTestId('response-choices-dialog')).not.toBeVisible();});}
