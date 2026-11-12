import fs from 'node:fs';
import path from 'node:path';
import {root} from './source-identity.mjs';

export function assertValidationPath(requested, workspace = root) {
  const artifacts = path.resolve(workspace, 'artifacts');
  const output = path.resolve(requested);
  if (!output.startsWith(artifacts + path.sep)) throw new Error('Validation output must be under artifacts');
  for (let current = output; current !== path.dirname(artifacts); current = path.dirname(current)) {
    let stat;
    try { stat = fs.lstatSync(current); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (stat && (stat.isSymbolicLink() || !fs.realpathSync(current).startsWith(path.resolve(workspace)))) throw new Error('Validation output follows a link');
  }
  return output;
}

export function newValidationOutput(requested, prefix, workspace = root) {
  const output = assertValidationPath(requested ?? path.join(workspace, 'artifacts', prefix + '-' + Date.now() + '-' + process.pid), workspace);
  if (fs.existsSync(output)) throw new Error('Refusing to overwrite validation evidence');
  fs.mkdirSync(output, {recursive: true});
  return output;
}
