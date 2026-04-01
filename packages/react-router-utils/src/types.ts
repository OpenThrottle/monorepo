export type OpenThrottleEnv = {
  // API endpoints
  API_URL_EXTERNAL: string;
  API_URL_INTERNAL: string;

  // This application
  APP_ENV: 'development' | 'production' | 'staging' | 'test';
  APP_NAME: string;
  APP_URL: string;
  APP_VERSION: string;

  // Sibling applications
  APP_URL_ADMIN: string;
  APP_URL_CMS: string;
  APP_URL_DEVELOPER: string;
  APP_URL_EMAIL: string;
  APP_URL_SERVER: string;
  APP_URL_WEBSITE: string;

  // Environment
  NODE_ENV: 'development' | 'production' | 'staging' | 'test';
  ROLLBAR_TOKEN: string;
};

export type OpenThrottleWindow = typeof window &
  typeof globalThis & {
    env: OpenThrottleEnv;
  };

/** @description Alias for {@link OpenThrottleEnv} (client `window.env` shape). */
export type OpenThrottleClientEnv = OpenThrottleEnv;
