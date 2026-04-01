import { OpenThrottleEnv, OpenThrottleWindow } from '../types';

export const IS_BROWSER = typeof document !== 'undefined';

// FIXME: Tighten this up
export const ENV_SOURCE = IS_BROWSER
  ? (window as unknown as OpenThrottleWindow).env // eslint-disable-line @typescript-eslint/consistent-type-assertions
  : (process.env as unknown as OpenThrottleEnv & NodeJS.ProcessEnv); // eslint-disable-line @typescript-eslint/consistent-type-assertions

// create a util to filter "process.env" to the keys we expect in the OpenThrottleEnv type

export const NODE_ENV = ENV_SOURCE.NODE_ENV || 'development';

export const IS_DEVELOPMENT = NODE_ENV !== 'production';
export const IS_PRODUCTION = NODE_ENV === 'production';
export const IS_STAGING = NODE_ENV === 'staging';
