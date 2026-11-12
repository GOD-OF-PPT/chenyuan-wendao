import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {newValidationOutput} from '../scripts/validation-output.mjs';

test('validation evidence uses a new owned directory and refuses overwrite or outside paths', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'chenyuan-output-'));
  try {
    const output = path.join(root, 'artifacts', 'first');
    assert.equal(newValidationOutput(output, 'test', root), output);
    fs.writeFileSync(path.join(output, 'original.json'), 'retain');
    assert.throws(() => newValidationOutput(output, 'test', root), /overwrite/);
    assert.equal(fs.readFileSync(path.join(output, 'original.json'), 'utf8'), 'retain');
    assert.throws(() => newValidationOutput(path.join(root, '..', 'outside'), 'test', root), /under artifacts/);
    const external = path.join(root, 'external'); fs.mkdirSync(external);
    const alias = path.join(root, 'artifacts', 'alias');
    fs.symlinkSync(external, alias, process.platform === 'win32' ? 'junction' : 'dir');
    assert.throws(() => newValidationOutput(path.join(alias, 'report'), 'test', root), /link/);
    assert.deepEqual(fs.readdirSync(external), []);
  } finally { fs.rmSync(root, {recursive: true, force: true}); }
});
