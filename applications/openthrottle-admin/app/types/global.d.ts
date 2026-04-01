import { OpenThrottleClientEnv } from '@openthrottle/react-router-utils';

/**
 * @description We store a global instance of "amplitude" and our "socket"
 * which are added to the "globalThis". We 👀 "have to" use a "var" below to
 * appease the types.
 */
declare global {
  // eslint-disable-next-line no-var, @typescript-eslint/no-explicit-any
  var deferredPrompt: any | undefined;

  /**
   * @description Define the environment variables that are available to this app.
   */
  interface Window {
    env: OpenThrottleClientEnv;
  }
}

export {};
