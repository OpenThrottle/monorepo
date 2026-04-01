/**
 * @description Create-plan-from-text command: input box → optional category pick → createPlan mutation → refresh tree.
 */

import * as vscode from 'vscode';
import type { OpenThrottleApiClient } from '../api-client.js';
import { DEFAULT_CATEGORY, getDefaultAuthor } from '../config.js';
import { UnauthenticatedError } from '../errors.js';
import type { PlansTreeDataProvider } from '../trees/plans-tree.js';

/**
 * @description Run the create-plan-from-text flow. Call from {@link registerCommands}.
 */
export async function runCreatePlanFromText(
  client: OpenThrottleApiClient,
  treeProvider: PlansTreeDataProvider,
): Promise<void> {
  const raw = await vscode.window.showInputBox({
    placeHolder: 'e.g. Add OAuth2 for GitHub login',
    prompt: 'Describe your plan (used as title; optional description below)',
    title: 'OpenThrottle: Create plan from text',
    validateInput(value: string): string | undefined {
      const trimmed = value.trim();
      if (trimmed.length === 0) {
        return 'Enter a plan title or short description.';
      }

      return undefined;
    },
  });

  if (raw == null || raw.trim().length === 0) return;

  const title = raw.trim();
  const author = getDefaultAuthor();

  let category: string;
  try {
    const categories = await client.listDistinctCategories();

    if (categories.length > 0) {
      const picked = await vscode.window.showQuickPick(
        [...categories, DEFAULT_CATEGORY].filter(
          (c, i, a) => a.indexOf(c) === i,
        ),
        {
          canPickMany: false,
          placeHolder: 'Category (optional)',
          title: 'OpenThrottle: Plan category',
        },
      );
      category = picked ?? DEFAULT_CATEGORY;
    } else {
      category = DEFAULT_CATEGORY;
    }
  } catch (err) {
    if (err instanceof UnauthenticatedError) {
      const choice = await vscode.window.showInformationMessage(
        'Sign in to create plans.',
        'Sign in',
      );

      if (choice === 'Sign in') {
        void vscode.commands.executeCommand('openthrottle.login');
      }

      return;
    }

    category = DEFAULT_CATEGORY;
  }

  try {
    const plan = await client.createPlan({
      author,
      category,
      description: null,
      status: 'pending',
      title,
    });

    void treeProvider.refresh();

    await vscode.window.showInformationMessage(
      `Plan created: ${plan.title} (${plan.id})`,
    );
  } catch (err) {
    if (err instanceof UnauthenticatedError) {
      const choice = await vscode.window.showInformationMessage(
        'Sign in to create plans.',
        'Sign in',
      );

      if (choice === 'Sign in') {
        void vscode.commands.executeCommand('openthrottle.login');
      }

      return;
    }

    const message = err instanceof Error ? err.message : String(err);

    await vscode.window.showErrorMessage(
      `OpenThrottle: Failed to create plan. ${message}`,
    );
  }
}
