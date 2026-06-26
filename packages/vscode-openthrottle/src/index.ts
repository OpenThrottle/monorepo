/**
 * @description OpenThrottle extension entry point. Wires config, views, and commands; uses openthrottle-server GraphQL for data.
 */

import * as vscode from 'vscode';
import { OpenThrottleApiClient } from './api-client.ts';
import { getStoredToken } from './auth.ts';
import { getApiBaseUrl } from './config.ts';
import { registerCommands } from './commands/index.ts';
import { registerViews } from './views/index.ts';

/**
 * @description Called when the extension is activated (e.g. when the user opens the OpenThrottle Plans view).
 */
export function activate(context: vscode.ExtensionContext): void {
  // console.log('🟢 🟢 🟢 Activating OpenThrottle extension 🟢 🟢 🟢');

  const baseUrl = getApiBaseUrl();
  const getToken = (): Promise<string | undefined> =>
    Promise.resolve(getStoredToken(context.secrets, baseUrl));
  const client = new OpenThrottleApiClient(baseUrl, getToken);
  const { treeProvider } = registerViews(context, client);

  registerCommands(context, client, treeProvider);

  void treeProvider.refresh();
}

export function deactivate(): void {
  // No cleanup required
}
