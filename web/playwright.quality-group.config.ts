import language from './playwright.q03.config';
import continuing from './playwright.q04.config';
import direct from './playwright.q05.config';

// One fixed-browser union for this group. Its own port also belongs to every
// secondary context via project.use.baseURL; normal journeys remain independent.
export default {
  ...language,
  testMatch: [...new Set([...language.testMatch, ...continuing.testMatch, ...direct.testMatch])],
  use: {...language.use, baseURL: 'http://127.0.0.1:4176'},
  webServer: {command: 'npm run preview -- --port 4176 --strictPort', url: 'http://127.0.0.1:4176', reuseExistingServer: false},
};
