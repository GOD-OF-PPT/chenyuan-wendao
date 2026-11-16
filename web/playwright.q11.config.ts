import { defineConfig } from '@playwright/test';
import { sourceIdentity } from '../scripts/source-identity.mjs';
import { assertWebBuild } from '../scripts/assert-web-build.mjs';
assertWebBuild();
export default defineConfig({
    metadata: { chenyuan: sourceIdentity() },
    testDir: './e2e', testMatch: ['quality-result-moments.spec.ts'],
    timeout: 60000, expect: { timeout: 8000 }, fullyParallel: true, workers: 2, retries: 0,
    projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
    use: { baseURL: 'http://127.0.0.1:4190', viewport: { width: 1440, height: 900 }, trace: 'retain-on-failure' },
    reporter: [['list'], ['json', { outputFile: 'q11-report/results.json' }]],
    webServer: { command: 'npm run preview -- --port 4190 --strictPort', url: 'http://127.0.0.1:4190', reuseExistingServer: false },
});
