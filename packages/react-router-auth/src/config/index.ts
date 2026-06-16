export const AUTH_COOKIE_MAX_AGE_DAYS = 7;

const IS_BROWSER = typeof window !== 'undefined';
const APP_NAME = IS_BROWSER
  ? (window as unknown as { env: { APP_NAME: string } }).env.APP_NAME
  : process.env.APP_NAME;

// NOTE: We know this is setup but we don't need to import another package the env
export const AUTH_COOKIE_NAME = `${APP_NAME}_auth_token`;
