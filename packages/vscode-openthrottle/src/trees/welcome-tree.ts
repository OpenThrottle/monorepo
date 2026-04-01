/**
 * @description Tree data provider for the OpenThrottle Welcome / Quick actions tab. Shows welcome, sign in, docs, refresh, and create plan.
 */

import * as vscode from 'vscode';

export class WelcomeTreeDataProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(_element?: vscode.TreeItem): vscode.TreeItem[] {
    if (_element != null) return [];

    const welcome = new vscode.TreeItem(
      'Plans and tasks from OpenThrottle',
      vscode.TreeItemCollapsibleState.None,
    );

    welcome.iconPath = new vscode.ThemeIcon('info');
    welcome.tooltip = 'View and manage plans in the Plans tab.';

    const signIn = new vscode.TreeItem(
      'Sign in',
      vscode.TreeItemCollapsibleState.None,
    );

    signIn.iconPath = new vscode.ThemeIcon('sign-in');
    signIn.tooltip = `Sign in with email and password to access plans and tasks.`;

    signIn.command = {
      arguments: [],
      command: 'openthrottle.login',
      title: 'Sign in',
    };

    const openDocs = new vscode.TreeItem(
      'Open INTEGRATION.md',
      vscode.TreeItemCollapsibleState.None,
    );

    openDocs.iconPath = new vscode.ThemeIcon('book');
    openDocs.command = {
      arguments: [],
      command: 'openthrottle.openIntegrationDoc',
      title: 'Open INTEGRATION.md',
    };

    const refresh = new vscode.TreeItem(
      'Refresh plans',
      vscode.TreeItemCollapsibleState.None,
    );

    refresh.iconPath = new vscode.ThemeIcon('refresh');
    refresh.command = {
      arguments: [],
      command: 'openthrottle.refresh',
      title: 'Refresh',
    };

    const createPlan = new vscode.TreeItem(
      'Create plan from text',
      vscode.TreeItemCollapsibleState.None,
    );

    createPlan.iconPath = new vscode.ThemeIcon('add');
    createPlan.tooltip = `Create a new OpenThrottle plan from selected or prompt text.`;

    createPlan.command = {
      arguments: [],
      command: 'openthrottle.createPlanFromText',
      title: 'Create plan from text',
    };

    return [welcome, signIn, openDocs, refresh, createPlan];
  }
}
