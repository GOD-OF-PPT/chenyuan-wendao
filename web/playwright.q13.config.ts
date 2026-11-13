import base from './playwright.q06.config';
import numeric from './playwright.q07.config';

// Complete current Q11/Q12/Q13 union on one fixed desktop Chromium.
const origin = 'http://127.0.0.1:4200';
export default {
  ...base,
  testMatch: [...new Set([...base.testMatch, ...numeric.testMatch,
    'quality-result-moments.spec.ts', 'quality-style-surfaces.spec.ts', 'quality-text-containment.spec.ts'])],
  use: { ...base.use, baseURL: origin },
  projects: base.projects!.map(project => ({ ...project,
    use: { ...project.use, baseURL: origin } })),
  webServer: [
    { command: 'npm run preview -- --port 4200 --strictPort', url: origin, reuseExistingServer: false },
    { command: 'npm run dev -- --port 4177 --strictPort', url: 'http://127.0.0.1:4177/persistence-tests/harness.html', reuseExistingServer: false },
  ],
};
