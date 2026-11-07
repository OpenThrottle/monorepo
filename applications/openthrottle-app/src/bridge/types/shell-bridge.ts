/** Component statuses `serverHealth` reports: ok | unconfigured | unreachable. */
export interface ServerHealth {
  readonly api: string;
  readonly database: string;
  readonly redis: string;
  readonly websocket: string;
}

export type TestServerResult =
  | { readonly health: ServerHealth; readonly ok: true; readonly url: string }
  | { readonly ok: false; readonly reason: string };

export type SaveServerResult =
  | { readonly ok: true; readonly url: string }
  | { readonly ok: false; readonly reason: string };

export interface ShellSettings {
  /** Why the connection screen is showing, e.g. the configured server was unreachable. */
  readonly notice: string | undefined;
  /** The URL to prefill: the configured server, else the local default. */
  readonly serverUrl: string;
}

/**
 * @description The only surface the connection screen has into main. Every
 * method is a validated IPC round trip; the page itself never touches the
 * network (its CSP is `connect-src 'none'`).
 */
export interface ShellBridge {
  readonly getSettings: () => Promise<ShellSettings>;
  readonly saveServer: (url: string) => Promise<SaveServerResult>;
  readonly testServer: (url: string) => Promise<TestServerResult>;
}
