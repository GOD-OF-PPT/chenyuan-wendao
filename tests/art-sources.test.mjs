import test from 'node:test';
import {execFileSync} from 'node:child_process';

test('archived art sources restore exact originals and reject unsafe or altered inputs', () => {
  execFileSync(process.platform === 'win32' ? 'python' : 'python3',
    ['-m', 'unittest', 'discover', '-s', 'scripts', '-p', 'test_art_sources.py'], {stdio: 'pipe'});
});

test('tracked size counts every indexed path and enforces the strict byte limit', () => {
  execFileSync(process.platform === 'win32' ? 'python' : 'python3',
    ['-m', 'unittest', 'discover', '-s', 'scripts', '-p', 'test_tracked_size.py'], {stdio: 'pipe'});
});
