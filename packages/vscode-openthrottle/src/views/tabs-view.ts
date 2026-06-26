/**
 * @description Registers the Welcome, Login, and Docs tab views (openthrottle.welcome, openthrottle.login, openthrottle.docs).
 */

import * as vscode from 'vscode';
import type { OpenThrottleApiClient } from '../api-client.ts';
import { DocsTreeDataProvider } from '../trees/docs-tree.ts';
import { LoginTreeDataProvider } from '../trees/login-tree.ts';
import { WelcomeTreeDataProvider } from '../trees/welcome-tree.ts';

/**
 * @description Register Welcome, Login, and Docs tree data providers. Call once from {@link registerViews}.
 */
export function registerTabsView(
  context: vscode.ExtensionContext,
  _client: OpenThrottleApiClient,
): void {
  const docsProvider = new DocsTreeDataProvider(context.extensionUri);
  const loginProvider = new LoginTreeDataProvider();
  const welcomeProvider = new WelcomeTreeDataProvider();

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider(
      'openthrottle.welcome',
      welcomeProvider,
    ),
    vscode.window.registerTreeDataProvider('openthrottle.login', loginProvider),
    vscode.window.registerTreeDataProvider('openthrottle.docs', docsProvider),
  );
}
