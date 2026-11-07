/** File inside `app.getPath('userData')` holding the persisted settings. */
export const SETTINGS_FILE_NAME = 'settings.json';

/** Current `settings.json` schema version. */
export const SETTINGS_VERSION = 1;

/** How long a connection probe may take before it counts as unreachable. */
export const PROBE_TIMEOUT_MS = 8000;

/** The unauthenticated query the connection screen and start flow probe with. */
export const SERVER_HEALTH_QUERY = `{ serverHealth { api database redis websocket } }`;
