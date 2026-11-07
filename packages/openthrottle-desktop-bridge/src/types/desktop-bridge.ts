/**
 * What the page asks main to show as a native notification.
 *
 * @public
 */
export interface DesktopNotifyInput {
  readonly body: string;
  /** App-relative path to open on click (e.g. `/plans/<uuid>`); `undefined` just focuses the window. */
  readonly link: string | undefined;
  readonly title: string;
}

/**
 * Outcome of a notify call. `shown: false` is not an error: main suppresses a
 * native notification while the window is focused (the in-app toast covers it).
 *
 * @public
 */
export type DesktopNotifyResult =
  | { readonly ok: false; readonly reason: string }
  | { readonly ok: true; readonly shown: boolean };

/**
 * Outcome of an openExternal call; only http and https URLs are opened.
 *
 * @public
 */
export type DesktopOpenExternalResult =
  { readonly ok: false; readonly reason: string } | { readonly ok: true };

/**
 * The typed `window.openthrottleDesktop` surface. Deliberately small; the
 * Developer app feature-detects it with `getDesktopBridge` and must behave
 * identically in a normal browser when it is absent.
 *
 * @public
 */
export interface OpenThrottleDesktopBridge {
  /** Raises a native notification (only when the window is not focused). */
  readonly notify: (input: DesktopNotifyInput) => Promise<DesktopNotifyResult>;
  /** Opens an http(s) URL in the system browser. */
  readonly openExternal: (url: string) => Promise<DesktopOpenExternalResult>;
  /** `process.platform` of the desktop shell (`darwin`, `win32`, `linux`). */
  readonly platform: string;
  /** Desktop app version, for an About entry and telemetry tags. */
  readonly version: string;
}

/**
 * What main answers the preload's synchronous handshake: whether the page that
 * is loading is the Developer app's current origin, and the values the bridge
 * exposes. The preload exposes nothing unless `allowed` is true.
 *
 * @public
 */
export type DesktopHandshake =
  | { readonly allowed: false }
  | {
      readonly allowed: true;
      readonly platform: string;
      readonly version: string;
    };
