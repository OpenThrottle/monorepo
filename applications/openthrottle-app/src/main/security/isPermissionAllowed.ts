export interface PermissionQuery {
  readonly allowedOrigins: readonly string[];
  /** Media kinds being requested; empty or `unknown` when Chromium cannot say. */
  readonly mediaTypes: readonly string[];
  readonly permission: string;
  readonly requestingOrigin: string;
}

/**
 * @description Deny-by-default permission policy shared by the session's
 * request and check handlers. The single grant is `media` for an audio-only
 * request from the app's own origin (voice input, which streams microphone
 * audio to a local WhisperLive instance). Camera, screen capture, notifications
 * (native ones go through the preload bridge), geolocation, clipboard-read and
 * everything else are denied.
 */
export const isPermissionAllowed = (query: PermissionQuery): boolean => {
  const { allowedOrigins, mediaTypes, permission, requestingOrigin } = query;

  if (permission !== 'media') {
    return false;
  }

  if (!allowedOrigins.includes(requestingOrigin)) {
    return false;
  }

  return mediaTypes.length > 0 && mediaTypes.every((type) => type === 'audio');
};
