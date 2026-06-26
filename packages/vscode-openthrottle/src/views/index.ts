/**
 * @description View registration: Plans tree and additional tabs (Welcome, Login, Docs). Composes {@link registerPlansView} and {@link registerTabsView}.
 */

import * as vscode from 'vscode';
import type { OpenThrottleApiClient } from '../api-client.ts';
import type { PlansTreeDataProvider } from '../trees/plans-tree.ts';
import { registerPlansView } from './plans-view.ts';
import { registerTabsView } from './tabs-view.ts';

interface RegisteredViews {
  readonly treeProvider: PlansTreeDataProvider;
}

/**
 * @description Register Plans, Welcome, Login, and Docs views. Call once from activate.
 */
export function registerViews(
  context: vscode.ExtensionContext,
  client: OpenThrottleApiClient,
): RegisteredViews {
  const treeProvider = registerPlansView(context, client);

  registerTabsView(context, client);

  return { treeProvider };
}
