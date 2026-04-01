/**
 * @description Logout command: delete stored token and refresh plans so tree shows unauthenticated state.
 */

import * as vscode from 'vscode';
import { deleteStoredToken } from '../auth.js';
import { getApiBaseUrl } from '../config.js';
import type { PlansTreeDataProvider } from '../trees/plans-tree.js';

/**
 * @description Run sign out: clear token from SecretStorage and refresh the plans tree.
 */
export async function runLogout(
  context: vscode.ExtensionContext,
  treeProvider: PlansTreeDataProvider,
): Promise<void> {
  const baseUrl = getApiBaseUrl();
  await deleteStoredToken(context.secrets, baseUrl);
  void vscode.window.showInformationMessage('Signed out from OpenThrottle.');
  void treeProvider.refresh();
}
