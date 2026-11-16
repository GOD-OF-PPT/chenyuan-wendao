import test from 'node:test';
import assert from 'node:assert/strict';
import {runCommand} from '../scripts/process-command.mjs';

test('validation executes the actual npm CLI without a shell on the current platform', () => {
  const result = runCommand('npm', ['--version'], {encoding: 'utf8'});
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout.trim(), /^\d+\.\d+\.\d+$/);
});

test('command arguments retain spaces and shell punctuation as literal data', () => {
  const literal = 'a b & echo not-a-command $HOME `literal`';
  const result = runCommand(process.execPath,
    ['-e', 'process.stdout.write(process.argv[1])', literal], {encoding: 'utf8'});
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, literal);
});
