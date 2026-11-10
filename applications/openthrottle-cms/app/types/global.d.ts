/**
 * We store a global instance of "amplitude" and our "socket" which are added
 * to the "globalThis". We 👀 "have to" use a "var" below to appease the types.
 */
declare global {
  // eslint-disable-next-line no-var, @typescript-eslint/no-explicit-any
  var deferredPrompt: any | undefined;

  /**
   * Define the environment variables that are available to this app.
   */
  interface Window {
    env: {
      APP_ENV: 'development' | 'production' | 'staging' | 'test';
      APP_NAME: string;
      APP_URL: string;
      APP_VERSION: string;
      NODE_ENV: 'development' | 'production' | 'staging' | 'test';
      ROLLBAR_TOKEN: string;
    };

    gtag: any;
  }
}

export {};
