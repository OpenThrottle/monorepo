import { resolve } from 'node:path';

export interface DecideProtocolRegistrationOptions {
  readonly argv: readonly string[];
  /** `process.defaultApp`: running as `electron <app path>` rather than a packaged app. */
  readonly defaultApp: boolean;
  readonly execPath: string;
  readonly isMac: boolean;
  readonly isPackaged: boolean;
}

export type ProtocolRegistration =
  | {
      readonly kind: 'register';
      readonly args: readonly string[];
      readonly execPath: string | undefined;
    }
  | { readonly kind: 'skip' };

/**
 * @description How (and whether) to register the `openthrottle` scheme. A
 * packaged app registers itself (electron-builder also writes the macOS
 * `CFBundleURLTypes`). An unpackaged Windows/Linux dev run registers
 * `process.execPath` plus the app path argument, which is what Electron needs
 * to relaunch the right app. An unpackaged macOS run is skipped: it can only
 * register the bare Electron binary, hijacking the scheme system-wide.
 */
export const decideProtocolRegistration = (
  options: DecideProtocolRegistrationOptions,
): ProtocolRegistration => {
  const { argv, defaultApp, execPath, isMac, isPackaged } = options;

  if (isPackaged) {
    return { args: [], execPath: undefined, kind: 'register' };
  }

  const appPath = argv[1];

  if (!defaultApp || isMac || appPath === undefined) {
    return { kind: 'skip' };
  }

  return { args: [resolve(appPath)], execPath, kind: 'register' };
};
