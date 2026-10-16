import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './persistence-tests', timeout: 60000, fullyParallel: true,
  workers: 2, retries: 0, reporter: [['list'], ['html', { outputFolder: 'persistence-report', open: 'never' }]],
  outputDir: 'persistence-results',
  projects: ['chromium', 'firefox', 'webkit'].map(name => ({ name, use: { browserName: name as 'chromium' | 'firefox' | 'webkit' } })),
  use: { baseURL: 'http://127.0.0.1:4174', trace: 'retain-on-failure' },
  webServer: { command: 'npm run dev -- --port 4174 --strictPort',
    url: 'http://127.0.0.1:4174/persistence-tests/harness.html', reuseExistingServer: false },
});
