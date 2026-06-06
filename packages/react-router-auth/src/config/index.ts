export const AUTH_COOKIE_MAX_AGE_DAYS = 7;

// NOTE: We know this is setup but we don't need to import another package the env
export const AUTH_COOKIE_NAME = `${process.env.APP_NAME}_auth_token`;
