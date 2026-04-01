import { ENV_SOURCE } from './environment';

/**
 * Each of our applications will share the same core environment variables.
 * We simply swap the values as needed, per application.
 */
export const APP_ENV = ENV_SOURCE.APP_ENV;
export const APP_NAME = ENV_SOURCE.APP_NAME;
export const APP_URL = ENV_SOURCE.APP_URL;
export const APP_URL_ADMIN = ENV_SOURCE.APP_URL_ADMIN;
export const APP_URL_CMS = ENV_SOURCE.APP_URL_CMS;
export const APP_URL_DEVELOPER = ENV_SOURCE.APP_URL_DEVELOPER;
export const APP_URL_EMAIL = ENV_SOURCE.APP_URL_EMAIL;
export const APP_URL_SERVER = ENV_SOURCE.APP_URL_SERVER;
export const APP_URL_WEBSITE = ENV_SOURCE.APP_URL_WEBSITE;
export const APP_VERSION = ENV_SOURCE.APP_VERSION;

// Random environment
export const ROLLBAR_TOKEN = ENV_SOURCE.ROLLBAR_TOKEN;
