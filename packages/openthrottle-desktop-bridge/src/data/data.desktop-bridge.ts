/**
 * Name of the global the Electron preload exposes on the Developer app origin.
 *
 * @public
 */
export const DESKTOP_BRIDGE_NAME = 'openthrottleDesktop';

/**
 * Custom URL scheme the desktop app registers (without the `:`).
 *
 * @public
 */
export const DESKTOP_DEEP_LINK_PROTOCOL = 'openthrottle';

/**
 * IPC channels between the preload bridge and the Electron main process. One
 * object so the preload and main cannot drift.
 *
 * @public
 */
export const DESKTOP_IPC_CHANNELS = {
  handshake: 'openthrottle-desktop:handshake',
  notify: 'openthrottle-desktop:notify',
  openExternal: 'openthrottle-desktop:open-external',
} as const;

/** Longest notification title or body main will accept from a page. */
export const DESKTOP_NOTIFY_MAX_LENGTH = 512;

/** Matches a canonical UUID (any version), the shape of every plan id. */
export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
