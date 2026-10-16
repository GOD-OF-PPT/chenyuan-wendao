import test from 'node:test';
import assert from 'node:assert/strict';
import { driver } from './full-route.mjs';
import { getStoryContext, getRelationships } from '../src/full/queries.ts';

test('24 supporting-character paths acknowledge refused teaching and mirror choices without invented history', () => {
  let paths = 0;
  for (const intro of ['listen', 'decline']) for (const teach of ['teach', 'decline'])
    for (const stone of ['name', 'story', 'decline']) for (const mirror of ['accept', 'decline']) {
      const d = driver('leave', 'talisman'); d.event('lu_intro', intro); d.realm(); d.event('yan_stone', stone); d.realm();
      assert.ok(getStoryContext(d.game, 'lu_teach').body.includes(intro === 'listen' ? '当年为你指过物资来源' : '未曾做过你的授业师长'));
      if (teach === 'teach') d.resource('jade', 1); d.event('lu_teach', teach); d.realm();
      assert.ok(getStoryContext(d.game, 'yan_mirror').body.includes(stone === 'name' ? '你曾刻下的道号' : stone === 'story' ? '你记录的凡人故事' : '你没有在残碑留下名字或故事'));
      d.event('yan_mirror', mirror); d.realm();
      assert.ok(getStoryContext(d.game, 'lu_farewell').body.includes(teach === 'teach' ? '曾回山分玉授业' : '没有留下授业'));
      assert.ok(getStoryContext(d.game, 'yan_gate').body.includes(mirror === 'accept' ? '古镜前接纳旧我' : '没有替你写下“已经释怀”'));
      d.event('lu_farewell', 'remember'); d.event('yan_gate', 'resolve');
      const people = getRelationships(d.game);
      assert.deepEqual(people.find(p => p.id === 'lu').facts.map(f => f.choice), [intro, teach, 'remember']);
      assert.deepEqual(people.find(p => p.id === 'yan').facts.map(f => f.choice), [stone, mirror, 'resolve']);
      assert.equal(people.find(p => p.id === 'shen').label, '未识'); assert.equal(people.find(p => p.id === 'pei').label, '未识');
      paths++;
    }
  assert.equal(paths, 24);
});
