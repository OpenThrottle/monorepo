/**
 * @description Tree data provider for the OpenThrottle Docs tab. Links to INTEGRATION.md and UI-DESIGN.md.
 */

import * as vscode from 'vscode';

export class DocsTreeDataProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  constructor(private readonly extensionUri: vscode.Uri) {}

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(_element?: vscode.TreeItem): vscode.TreeItem[] {
    if (_element != null) return [];

    const integration = new vscode.TreeItem(
      'INTEGRATION.md',
      vscode.TreeItemCollapsibleState.None,
    );

    integration.iconPath = new vscode.ThemeIcon('book');
    integration.tooltip = `How the extension talks to openthrottle-server (GraphQL).`;

    integration.command = {
      arguments: ['INTEGRATION.md'],
      command: 'openthrottle.openDoc',
      title: 'Open',
    };

    const uiDesign = new vscode.TreeItem(
      'UI-DESIGN.md',
      vscode.TreeItemCollapsibleState.None,
    );

    uiDesign.iconPath = new vscode.ThemeIcon('pencil');
    uiDesign.tooltip = `Extension UI design: sidebar, tree, detail view.`;

    uiDesign.command = {
      arguments: ['UI-DESIGN.md'],
      command: 'openthrottle.openDoc',
      title: 'Open',
    };

    return [integration, uiDesign];
  }
}
