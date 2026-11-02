import test from 'node:test';
import {execFileSync} from 'node:child_process';

test('actual candidate notes and every core CI consumer preserve dependencies, idle boundaries and original assembly gates', () => {
  execFileSync('python3', ['tests/candidate_documents_test.py'], {stdio: 'pipe'});
});
