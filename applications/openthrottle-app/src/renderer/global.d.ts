import type { ShellBridge } from '../bridge/types/shell-bridge.ts';

declare global {
  interface Window {
    /** Exposed by the preload on the connection screen only. */
    readonly openthrottleShell: ShellBridge | undefined;
  }
}
