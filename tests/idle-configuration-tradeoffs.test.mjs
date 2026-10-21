import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import * as C from '../src/full/content.ts';
import {validateGame, previewResolution, stats} from '../src/full/engine.ts';
import {configurationPreview, configurationState} from '../src/full/configuration.ts';
import {ActivityLedger} from '../src/full/progression.ts';
import {defaultEncounterPlan} from '../src/full/adventure.ts';
import {economicSnapshot, reconcileLedger} from '../src/full/economy-ledger.ts';
import {createIdleRoute} from '../scripts/economy/idle-scenarios.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const sha = value => createHash('sha256').update(value).digest('hex');
const signature = value => sha(JSON.stringify(value));
const read = relative => fs.readFileSync(path.join(root, relative));
function inputsUnder(relative) {
  return fs.readdirSync(path.join(root, relative), {withFileTypes: true}).flatMap(entry => {
    const file = relative + '/' + entry.name;
    return entry.isDirectory() ? inputsUnder(file) : entry.isFile() && file.endsWith('.ts') ? [file] : [];
  });
}
function sourceRecord() {
  const paths = [...inputsUnder('src/full'), 'scripts/economy/idle-scenarios.mjs',
    'tests/idle-configuration-tradeoffs.test.mjs'].sort();
  const inputs = Object.fromEntries(paths.map(file => [file, sha(read(file))]));
  const buildPath = path.join(root, 'web/build-report/build.json');
  let build = null;
  // Unit execution also works in a clean checkout before building the browser.
  // When a local build exists, bind this control run to its exact runtime files.
  if (fs.existsSync(buildPath)) {
    const record = JSON.parse(fs.readFileSync(buildPath, 'utf8'));
    const actual = Object.fromEntries(Object.keys(record.runtimeSources).map(file => [file, sha(read(file))]));
    assert.deepEqual(actual, record.runtimeSources, 'the built runtime must remain frozen for this control');
    assert.equal(signature(actual), record.sourceDigest);
    build = {path: 'web/build-report/build.json', fileSha256: sha(fs.readFileSync(buildPath)),
      sourceDigest: record.sourceDigest, runtimeFileCount: Object.keys(actual).length,
      runtimeFilesMatched: true, metadata: record.source};
  }
  return {inputs, inputDigest: signature(inputs), build};
}

const options = {choice: 'leave', school: 'sword', preparation: 'gather', cultivation: 'natural',
  answer: 'accept', ending: 'transmit', advanced: false};
const advanced = {
  sword: ['sword_still', 'sword_guard', 'sword_echo'],
  talisman: ['talisman_calm', 'talisman_frost', 'talisman_return'],
};

test('one normally earned twelve-skill four-relic life gives eight independent configuration controls', async t => {
  const sourceBefore = sourceRecord();
  const route = createIdleRoute(options, {name: '配置取舍对照', runId: 'idle-configuration-control'});
  route.begin();
  route.grow('spirit');

  const missing = Object.keys(C.skills).filter(id => !route.game.learned.includes(id));
  const studyBudget = missing.reduce((sum, id) => sum + C.skills[id].price, 0);
  route.funds(studyBudget, '明确筹齐十二法研习费用');
  route.go('sect', '明确前往宗门研习');
  if (missing.length) route.run({kind: 'learn', skills: missing, maxCycles: missing.length,
    stoneBudget: studyBudget, stoneReserve: 0}, '明确研习剩余功法，跨派学习不自动换槽');

  for (const [id, relic] of Object.entries(C.relics)) {
    if (route.game.ownedRelics.includes(id)) continue;
    for (const [item, quantity] of Object.entries(relic.inputs))
      route.material(item, quantity, '四器控制 · 正常备料');
    route.funds(relic.stones, '四器控制 · 明确筹资');
    route.go('cave', '四器控制 · 明确返回洞府');
    route.run({kind: 'forge', relicId: id, maxCycles: 1, stoneBudget: relic.stones, stoneReserve: 0,
      monthBudget: C.actionDurations.forge, remainingMonthsReserve: 1, itemReserves: {}}, '明确一次炼成' + relic.name);
  }
  route.buy('healing_pill', 3, '控制前明确采购三枚回春丹');
  route.buy('spirit_pill', 3, '控制前明确采购三枚回灵丹');
  route.go('cave', '控制前明确返回洞府');
  const maximum = stats(route.game);
  if (route.game.core.player.hp < maximum.maxHp || route.game.core.player.mp < maximum.maxMp)
    route.run({kind: 'rest', maxCycles: 1, remainingMonthsReserve: 1}, '控制前仅在未满时明确疗养');

  const earned = route.game, original = structuredClone(earned), baseSignature = signature(earned);
  validateGame(earned);
  assert.equal(earned.core.player.realm, 'spirit');
  assert.deepEqual([...earned.learned].sort(), Object.keys(C.skills).sort());
  assert.deepEqual([...earned.ownedRelics].sort(), Object.keys(C.relics).sort());
  assert.equal(earned.core.inventory.healing_pill, 3);
  assert.equal(earned.core.inventory.spirit_pill, 3);
  assert.equal(earned.core.player.hp, maximum.maxHp);
  assert.equal(earned.core.player.mp, maximum.maxMp);
  assert.deepEqual(earned.choices, {});
  const earnedLedger = route.activity.ledger.report(true);
  reconcileLedger(earnedLedger.initial, earnedLedger.entries, earnedLedger.closing);
  assert.ok(earnedLedger.entries.some(row => row.command.type === 'FORGE'));
  assert.ok(earnedLedger.entries.some(row => row.command.type === 'LEARN'));
  assert.ok(earnedLedger.entries.every(row => row.result.executedSteps === 1 && row.result.requestedSteps === 1));

  const rows = [];
  for (const school of ['sword', 'talisman']) for (const relic of Object.keys(C.relics)) {
    await t.test(school + '/' + relic, () => {
      const branchInput = structuredClone(earned);
      assert.equal(signature(branchInput), baseSignature);
      const audit = new ActivityLedger(branchInput, 'control-' + school + '-' + relic);
      const configurations = [];
      const configure = action => {
        const before = audit.game, immutable = structuredClone(before);
        const quote = configurationPreview(before, action), formal = previewResolution(before, action);
        assert.equal(quote.allowed, true, quote.failure?.message);
        assert.equal(formal.ok, true);
        assert.deepEqual(before, immutable, 'preview must not change its actual before Game');
        const result = audit.configure(action, '控制支路明确配装');
        assert.deepEqual(audit.game, formal.value.nextState);
        assert.deepEqual(configurationState(audit.game), quote.after);
        assert.deepEqual(result.costs, {stones: 0, mp: 0, months: 0, items: {}});
        configurations.push({action, before: quote.before, after: quote.after, result});
      };
      if (audit.game.school !== school) configure({type: 'SCHOOL', school});
      for (const skill of advanced[school])
        if (audit.game.loadout[C.skills[skill].slot] !== skill) configure({type: 'EQUIP', skill});
      const alreadyEquipped = audit.game.loadout.relic === relic;
      if (!alreadyEquipped) configure({type: 'EQUIP_RELIC', relic});
      assert.equal(audit.game.school, school);
      for (const skill of advanced[school]) assert.equal(audit.game.loadout[C.skills[skill].slot], skill);
      assert.equal(audit.game.loadout.relic, relic);
      assert.equal(configurations.some(row => row.action.type === 'EQUIP_RELIC'), !alreadyEquipped);
      assert.deepEqual(audit.game.core.inventory, earned.core.inventory);
      assert.deepEqual(audit.game.core.player, earned.core.player);

      const configured = audit.game, enemy = 'sentinel';
      if (configured.core.world.location !== C.enemies[enemy].location)
        audit.run({kind: 'travel', location: C.enemies[enemy].location, maxCycles: 1}, '控制支路明确行旅至守灵');
      const combatBefore = audit.game, plan = defaultEncounterPlan(combatBefore, enemy);
      const activity = audit.run(plan, '控制支路仅一次默认有限守灵历练');
      const after = audit.game, ledger = audit.ledger.report(true);
      validateGame(after);
      reconcileLedger(ledger.initial, ledger.entries, ledger.closing);
      assert.equal(activity.version, 6);
      assert.ok(['stopped', 'paused'].includes(activity.status));
      assert.ok(activity.stopReason, 'finite victory, budget or risk boundary must remain explicit');
      assert.ok(activity.victories === 0 || activity.victories === 1);
      assert.equal(after.wins - combatBefore.wins, activity.victories);
      assert.equal(activity.battleTurns, ledger.totals.battleTurns);
      assert.ok(activity.completedCycles <= plan.maxCycles);
      assert.ok(activity.spentMp <= plan.mpBudget);
      assert.ok((activity.spentItems.healing_pill ?? 0) <= plan.strategy.healingBudget);
      assert.ok((activity.spentItems.spirit_pill ?? 0) <= plan.strategy.spiritBudget);
      assert.ok(ledger.entries.every(row => row.result.executedSteps === 1 && row.result.requestedSteps === 1));
      for (const entry of ledger.entries.filter(row => !['SCHOOL', 'EQUIP', 'EQUIP_RELIC'].includes(row.command.type)))
        assert.match(entry.command.commandId, /^cycle:/);
      for (const [item, quantity] of Object.entries(C.enemies[enemy].loot))
        assert.equal(after.core.inventory[item] - combatBefore.core.inventory[item], quantity * activity.victories);
      if (activity.victories) assert.equal(after.battle, null);
      assert.equal(audit.onlineMs, audit.steps.reduce((sum, step) => sum + step.onlineMs, 0));
      assert.deepEqual(earned, original);
      assert.equal(signature(branchInput), baseSignature, 'ActivityLedger must also preserve its supplied clone');
      rows.push({school, relic, baseGameSignature: baseSignature, branchInputSignature: signature(branchInput),
        configuredGameSignature: signature(configured), startingCombatGameSignature: signature(combatBefore),
        starting: economicSnapshot(combatBefore), startingLoadout: {...combatBefore.loadout},
        configurations, skippedAlreadyEquippedRelic: alreadyEquipped, plan,
        status: activity.status, stopReason: activity.stopReason, victories: activity.victories,
        defeats: activity.defeats, retreats: activity.retreats, turns: activity.battleTurns,
        grossMpSpent: activity.spentMp, spentItems: {...activity.spentItems},
        ending: economicSnapshot(after), finalGameSignature: signature(after),
        onlineMs: audit.onlineMs, steps: audit.steps, ledger});
    });
  }
  assert.equal(rows.length, 8);
  const effectSignature = row => signature({turns: row.turns, hp: row.ending.hp, mp: row.ending.mp,
    medicine: row.spentItems, mpSpent: row.grossMpSpent, status: row.status, stopReason: row.stopReason.code});
  for (const school of ['sword', 'talisman'])
    assert.ok(new Set(rows.filter(row => row.school === school).map(effectSignature)).size > 1,
      'relics must produce an actual resource/round difference within ' + school + ', not just different labels');
  assert.equal(new Set(rows.map(row => row.baseGameSignature)).size, 1);
  assert.deepEqual(earned, original);
  assert.deepEqual(route.game, original);
  const sourceAfter = sourceRecord();
  assert.deepEqual(sourceAfter, sourceBefore, 'runtime and inputs must remain frozen during all eight controls');
  const report = {format: 'chenyuan-idle-configuration-control', version: 1, recordedAt: new Date().toISOString(),
    execution: {node: process.version, executable: process.execPath, versions: process.versions,
      execArgv: process.execArgv, independentCombinations: 8, nativeTestShape: 'one parent with eight subtests'},
    source: sourceBefore, options, earnedBase: {game: original, gameSignature: baseSignature,
      onlineMs: route.activity.onlineMs, steps: route.activity.steps, ledger: earnedLedger},
    controls: rows, inputUnchanged: true, actualDifferences: true,
    limits: ['Synthetic normal new life; no imported or directly granted resources.',
      'Only explicit finite Activity plans and formal configuration confirmations change audit clones.',
      'Durations are exact accumulated formal periods, not a live online wait or balance acceptance.',
      'No browser, repository, user save, compatibility or environment/performance test.']};
  const output = path.join(root, 'artifacts/goal-4/u8-b/configuration-control.json');
  fs.mkdirSync(path.dirname(output), {recursive: true});
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
});
