import { ENV_SOURCE } from '../config/environment';
import type {
  OpenThrottleEnv,
  OpenThrottlePublicEnv,
  OpenThrottleServerEnv,
} from '../types';

/**
 * @description Reads and validates the public environment tier — values that are
 * safe to serialize into the client (`window.env`). Use this when building the
 * payload roots inject into the browser; never serialize {@link getServerEnv}.
 * @publicApi
 */
export const getPublicEnv = (): OpenThrottlePublicEnv => {
  const apiUrlExternal = ENV_SOURCE['API_URL_EXTERNAL'];
  const appEnv = ENV_SOURCE['APP_ENV'];
  const appName = ENV_SOURCE['APP_NAME'];
  const appNameShort = ENV_SOURCE['APP_NAME_SHORT'];
  const appUrl = ENV_SOURCE['APP_URL'];
  const appUrlAdmin = ENV_SOURCE['APP_URL_ADMIN'];
  const appUrlCms = ENV_SOURCE['APP_URL_CMS'];
  const appUrlDeveloper = ENV_SOURCE['APP_URL_DEVELOPER'];
  const appUrlEmail = ENV_SOURCE['APP_URL_EMAIL'];
  const appUrlServer = ENV_SOURCE['APP_URL_SERVER'];
  const appUrlWebsite = ENV_SOURCE['APP_URL_WEBSITE'];
  const appVersion = ENV_SOURCE['APP_VERSION'];
  const nodeEnv = ENV_SOURCE['NODE_ENV'];
  const rollbarToken = ENV_SOURCE['ROLLBAR_TOKEN'];

  if (!apiUrlExternal) throw new Error('API_URL_EXTERNAL is not set');
  if (!appEnv) throw new Error('APP_ENV is not set');
  if (!appName) throw new Error('APP_NAME is not set');
  if (!appNameShort) throw new Error('APP_NAME_SHORT is not set');
  if (!appUrl) throw new Error('APP_URL is not set');
  if (!appUrlAdmin) throw new Error('APP_URL_ADMIN is not set');
  if (!appUrlCms) throw new Error('APP_URL_CMS is not set');
  if (!appUrlDeveloper) throw new Error('APP_URL_DEVELOPER is not set');
  if (!appUrlEmail) throw new Error('APP_URL_EMAIL is not set');
  if (!appUrlServer) throw new Error('APP_URL_SERVER is not set');
  if (!appUrlWebsite) throw new Error('APP_URL_WEBSITE is not set');
  if (!appVersion) throw new Error('APP_VERSION is not set');
  if (!nodeEnv) throw new Error('NODE_ENV is not set');
  if (!rollbarToken) throw new Error('ROLLBAR_TOKEN is not set');

  return {
    API_URL_EXTERNAL: apiUrlExternal,
    APP_ENV: appEnv,
    APP_NAME: appName,
    APP_NAME_SHORT: appNameShort,
    APP_URL: appUrl,
    APP_URL_ADMIN: appUrlAdmin,
    APP_URL_CMS: appUrlCms,
    APP_URL_DEVELOPER: appUrlDeveloper,
    APP_URL_EMAIL: appUrlEmail,
    APP_URL_SERVER: appUrlServer,
    APP_URL_WEBSITE: appUrlWebsite,
    APP_VERSION: appVersion.toString(),
    FEATURE_BETA_PREVIEW: ENV_SOURCE['FEATURE_BETA_PREVIEW'] ?? 'false',
    NODE_ENV: nodeEnv,
    ROLLBAR_TOKEN: rollbarToken.toString(),
  };
};

/**
 * @description Reads and validates the server-only environment tier. These
 * values describe internal topology and MUST NOT be serialized into the client.
 * Only call this from server-side code (loaders, actions, server entry points);
 * these keys are never present on the browser `window.env`.
 * @publicApi
 */
export const getServerEnv = (): OpenThrottleServerEnv => {
  // ENV_SOURCE is the public tier in the browser; the server-only keys live on
  // the full env (`process.env`) member of the union and are read by name here.
  const fullEnv = ENV_SOURCE as OpenThrottleEnv;
  const apiUrlInternal = fullEnv['API_URL_INTERNAL'];

  if (!apiUrlInternal) throw new Error('API_URL_INTERNAL is not set');

  return {
    API_URL_INTERNAL: apiUrlInternal,
  };
};

/**
 * @description Reads and validates the full environment (public + server-only
 * tiers). Server-side only — do not serialize the result into the client; use
 * {@link getPublicEnv} for the browser payload.
 * @publicApi
 */
export const getEnvironment = (): OpenThrottleEnv => ({
  ...getPublicEnv(),
  ...getServerEnv(),
});
