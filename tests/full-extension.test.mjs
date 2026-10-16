import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, cpSync, copyFileSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { newGame } from '../src/full/engine.ts';

test('data-only event, recipe, skill and existing-effect relic additions work through the same engine and queries', () => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const temp = mkdtempSync(join(tmpdir(), 'chenyuan-extension-'));
  const uiBefore = readFileSync(join(root, 'web/src/App.vue'), 'utf8');
  try {
    mkdirSync(join(temp, 'src'), { recursive: true });
    mkdirSync(join(temp, 'tests'));
    cpSync(join(root, 'src/full'), join(temp, 'src/full'), { recursive: true });
    copyFileSync(join(root, 'tests/full-route.mjs'), join(temp, 'tests/full-route.mjs'));
    writeFileSync(join(temp, 'package.json'), JSON.stringify({ type: 'module' }));
    let content = readFileSync(join(temp, 'src/full/content.ts'), 'utf8');
    const insert = (anchor, value) => {
      assert.ok(content.includes(anchor), anchor);
      content = content.replace(anchor, anchor + '\n' + value);
    };
    content = content.replace("'full-demo.2'", "'full-demo.extension-test'");
    insert('export const items:Record<string,Item>={',
      " spare_heal:{name:'试验回春丸',min:'qi',buy:18,sell:5,kind:'medicine',description:'复用恢复效果',hp:35},");
    insert('export const recipes:Record<string,Recipe>={',
      " spare_recipe:{name:'试验配方',min:'qi',inputs:{herb:2},stones:2,months:1,output:'spare_heal'},");
    insert('export const skills:Record<string,Skill>={',
      " river_mind:{name:'试验剑心',school:'sword',slot:'mind',min:'foundation',price:100,description:'复用止水效果',effect:'still'},");
    insert('export const relics:Record<string,Relic>={',
      " resonant_seal:{name:'试验护印',description:'复用减伤',stones:140,inputs:{jade:4},effect:'jade_seal'},");
    writeFileSync(join(temp, 'src/full/content.ts'), content);
    let events = readFileSync(join(temp, 'src/full/events.ts'), 'utf8');
    const anchor = 'export const stories:Record<string,Story>={';
    assert.ok(events.includes(anchor));
    events = events.replace(anchor, anchor + "\n extension_meet:{id:'extension_meet',name:'试验机缘',npc:'行者',min:'qi',location:'sect',body:'一个已有机制的分支。',options:[{id:'ask',label:'交换',detail:'1灵石换丸',stones:1,gain:{spare_heal:1},result:'交换完成。'}]},");
    writeFileSync(join(temp, 'src/full/events.ts'), events);
    writeFileSync(join(temp, 'scenario.mjs'), `
import assert from 'node:assert/strict';
import {driver} from './tests/full-route.mjs';
import {newGame,parseGame,stats} from './src/full/engine.ts';
import {validateContent} from './src/full/validate-content.ts';
import {getItemSources} from './src/full/queries.ts';
const audit=validateContent();
const d=driver('leave','sword');d.go('sect');
d.doAction({type:'EVENT',event:'extension_meet'});d.doAction({type:'DECIDE',option:'ask'});
assert.equal(d.game.core.inventory.spare_heal,1);
d.resource('herb',2);d.go('cave');d.doAction({type:'CRAFT',recipeId:'spare_recipe'});
assert.equal(d.game.core.inventory.spare_heal,2);
assert.ok(getItemSources(d.game,'spare_heal').some(s=>s.id==='spare_recipe'));
assert.ok(getItemSources(d.game,'spare_heal').some(s=>s.id==='extension_meet:ask'&&!s.repeatable&&!s.available));
d.realm();d.realm();d.funds(1000);d.go('sect');
d.doAction({type:'LEARN',skill:'river_mind'});d.doAction({type:'EQUIP',skill:'river_mind'});
assert.equal(stats(d.game).cultivationBonus,25);
d.resource('jade',4);d.go('cave');d.doAction({type:'FORGE',relic:'resonant_seal'});d.doAction({type:'EQUIP_RELIC',relic:'resonant_seal'});
d.go('secret');d.doAction({type:'ENCOUNTER',enemy:'serpent'});const hp=d.game.core.player.hp;
d.doAction({type:'BATTLE',move:'attack'});assert.equal(hp-d.game.core.player.hp,12);
d.doAction({type:'BATTLE',move:'flee'});const wounded=d.game.core.player.hp;
d.doAction({type:'USE',item:'spare_heal'});assert.ok(d.game.core.player.hp>wounded);
assert.equal(d.game.core.inventory.spare_heal,1);
assert.deepEqual(parseGame(JSON.stringify(d.game)),d.game);
console.log(JSON.stringify({counts:audit.counts,schema:d.game.core.schemaVersion,version:d.game.version,keys:Object.keys(newGame('试验','schema'))}));
`);
    const result = JSON.parse(execFileSync(process.execPath, ['--experimental-strip-types', join(temp, 'scenario.mjs')], {
      cwd: temp, encoding: 'utf8', timeout: 30000,
    }));
    assert.equal(result.counts.items, 15);
    assert.equal(result.counts.recipes, 8);
    assert.equal(result.counts.skills, 13);
    assert.equal(result.counts.relics, 5);
    assert.equal(result.counts.stories, 36);
    assert.equal(result.schema, 2);
    assert.equal(result.version, 2);
    assert.deepEqual(result.keys, Object.keys(newGame('基线', 'schema')));
    for (const file of ['engine.ts', 'types.ts', 'queries.ts', 'mechanisms.ts']) {
      assert.equal(readFileSync(join(temp, 'src/full', file), 'utf8'), readFileSync(join(root, 'src/full', file), 'utf8'));
    }
    assert.equal(readFileSync(join(root, 'web/src/App.vue'), 'utf8'), uiBefore);
  } finally { rmSync(temp, { recursive: true, force: true }); }
});
