import { getEnvironment } from '@openthrottle/react-router-utils';

const { API_URL_EXTERNAL } = getEnvironment();

export const SITE_DOMAIN = `openthrottle.ai`;
export const SITE_DEVELOPER_PORTAL_URL = `https://developer.openthrottle.ai`;
export const SITE_NAME = 'OpenThrottle';
export const SITE_SUBDOMAIN = 'Developer';
// export const SITE_TITLE = `${SITE_NAME} | ${SITE_SUBDOMAIN}`;
export const SITE_TITLE = SITE_NAME;
export const SITE_URL_QUEUES = `${API_URL_EXTERNAL}/queues`;
