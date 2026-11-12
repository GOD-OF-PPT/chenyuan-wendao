import fs from 'node:fs';
import path from 'node:path';
import {spawnSync, execFileSync} from 'node:child_process';

// Windows cannot exec npm.cmd directly. Run its real JS entry point with the
// selected Node, preserving argument boundaries and avoiding a command shell.
export function commandSpec(command, args) {
  // Prefer the activated Python environment over the Windows Store python3 alias.
  if (command === 'python3' && process.platform === 'win32') return ['python', args];
  if (command !== 'npm' || process.platform !== 'win32') return [command, args];
  for (const directory of (process.env.PATH ?? '').split(path.delimiter)) {
    if (!directory) continue;
    const cli = path.join(directory, 'node_modules/npm/bin/npm-cli.js');
    if (fs.existsSync(path.join(directory, 'npm.cmd')) && fs.existsSync(cli)) {
      return [process.execPath, [cli, ...args]];
    }
  }
  throw new Error('npm CLI not found on PATH; install npm alongside Node');
}

export function runCommand(command, args, options) {
  const [executable, parameters] = commandSpec(command, args);
  return spawnSync(executable, parameters, options);
}

export function execCommand(command, args, options) {
  const [executable, parameters] = commandSpec(command, args);
  return execFileSync(executable, parameters, options);
}
