/**
 * @description Registers OpenThrottle commands: create-plan-from-text, refresh, open-doc, login, logout. Wires config and client.
 */

import * as vscode from 'vscode';
import type { OpenThrottleApiClient } from '../api-client.js';
import type { PlansTreeDataProvider } from '../trees/plans-tree.js';
import { runCreatePlanFromText } from './create-plan-from-text.js';
import { runLogin } from './login.js';
import { runLogout } from './logout.js';

/**
 * @description Register all OpenThrottle commands. Call once from activate after views are registered.
 */
export function registerCommands(
  context: vscode.ExtensionContext,
  client: OpenThrottleApiClient,
  treeProvider: PlansTreeDataProvider,
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('openthrottle.createPlanFromText', () => {
      void runCreatePlanFromText(client, treeProvider);
    }),

    vscode.commands.registerCommand('openthrottle.refresh', () => {
      void treeProvider.refresh();
    }),

    vscode.commands.registerCommand('openthrottle.login', () => {
      void runLogin(context, treeProvider);
    }),

    vscode.commands.registerCommand('openthrottle.logout', () => {
      void runLogout(context, treeProvider);
    }),

    vscode.commands.registerCommand(
      'openthrottle.openIntegrationDoc',
      async () => {
        const uri = vscode.Uri.joinPath(
          context.extensionUri,
          'docs',
          'INTEGRATION.md',
        );
        const doc = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(doc, { preview: false });
      },
    ),

    vscode.commands.registerCommand(
      'OpenThrottle.openDoc',
      async (filename: string) => {
        const uri = vscode.Uri.joinPath(context.extensionUri, 'docs', filename);
        const doc = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(doc, { preview: false });
      },
    ),
  );
}
