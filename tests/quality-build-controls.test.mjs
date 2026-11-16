import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as C from '../src/full/content.ts';
import { driver } from './full-route.mjs';
import { ActivityLedger } from '../src/full/progression.ts';
import {
  defaultEncounterPlan,
  defaultBattlePlan,
} from '../src/full/adventure.ts';
import {
  sourceIdentity,
  runtimeSources,
  sha,
} from '../scripts/source-identity.mjs';

test('both schools, all eight legal branch combinations and four relics retain real different combat and trial outcomes', () => {
  const rows = [];
  for (const school of ['sword', 'talisman']) {
    const d = driver('leave', school);
    while (d.game.core.player.realm !== 'spirit') d.realm();
    d.funds(5000);
    for (const [id, relic] of Object.entries(C.relics)) {
      for (const [item, quantity] of Object.entries(relic.inputs))
        d.resource(item, quantity);
      d.go('cave');
      d.doAction({ type: 'FORGE', relic: id });
    }
    d.craft('ascension');
    d.buy('healing_pill', 12);
    d.buy('spirit_pill', 4);
    d.meditate();
    d.rest();
    const base = d.game,
      immutable = structuredClone(base);
    const groups = ['mind', 'builder', 'finisher'].map((slot) =>
      Object.entries(C.skills)
        .filter(([, s]) => s.school === school && s.slot === slot && s.branch)
        .map(([id]) => id),
    );
    for (let bits = 0; bits < 8; bits++)
      for (const relic of Object.keys(C.relics)) {
        const selected = groups.map((ids, i) => ids[(bits >> i) & 1]);
        const preparation = new ActivityLedger(
          base,
          `build-${school}-${bits}-${relic}`,
        );
        preparation.run(
          { kind: 'travel', location: 'sect', maxCycles: 1 },
          '明确前往宗门',
        );
        preparation.run(
          {
            kind: 'learn',
            skills: selected,
            maxCycles: 3,
            stoneBudget: 340,
            stoneReserve: 0,
          },
          '明确选择三卷互斥分支',
        );
        for (const skill of selected)
          preparation.configure({ type: 'EQUIP', skill }, '明确配装已学经卷');
        preparation.configure({ type: 'EQUIP_RELIC', relic }, '首次认主');
        const configured = preparation.game,
          combat = [],
          trials = [];
        for (const enemy of ['puppet', 'shadow', 'sentinel']) {
          const ledger = new ActivityLedger(configured, `enemy-${enemy}`);
          ledger.run(
            {
              kind: 'travel',
              location: C.enemies[enemy].location,
              maxCycles: 1,
            },
            '明确抵达敌方所在',
          );
          const plan = defaultEncounterPlan(ledger.game, enemy),
            out = ledger.run(plan, '仅安排当前一场');
          assert.ok(out.completedCycles <= plan.maxCycles);
          assert.ok(out.spentMp <= plan.mpBudget);
          assert.equal(out.gainedXp, 0);
          assert.equal(ledger.game.wins - configured.wins, out.victories);
          combat.push({
            enemy,
            turns: out.battleTurns,
            victories: out.victories,
            status: out.status,
            stop: out.stopReason.code,
            hp: ledger.game.core.player.hp,
            mp: ledger.game.core.player.mp,
            spentMp: out.spentMp,
            items: out.spentItems,
            moves: out.moves,
          });
        }
        for (const answer of ['accept', 'release']) {
          const ledger = new ActivityLedger(configured, `trial-${answer}`);
          ledger.run(
            { kind: 'travel', location: 'terrace', maxCycles: 1 },
            '明确前往登仙台',
          );
          ledger.run(
            {
              kind: 'milestone',
              action: { type: 'START_TRIAL' },
              maxCycles: 1,
            },
            '明确入劫',
          );
          ledger.run(
            {
              kind: 'milestone',
              action: { type: 'ANSWER_TRIAL', answer },
              maxCycles: 1,
            },
            '明确回答问心',
          );
          const stages = [];
          while (ledger.game.battle) {
            const stage = ledger.game.trial.stage,
              plan = defaultBattlePlan(ledger.game),
              out = ledger.run(plan, '仅安排当前一关');
            stages.push({
              stage,
              turns: out.battleTurns,
              victories: out.victories,
              hp: ledger.game.core.player.hp,
              stop: out.stopReason.code,
              items: out.spentItems,
              moves: out.moves,
            });
            if (ledger.game.trial?.stage === stage) break;
          }
          assert.ok(
            ledger.game.trial?.stage === 4 || stages.at(-1).victories === 0,
          );
          trials.push({
            answer,
            complete: ledger.game.trial?.stage === 4,
            stages,
          });
        }
        rows.push({ school, bits, selected, relic, combat, trials });
        assert.deepEqual(base, immutable);
      }
  }
  assert.equal(rows.length, 64);
  assert.equal(rows.flatMap((r) => r.combat).length, 192);
  assert.equal(rows.flatMap((r) => r.trials).length, 128);
  for (const school of ['sword', 'talisman'])
    for (const answer of ['accept', 'release'])
      assert.ok(
        rows.some(
          (r) =>
            r.school === school &&
            r.trials.some((t) => t.answer === answer && t.complete),
        ),
        `${school}/${answer} retains a prepared legal route`,
      );
  for (const school of ['sword', 'talisman'])
    for (const slot of [0, 1, 2]) {
      const before = rows.find(
        (r) => r.school === school && r.bits === 0 && r.relic === 'jade_seal',
      );
      const after = rows.find(
        (r) =>
          r.school === school &&
          r.bits === 1 << slot &&
          r.relic === 'jade_seal',
      );
      assert.notDeepEqual(
        after.combat,
        before.combat,
        `${school} slot ${slot} must change actual outcomes`,
      );
    }
  const output = process.env.CYW_BUILD_REPORT;
  if (output)
    fs.writeFileSync(
      output,
      JSON.stringify(
        {
          version: 1,
          source: sourceIdentity(),
          runtime: sha(JSON.stringify(runtimeSources())),
          content: C.VERSION,
          balance: C.BALANCE,
          builds: 64,
          encounters: 192,
          trialPaths: 128,
          rows,
        },
        null,
        2,
      ) + '\n',
    );
});
