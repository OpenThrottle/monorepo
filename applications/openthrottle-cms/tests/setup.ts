import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});

// Satisfy react-router-utils environment.ts in jsdom (IS_BROWSER true, window.env used)
if (typeof window !== 'undefined') {
  window.env = {
    API_URL: 'http://localhost:6021',
    API_URL_GRAPHQL: 'http://localhost:6021/graphql',
    API_URL_WEBSOCKET: 'http://localhost:6021',
    APP_ENV: 'test',
    APP_NAME: 'openthrottle-cms',
    APP_URL: 'http://localhost',
    APP_URL_ADMIN: 'http://localhost:6022',
    APP_URL_CMS: 'http://localhost:6023',
    APP_URL_DEVELOPER: 'http://localhost:6024',
    APP_URL_EMAIL: 'http://localhost:6025',
    APP_URL_SERVER: 'http://localhost:6026',
    APP_URL_WEBSITE: 'http://localhost:6027',
    APP_VERSION: '1.0.0',
    NODE_ENV: 'test',
    ROLLBAR_TOKEN: 'xxxxxxxxxxxxxxxx',
  };
}
