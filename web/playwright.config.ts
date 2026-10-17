import {assertWebBuild} from '../scripts/assert-web-build.mjs';
import {sourceIdentity} from '../scripts/source-identity.mjs';
import { defineConfig } from '@playwright/test';
assertWebBuild();
export default defineConfig({
  metadata:{chenyuan:sourceIdentity()},
  testDir: './e2e', timeout: 60000, expect: { timeout: 8000 },
  fullyParallel: true, workers: 2, retries: 0,
  reporter: [['list'], ['json',{outputFile:'recovery-report/ui.json'}], ['html', { open: 'never' }]],
  projects: ['chromium', 'firefox', 'webkit'].map(name => ({ name, use: { browserName: name as 'chromium' | 'firefox' | 'webkit', ...(name === 'firefox' ? { launchOptions: { firefoxUserPrefs: { 'network.proxy.type': 0 } } } : {}) } })),
  use: { baseURL: 'http://127.0.0.1:4173', viewport: { width: 1440, height: 1000 }, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  webServer: { command: 'npm run preview -- --port 4173 --strictPort', url: 'http://127.0.0.1:4173', reuseExistingServer: false },
});
