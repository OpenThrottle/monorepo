/**
 * @description OpenThrottle extension configuration (workspace settings). Used by commands and activation.
 */

import * as vscode from 'vscode';

const CONFIG_SECTION = 'openthrottle';
const CONFIG_API_BASE_URL = 'apiBaseUrl';
const CONFIG_DEFAULT_AUTHOR = 'defaultAuthor';

const DEFAULT_API_BASE_URL = 'http://localhost:6021';
const DEFAULT_AUTHOR = 'OpenThrottle';

export const DEFAULT_CATEGORY = 'general';

/**
 * @description Base URL for openthrottle-server (GraphQL at /graphql).
 */
export function getApiBaseUrl(): string {
  const config = vscode.workspace.getConfiguration(CONFIG_SECTION);

  return config.get<string>(CONFIG_API_BASE_URL) ?? DEFAULT_API_BASE_URL;
}

/**
 * @description Default GitHub username (author) when creating a plan from text.
 */
export function getDefaultAuthor(): string {
  const config = vscode.workspace.getConfiguration(CONFIG_SECTION);

  return config.get<string>(CONFIG_DEFAULT_AUTHOR) ?? DEFAULT_AUTHOR;
}
