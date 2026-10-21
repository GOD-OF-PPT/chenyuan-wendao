import {defineConfig} from '@playwright/test';
import {assertWebBuild} from '../scripts/assert-web-build.mjs';
import {sourceIdentity} from '../scripts/source-identity.mjs';

const build = assertWebBuild();
export default defineConfig({
  forbidOnly: !!process.env.CI,
  metadata: {chenyuan: sourceIdentity(), runtimeDigest: build.sourceDigest,
    scope: 'U8-C real online observation; synthetic new life; no accelerated clock'},
  testDir: './e2e', testMatch: 'idle-online.spec.ts',
  timeout: 35 * 60_000, expect: {timeout: 8_000},
  fullyParallel: false, workers: 1, retries: 0, maxFailures: 1,
  projects: [{name: 'chromium', use: {browserName: 'chromium'}}],
  use: {baseURL: 'http://127.0.0.1:4177', viewport: {width: 1440, height: 900},
    actionTimeout: 8_000, navigationTimeout: 15_000, trace: 'off', video: 'off', screenshot: 'only-on-failure'},
  outputDir: '../artifacts/goal-4/u8-c/online-results',
  reporter: [['list'], ['json', {outputFile: '../artifacts/goal-4/u8-c/online.json'}]],
  webServer: {command: 'npm run preview -- --port 4177 --strictPort',
    url: 'http://127.0.0.1:4177', reuseExistingServer: false},
});
