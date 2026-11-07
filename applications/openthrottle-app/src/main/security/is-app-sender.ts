import { isAllowedNavigation } from './is-allowed-navigation.ts';

export interface IsAppSenderOptions {
  /** The one origin the window may load in-app right now; `undefined` before the server is up. */
  readonly appOrigin: string | undefined;
  /** `event.senderFrame.url`; `undefined` when the frame is gone. */
  readonly frameUrl: string | undefined;
  /** Whether the frame is the top-level frame of its page. */
  readonly isMainFrame: boolean;
}

/**
 * @description IPC sender validation for the desktop bridge (Electron
 * checklist item 17), the counterpart of `isShellSender`: only the top frame
 * of the Developer app's CURRENT origin may call main. The origin is read live
 * by the caller, so it follows a server change or a child restart. Subframes,
 * the connection screen, other origins and a missing origin are all rejected.
 */
export const isAppSender = (options: IsAppSenderOptions): boolean => {
  const { appOrigin, frameUrl, isMainFrame } = options;

  if (!isMainFrame || frameUrl === undefined || appOrigin === undefined) {
    return false;
  }

  return isAllowedNavigation(frameUrl, [appOrigin]);
};
