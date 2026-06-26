/**
 * @description Read-only detail webview for a plan or task. Minimal HTML template; no user script (per UI-DESIGN.md).
 */

import * as vscode from 'vscode';
import {
  PlanResponseFragment,
  TaskByPlanResponseFragment,
} from '../__generated__/graphql.ts';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function planToHtml(
  plan: PlanResponseFragment,
  tasks: readonly TaskByPlanResponseFragment[] = [],
): string {
  const title = escapeHtml(plan.title);
  const status = escapeHtml(plan.status);
  const category = escapeHtml(plan.category);
  const author = escapeHtml(plan.author);
  const description = plan.description
    ? escapeHtml(plan.description)
    : '<em>No description</em>';

  const summary = plan.summary
    ? `<p><strong>Summary</strong><br/>${escapeHtml(plan.summary)}</p>`
    : '';

  const tasksSection =
    tasks.length > 0
      ? `<section><strong>Tasks</strong><ul>${tasks
          .map(
            (t) =>
              `<li>${escapeHtml(t.title)} <span class="meta">(${escapeHtml(t.status)})</span></li>`,
          )
          .join('')}</ul></section>`
      : '';
  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/><style>
  body { font-family: var(--vscode-font-family); font-size: var(--vscode-font-size); padding: 1em; color: var(--vscode-foreground); }
  h1 { margin-top: 0; }
  .meta { color: var(--vscode-descriptionForeground); font-size: 0.9em; margin: 0.5em 0; }
  p { margin: 0.5em 0; }
  section { margin-top: 1em; }
  ul { margin: 0.25em 0; padding-left: 1.5em; }
</style></head>
<body>
  <h1 style="margin-bottom: 1rem;">${title}</h1>
  <div class="meta">Status: ${status} · Category: ${category} · Author: ${author}</div>
  <p><strong>Description</strong><br/>${description}</p>
  ${summary}
  ${tasksSection}
</body>
</html>`;
}

function taskToHtml(task: TaskByPlanResponseFragment): string {
  const title = escapeHtml(task.title);
  const status = escapeHtml(task.status);
  const description = task.description
    ? escapeHtml(task.description)
    : '<em>No description</em>';

  const summary = task.summary
    ? `<p><strong>Summary</strong><br/>${escapeHtml(task.summary)}</p>`
    : '';

  const requirementsSection =
    task.requirementsJson?.trim() !== ''
      ? `<section><strong>Requirements</strong><pre>${escapeHtml(task.requirementsJson)}</pre></section>`
      : '';

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/><style>
  body { font-family: var(--vscode-font-family); font-size: var(--vscode-font-size); padding: 1em; color: var(--vscode-foreground); }
  h1 { margin-top: 0; }
  .meta { color: var(--vscode-descriptionForeground); font-size: 0.9em; margin: 0.5em 0; }
  p { margin: 0.5em 0; }
  section { margin-top: 1em; }
  pre { white-space: pre-wrap; font-size: 0.9em; margin: 0.25em 0; }
</style></head>
<body>
  <h1>${title}</h1>
  <div class="meta">Status: ${status}</div>
  <p><strong>Description</strong><br/>${description}</p>
  ${summary}
  ${requirementsSection}
</body>
</html>`;
}

let detailPanel: vscode.WebviewPanel | undefined;

/**
 * @description Show plan details in the detail webview. Creates or reuses the panel. Optionally pass tasks to show task list (title + status) per UI-DESIGN.md.
 */
export function showPlanDetail(
  context: vscode.ExtensionContext,
  plan: PlanResponseFragment,
  tasks: readonly TaskByPlanResponseFragment[] = [],
): void {
  if (detailPanel == null) {
    detailPanel = vscode.window.createWebviewPanel(
      'openthrottleDetail',
      'OpenThrottle - Plan',
      vscode.ViewColumn.Beside,
      { enableScripts: false },
    );
    detailPanel.onDidDispose(() => {
      detailPanel = undefined;
    });

    context.subscriptions.push(detailPanel);
  }

  detailPanel.title = plan.title;
  detailPanel.webview.html = planToHtml(plan, tasks);
  detailPanel.reveal();
}

/**
 * @description Show task details in the detail webview. Creates or reuses the panel.
 */
export function showTaskDetail(
  context: vscode.ExtensionContext,
  task: TaskByPlanResponseFragment,
): void {
  if (detailPanel == null) {
    detailPanel = vscode.window.createWebviewPanel(
      'openthrottleDetail',
      'OpenThrottle - Task',
      vscode.ViewColumn.Beside,
      { enableScripts: false },
    );

    detailPanel.onDidDispose(() => {
      detailPanel = undefined;
    });

    context.subscriptions.push(detailPanel);
  }

  detailPanel.title = task.title;
  detailPanel.webview.html = taskToHtml(task);
  detailPanel.reveal();
}
