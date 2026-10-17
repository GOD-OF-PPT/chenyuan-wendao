import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {sourceIdentity,runtimeSources,root,sha,filesUnder} from './source-identity.mjs';
export function validateBuildRecord(report,source,sources,files){assert.equal(report.format,'chenyuan-web-build');assert.equal(report.source.tree,source.tree,'Build belongs to an earlier source tree');assert.deepEqual(report.runtimeSources,sources,'Runtime changed since production build');assert.deepEqual(report.files,files,'Production files changed since build');return report;}
export function assertWebBuild(){const report=JSON.parse(fs.readFileSync(path.join(root,'web/build-report/build.json'),'utf8')),source=sourceIdentity(),files=filesUnder('web/dist').map(file=>({path:file.slice('web/dist/'.length),bytes:fs.statSync(path.join(root,file)).size,sha256:sha(fs.readFileSync(path.join(root,file)))}));return validateBuildRecord(report,source,runtimeSources(),files);}
