import type { WorkflowRalphAccountError } from '../contract/ralph-orchestrator-deps.ts';

/** The `apiKeySource` Claude Code reports when it billed a key from its environment. */
const ENV_API_KEY_SOURCE = 'ANTHROPIC_API_KEY';

/** The `apiKeySource` Claude Code reports when no key was involved (its own login). */
const NO_API_KEY_SOURCE = 'none';

/** What fixes each error class when the CLI billed `ANTHROPIC_API_KEY` from the server env. */
const ENV_KEY_FIXES: Readonly<Record<string, string>> = {
  authentication_error: `replace that key with a valid one`,
  billing_error: `top up that API organization's credit`,
  permission_error: `give that key's organization access to the requested model`,
};

/** What fixes each error class when the CLI used its own login. */
const LOGIN_FIXES: Readonly<Record<string, string>> = {
  authentication_error: `log the agent CLI in again on the server host (\`claude /login\`)`,
  billing_error: `add credit to, or upgrade, the account the agent CLI is logged into`,
  permission_error: `log the agent CLI into an account with access to the requested model`,
};

const GENERIC_FIX = `fix the agent CLI's account`;

const describeCredential = (apiKeySource: string | null): string => {
  if (apiKeySource === ENV_API_KEY_SOURCE) {
    return `The agent CLI authenticated with ANTHROPIC_API_KEY from the server's environment.`;
  }

  if (apiKeySource === NO_API_KEY_SOURCE) {
    return `The agent CLI authenticated with its own login.`;
  }

  if (apiKeySource === null) {
    return `The agent CLI did not report which credential it used.`;
  }

  return `The agent CLI authenticated with ${apiKeySource}.`;
};

const describeFix = (error: WorkflowRalphAccountError): string => {
  if (error.apiKeySource === ENV_API_KEY_SOURCE) {
    const fix = ENV_KEY_FIXES[error.kind] ?? GENERIC_FIX;

    return `${fix}, or unset ANTHROPIC_API_KEY and restart the server so the CLI uses its own login`;
  }

  return LOGIN_FIXES[error.kind] ?? GENERIC_FIX;
};

/**
 * @description One operator-readable line for a fatal account error: the error class and the CLI's
 * text, which credential the CLI used (from its `apiKeySource`), and what fixes it. Written to plan
 * output when the orchestrator stops a run on one, and persisted as the run's settled reason.
 * @public
 */
export const describeWorkflowAccountError = (
  error: WorkflowRalphAccountError,
): string => {
  const text = error.message === null ? '' : `: ${error.message}`;

  return `Agent account error (${error.kind})${text}. ${describeCredential(error.apiKeySource)} Fix: ${describeFix(error)}; then re-run the plan.`;
};
