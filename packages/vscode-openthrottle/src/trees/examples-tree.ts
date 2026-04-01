/**
 * @description Tree data provider for the OpenThrottle Examples tab. Shows example plan/task titles for inspiration.
 */

import * as vscode from 'vscode';

const EXAMPLE_PLANS = [
  `Add OAuth2 for GitHub login`,
  `Iterate on vscode-openthrottle: tabs and examples`,
  `Document OpenThrottle commit-link workflow`,
];

const EXAMPLE_TASKS = [
  `Organize extension code: split activation into modules`,
  `Implement 2nd tab with simple content`,
  `Add one or two more tabs with simple examples`,
];

export class ExamplesTreeDataProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: vscode.TreeItem): vscode.TreeItem[] {
    if (element == null) {
      const planRoot = new vscode.TreeItem(
        'Example plan titles',
        vscode.TreeItemCollapsibleState.Expanded,
      );

      planRoot.iconPath = new vscode.ThemeIcon('project');
      planRoot.id = 'examples:plans';

      const taskRoot = new vscode.TreeItem(
        'Example task titles',
        vscode.TreeItemCollapsibleState.Expanded,
      );

      taskRoot.iconPath = new vscode.ThemeIcon('checklist');
      taskRoot.id = 'examples:tasks';

      return [planRoot, taskRoot];
    }

    if (element.id === 'examples:plans') {
      return EXAMPLE_PLANS.map((title) => {
        const item = new vscode.TreeItem(
          title,
          vscode.TreeItemCollapsibleState.None,
        );

        item.iconPath = new vscode.ThemeIcon('file');

        return item;
      });
    }

    if (element.id === 'examples:tasks') {
      return EXAMPLE_TASKS.map((title) => {
        const item = new vscode.TreeItem(
          title,
          vscode.TreeItemCollapsibleState.None,
        );

        item.iconPath = new vscode.ThemeIcon('check');

        return item;
      });
    }

    return [];
  }
}
