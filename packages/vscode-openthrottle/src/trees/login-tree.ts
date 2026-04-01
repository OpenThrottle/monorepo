/**
 * @description Tree data provider for the Login tab. Shows a single "Sign in" item that runs the login command.
 */

import * as vscode from 'vscode';

export class LoginTreeDataProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(_element?: vscode.TreeItem): vscode.TreeItem[] {
    if (_element != null) return [];

    const signIn = new vscode.TreeItem(
      'Sign in to OpenThrottle',
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
}
