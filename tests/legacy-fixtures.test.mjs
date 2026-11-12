import test from 'node:test';
import {execFileSync} from 'node:child_process';

test('historical fixture preparation survives deleted inputs without overwriting local data', () => {
  execFileSync(process.platform === 'win32' ? 'python' : 'python3',
    ['tests/legacy_fixtures_test.py'], {stdio: 'pipe'});
});
