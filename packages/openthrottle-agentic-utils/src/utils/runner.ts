import { WorkflowConfig } from '@openthrottle/openthrottle-agentic-workflow';

export const escapeShellArg = (value: string): string => {
  if (/^[A-Za-z0-9._/-]+$/.test(value)) {
    return value;
  }

  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
};

/**
 * Escapes a string for safe use inside a double-quoted shell argument.
 * Prevents plan/task text containing " or \ from breaking the shell command.
 */
export function escapeShellDoubleQuoted(prompt: string): string {
  return prompt.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * Construct the command for the workflow runner
 */
export const buildWorkflowRunnerCommand = (config: WorkflowConfig): string => {
  const model = config.model !== 'auto' ? ` --model ${config.model}` : '';
  const prompt = escapeShellDoubleQuoted(config.prompt);

  let command = '';

  switch (config.runner) {
    case 'cursor':
      command = `cursor-agent --force -p "${prompt}"${model}`;
      break;

    case 'claude':
      command = `claude --bare --permission-mode acceptEdits -p "${prompt}"${model}`;
      break;

    case 'opencode':
      command = `opencode --bare --permission-mode acceptEdits -p "${prompt}"${model}`;
      break;

    default: {
      throw new Error(`Unknown runner: ${config.runner}`);
    }
  }

  return appendWorktreeFlags(command, config);
};

/**
 * Appends shell flags to a cursor-agent or claude command string.
 */
export const appendWorktreeFlags = (
  command: string,
  config: WorkflowConfig,
): string => {
  if (config?.worktree === undefined) {
    return command;
  }

  const parts: string[] = [];
  const name = config.worktree;

  if (name === '') {
    parts.push('-w');
  } else {
    parts.push('-w', escapeShellArg(name));
  }

  if (config.runner === 'cursor') {
    const base = config.worktreeBase?.trim();
    if (base !== undefined && base !== '') {
      parts.push('--worktree-base', escapeShellArg(base));
    }

    if (config.worktreeSkipSetup === true) {
      parts.push('--skip-worktree-setup');
    }
  }

  return `${command} ${parts.join(' ')}`;
};
