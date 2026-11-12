import test from 'node:test';
import assert from 'node:assert/strict';
import {viteRepositoryPath} from '../web/persistence-tests/fs-root.ts';

test('the actual native harness filesystem route keeps Windows drives and POSIX absolute roots', () => {
  assert.equal('/@fs' + viteRepositoryPath('E:\\repo\\game\\'), '/@fs/E:/repo/game/');
  assert.equal('/@fs' + viteRepositoryPath('/Users/player/game/'), '/@fs/Users/player/game/');
});
test('repository directory names remain URL path data rather than query or fragment syntax', () => {
  const route = '/@fs' + viteRepositoryPath('E:\\my game#1?draft%2\\');
  assert.equal(route, '/@fs/E:/my%20game%231%3Fdraft%252/');
  const url = new URL(route, 'http://127.0.0.1:4174');
  assert.equal(url.hash, ''); assert.equal(url.search, '');
});
