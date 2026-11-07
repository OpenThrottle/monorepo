export interface IsShellSenderOptions {
  /** `event.senderFrame.url`; `undefined` when the frame is gone. */
  readonly frameUrl: string | undefined;
  /** Whether the frame is the top-level frame of its page. */
  readonly isMainFrame: boolean;
  /** `file:` URL of the connection screen main loaded. */
  readonly shellUrl: string;
}

/**
 * @description IPC sender validation for the shell bridge (Electron checklist
 * item 17): only the top frame of the connection screen itself may call
 * main. The developer origin, any other `file:` page, `data:` pages and
 * subframes are all rejected. Query and hash are ignored; the path is not.
 */
export const isShellSender = (options: IsShellSenderOptions): boolean => {
  const { frameUrl, isMainFrame, shellUrl } = options;

  if (!isMainFrame || frameUrl === undefined) {
    return false;
  }

  const frame = URL.parse(frameUrl);
  const shell = URL.parse(shellUrl);

  if (frame === null || shell === null) {
    return false;
  }

  return (
    frame.protocol === 'file:' &&
    shell.protocol === 'file:' &&
    frame.pathname === shell.pathname
  );
};
