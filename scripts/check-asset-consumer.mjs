import assert from 'node:assert/strict';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
import sfc from '../web/node_modules/@vue/compiler-sfc/dist/compiler-sfc.cjs.js';

// Inspect staged syntax only. Never import/execute a contributor's component.
const args = process.argv.slice(2);
assert.equal(args.length, 6, 'Use --root ROOT --consumer FILE --asset PATH');
assert.deepEqual([args[0], args[2], args[4]], ['--root', '--consumer', '--asset']);
const root = path.resolve(args[1]), consumer = args[3], asset = args[5];
assert.ok(consumer.startsWith('web/src/') && consumer.endsWith('.vue') && !consumer.includes('..'));
const read = name => execFileSync('git', ['show', ':' + name], {cwd: root, encoding: 'utf8', maxBuffer: 512_000});
const {descriptor, errors} = sfc.parse(read(consumer), {filename: consumer});
assert.deepEqual(errors, [], 'Consumer must be valid Vue source');
assert.ok(descriptor.template, 'Consumer must have a rendered template');
const imageTags = new Set();
for (const script of [descriptor.script, descriptor.scriptSetup].filter(Boolean)) {
  const syntax = ts.createSourceFile(consumer + '.ts', script.content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  assert.equal(syntax.parseDiagnostics.length, 0);
  for (const statement of syntax.statements) {
    if (!ts.isImportDeclaration(statement) || statement.importClause?.isTypeOnly ||
      !statement.importClause?.name || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    const imported = path.posix.normalize(path.posix.join(path.posix.dirname(consumer), statement.moduleSpecifier.text));
    if (imported === 'web/src/AssetImage.vue') {
      read(imported);
      imageTags.add(statement.importClause.name.text);
    }
  }
}
const ast = descriptor.template.ast ?? sfc.compileTemplate({source: descriptor.template.content, filename: consumer, id: 'asset-consumer'}).ast;
let matched = false;
function visit(node, unreachable = false) {
  if (node.type === 1) {
    unreachable ||= node.props.some(p => p.type === 7 && p.name === 'if' && ['false', '0', 'null', 'undefined'].includes(p.exp?.content.trim()));
    if (!unreachable) {
      const attribute = node.tag === 'img' ? 'src' : imageTags.has(node.tag) ? 'path' : null;
      matched ||= !!attribute && node.props.some(p => p.type === 6 && p.name === attribute && p.value?.content === asset);
    }
  }
  for (const child of node.children ?? []) visit(child, unreachable);
}
visit(ast);
assert.ok(matched, 'No supported live template image reference; comments/prose/unused strings do not consume assets');
console.log(JSON.stringify({consumer, asset, supportedTemplateReference: true, runtimeVisibilityVerified: false}));
