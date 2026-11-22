import { APP_NAME } from '@openthrottle/react-router-utils';

/**
 * localStorage key for the composer's context-window meter opt-in, namespaced
 * per consuming app at runtime through `APP_NAME` (same scheme as the toolbar
 * and drafts atoms).
 * @public
 */
export const CHAT_CONTEXT_METER_STORAGE_KEY = `${APP_NAME}:chat:context-meter`;

/** The meter is opt-in: off until the user turns it on. */
export const DEFAULT_CHAT_CONTEXT_METER = false;
