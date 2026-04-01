/**
 * @description Login command: prompt for email/password, call login mutation, store token in SecretStorage, refresh plans.
 */

import { print } from 'graphql';
import * as vscode from 'vscode';
import { storeToken } from '../auth.js';
import { getApiBaseUrl } from '../config.js';
import type { PlansTreeDataProvider } from '../trees/plans-tree.js';
import { LoginDocument } from '../__generated__/graphql.js';

interface GraphqlResponse<T> {
  readonly data?: T;
  readonly errors?: ReadonlyArray<{ readonly message: string }>;
}

/**
 * @description Execute login mutation at baseUrl/graphql (no auth header). Returns accessToken or throws.
 */
async function executeLogin(
  baseUrl: string,
  email: string,
  password: string,
): Promise<string> {
  const url = `${baseUrl.replace(/\/$/, '')}/graphql`;
  const body = JSON.stringify({
    query: print(LoginDocument),
    variables: { input: { email, password } },
  });

  const res = await fetch(url, {
    body,
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });

  // FIXME: Swap out eventually
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const json = (await res.json()) as GraphqlResponse<{
    login: { accessToken: string };
  }>;

  if (!res.ok) {
    const message = json.errors?.[0]?.message ?? res.statusText;
    throw new Error(`Login failed: ${message}`);
  }

  if (json.errors != null && json.errors.length > 0) {
    throw new Error(json.errors[0]?.message ?? 'Login failed');
  }

  const token = json.data?.login?.accessToken;
  if (!token) {
    throw new Error('Login response missing access token');
  }

  return token;
}

/**
 * @description Run the login flow: input boxes for email and password, login mutation, store token, refresh tree.
 */
export async function runLogin(
  context: vscode.ExtensionContext,
  treeProvider: PlansTreeDataProvider,
): Promise<void> {
  const baseUrl = getApiBaseUrl();

  const email = await vscode.window.showInputBox({
    ignoreFocusOut: true,
    placeHolder: 'you@example.com',
    prompt: 'OpenThrottle sign in',
    title: 'Email',
    validateInput: (value) => {
      if (!value?.trim()) return 'Email is required';
      return null;
    },
  });

  if (email == null || email.trim() === '') return;

  const password = await vscode.window.showInputBox({
    ignoreFocusOut: true,
    password: true,
    placeHolder: 'Password',
    prompt: 'OpenThrottle sign in',
    title: 'Password',
    validateInput: (value) => {
      if (!value) return 'Password is required';
      return null;
    },
  });

  if (password == null || password === '') return;

  try {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Signing in to OpenThrottle…',
      },
      async () => {
        const token = await executeLogin(baseUrl, email.trim(), password);
        await storeToken(context.secrets, baseUrl, token);
      },
    );
    void vscode.window.showInformationMessage('Signed in to OpenThrottle.');
    void treeProvider.refresh();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    void vscode.window.showErrorMessage(
      `OpenThrottle sign in failed: ${message}`,
    );
  }
}
