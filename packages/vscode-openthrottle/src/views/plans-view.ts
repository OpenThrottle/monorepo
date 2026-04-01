/**
 * @description Registers the Plans tree view and selection handler. Returns the tree provider for use by commands.
 */

import * as vscode from 'vscode';
import type { OpenThrottleApiClient } from '../api-client.js';
import { UnauthenticatedError } from '../errors.js';
import { showPlanDetail, showTaskDetail } from '../views/detail-webview.js';
import { PlansTreeDataProvider } from '../trees/plans-tree.js';

/**
 * @description Register the Plans tree view and wire selection to detail webview. Call once from {@link registerViews}.
 */
export function registerPlansView(
  context: vscode.ExtensionContext,
  client: OpenThrottleApiClient,
): PlansTreeDataProvider {
  const treeProvider = new PlansTreeDataProvider(client);
  const plansTreeView = vscode.window.createTreeView('openthrottle.plans', {
    treeDataProvider: treeProvider,
  });

  plansTreeView.onDidChangeSelection(async (e) => {
    const el = e.selection[0];

    if (el?.id == null) return;

    if (el.contextValue === 'plan') {
      try {
        const plan = await client.plan(el.id);
        if (plan == null) return;

        const tasks = await client.tasksByPlanId(el.id);

        showPlanDetail(context, plan, tasks);
      } catch (err) {
        if (err instanceof UnauthenticatedError) {
          await vscode.window
            .showInformationMessage('Sign in to view plan details.', 'Sign in')
            .then((choice) => {
              if (choice === 'Sign in') {
                void vscode.commands.executeCommand('openthrottle.login');
              }
            });
        }
        // Ignore other fetch errors
      }
    } else if (el.contextValue === 'task') {
      const task = treeProvider.getTask(el.id);

      if (task != null) showTaskDetail(context, task);
    }
  });

  context.subscriptions.push(plansTreeView);

  return treeProvider;
}
