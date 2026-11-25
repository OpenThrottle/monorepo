/**
 * IPC channels between the connection screen (through the `openthrottleShell`
 * bridge in the preload) and main. Shared so the preload and main cannot drift.
 */
export const SHELL_IPC_CHANNELS = {
  getSettings: 'openthrottle-shell:get-settings',
  saveServer: 'openthrottle-shell:save-server',
  testServer: 'openthrottle-shell:test-server',
} as const;

export type ShellIpcChannelsKey = keyof typeof SHELL_IPC_CHANNELS;
export type ShellIpcChannelsValue =
  (typeof SHELL_IPC_CHANNELS)[ShellIpcChannelsKey];

/** Name of the global the preload exposes on the connection screen only. */
export const SHELL_BRIDGE_NAME = 'openthrottleShell';
