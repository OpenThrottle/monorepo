/**
 * @description Tree data provider for the OpenThrottle Plans view. Groups plans by status and shows tasks under each plan.
 */

import * as vscode from 'vscode';
import {
  PlanResponseFragment,
  TaskByPlanResponseFragment,
} from 'src/__generated__/graphql.ts';
import type { OpenThrottleApiClient } from '../api-client.ts';
import { UnauthenticatedError } from '../errors.ts';

const STATUS_ORDER: readonly string[] = [
  'BLOCKED',
  'COMPLETED',
  'IN_PROGRESS',
  'PENDING',
  'SKIPPED',
];

const STATUS_LABELS: Readonly<Record<string, string>> = {
  BLOCKED: 'Blocked',
  COMPLETED: 'Completed',
  IN_PROGRESS: 'In progress',
  PENDING: 'Pending',
  SKIPPED: 'Skipped',
};

export class PlansTreeDataProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<void>();

  private loadError: string | undefined;
  private plans: PlanResponseFragment[] = [];
  private taskIdToPlanId = new Map<string, string>();
  private tasksByPlanId = new Map<string, TaskByPlanResponseFragment[]>();
  private unauthenticated = false;

  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private readonly client: OpenThrottleApiClient) {}

  /**
   * @description Look up a task by id (for detail webview). Returns undefined if not loaded.
   */
  getTask(taskId: string): TaskByPlanResponseFragment | undefined {
    const planId = this.taskIdToPlanId.get(taskId);

    if (planId == null) return undefined;

    const tasks = this.tasksByPlanId.get(planId);

    return tasks?.find((t) => t.id === taskId);
  }

  /**
   * @description Reload plans (and clear task cache) then refresh the tree.
   */
  async refresh(): Promise<void> {
    this.loadError = undefined;
    this.unauthenticated = false;
    this.tasksByPlanId.clear();
    this.taskIdToPlanId.clear();

    try {
      const result = await this.client.listPlansByStatus({
        limit: 500,
        sortBy: 'updated',
        sortOrder: 'desc',
        statuses: null,
      });

      this.plans = [...result.plans];
    } catch (error) {
      if (error instanceof UnauthenticatedError) {
        this.unauthenticated = true;
        this.plans = [];
      } else {
        const message = error instanceof Error ? error.message : String(error);
        this.loadError = message;
        this.plans = [];
      }
    }

    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
    if (this.unauthenticated && element == null) {
      const signIn = new vscode.TreeItem(
        'Sign in to view plans',
        vscode.TreeItemCollapsibleState.None,
      );

      signIn.iconPath = new vscode.ThemeIcon('sign-in');
      signIn.tooltip = `Sign in with your email and password to access plans and tasks.`;

      signIn.command = {
        arguments: [],
        command: 'openthrottle.login',
        title: 'Sign in',
      };

      return [signIn];
    }

    if (this.loadError != null) {
      if (element == null) {
        const item = new vscode.TreeItem(
          `Failed to load plans: ${this.loadError}`,
          vscode.TreeItemCollapsibleState.None,
        );

        item.contextValue = 'error';

        return [item];
      }

      return [];
    }

    if (element == null) {
      return this.getStatusGroupItems();
    }

    const id = element.id;
    if (id?.startsWith('status:')) {
      const status = id.slice(7);
      return this.getPlanItems(status);
    }

    const plan = this.plans.find((p) => p.id === id);
    if (plan != null) {
      return this.getTaskItems(plan.id);
    }

    return [];
  }

  private getStatusGroupItems(): vscode.TreeItem[] {
    const byStatus = new Map<string, PlanResponseFragment[]>();
    for (const plan of this.plans) {
      const s = plan.status;

      if (!byStatus.has(s)) byStatus.set(s, []);

      byStatus.get(s)!.push(plan);
    }

    const items: vscode.TreeItem[] = [];
    for (const status of STATUS_ORDER) {
      const list = byStatus.get(status) ?? [];

      if (list.length === 0) continue;

      const label = `${STATUS_LABELS[status] ?? status} (${list.length})`;
      const item = new vscode.TreeItem(
        label,
        vscode.TreeItemCollapsibleState.Expanded,
      );

      item.contextValue = 'status';
      item.iconPath = new vscode.ThemeIcon('folder');
      item.id = `status:${status}`;

      items.push(item);
    }

    if (items.length === 0) {
      const empty = new vscode.TreeItem(
        'No plans',
        vscode.TreeItemCollapsibleState.None,
      );

      empty.contextValue = 'empty';

      return [empty];
    }

    return items;
  }

  private getPlanItems(status: string): vscode.TreeItem[] {
    const list = this.plans.filter((p) => p.status === status);

    return list.map((plan) => {
      const item = new vscode.TreeItem(
        plan.title,
        vscode.TreeItemCollapsibleState.Collapsed,
      );

      item.contextValue = 'plan';
      item.description = plan.category;
      item.iconPath = new vscode.ThemeIcon('project');
      item.id = plan.id;
      item.tooltip = plan.description ?? plan.title;

      return item;
    });
  }

  private async getTaskItems(planId: string): Promise<vscode.TreeItem[]> {
    let tasks = this.tasksByPlanId.get(planId);

    if (tasks == null) {
      try {
        tasks = [...(await this.client.tasksByPlanId(planId))];
        this.tasksByPlanId.set(planId, tasks);
      } catch (error) {
        if (error instanceof UnauthenticatedError) {
          const signIn = new vscode.TreeItem(
            'Sign in to load tasks',
            vscode.TreeItemCollapsibleState.None,
          );

          signIn.iconPath = new vscode.ThemeIcon('sign-in');
          signIn.command = {
            arguments: [],
            command: 'openthrottle.login',
            title: 'Sign in',
          };

          return [signIn];
        }

        const errItem = new vscode.TreeItem(
          'Failed to load tasks',
          vscode.TreeItemCollapsibleState.None,
        );

        errItem.contextValue = 'error';

        return [errItem];
      }
    }

    return tasks.map((task) => {
      this.taskIdToPlanId.set(task.id, planId);

      const item = new vscode.TreeItem(
        task.title,
        vscode.TreeItemCollapsibleState.None,
      );

      item.contextValue = 'task';
      item.description = task.status;
      item.iconPath = new vscode.ThemeIcon('checklist');
      item.id = task.id;
      item.tooltip = task.description ?? task.title;

      return item;
    });
  }
}
