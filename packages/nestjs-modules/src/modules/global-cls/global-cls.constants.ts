/**
 * @description Sentinel seeded into `app.name` when the caller sent no usable `x-app-name`.
 * Exported so consumers that attribute work to a client can recognise "we do not know who
 * this was" rather than treating the sentinel as a real client name.
 * @public
 */
export const UNKNOWN_APP_NAME = 'x-app-name - unknown';
