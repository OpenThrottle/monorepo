import { ENV_SOURCE, IS_BROWSER } from '../config/environment';
import type { OpenThrottleEnv } from '../types';

export const getEnvironment = (): OpenThrottleEnv => {
  const apiUrl = IS_BROWSER
    ? ENV_SOURCE['API_URL']
    : process.env.API_URL_INTERNAL;

  const apiUrlGraphql = `${apiUrl}/graphql`;
  const apiUrlWebsocket = ENV_SOURCE['API_URL_WEBSOCKET'];
  const appEnv = ENV_SOURCE['APP_ENV'];
  const appName = ENV_SOURCE['APP_NAME'];
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

  if (!apiUrl) throw new Error('API_URL is not set');
  if (!apiUrlWebsocket) throw new Error('API_URL_WEBSOCKET is not set');
  if (!appEnv) throw new Error('APP_ENV is not set');
  if (!appName) throw new Error('APP_NAME is not set');
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

  const env: OpenThrottleEnv = {
    API_URL: apiUrl,
    API_URL_GRAPHQL: apiUrlGraphql,
    API_URL_WEBSOCKET: apiUrlWebsocket,
    APP_ENV: appEnv,
    APP_NAME: appName,
    APP_URL: appUrl,
    APP_URL_ADMIN: appUrlAdmin,
    APP_URL_CMS: appUrlCms,
    APP_URL_DEVELOPER: appUrlDeveloper,
    APP_URL_EMAIL: appUrlEmail,
    APP_URL_SERVER: appUrlServer,
    APP_URL_WEBSITE: appUrlWebsite,
    APP_VERSION: appVersion.toString(),
    NODE_ENV: nodeEnv,
    ROLLBAR_TOKEN: rollbarToken.toString(),
  };

  return env;
};
