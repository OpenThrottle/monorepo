/**
 * @description Unit tests for the stdio workspace capture: the env override beats the process cwd,
 * an explicit tool argument beats the captured value, an empty or null argument opts out, and a
 * process that never captured (the Nest/HTTP surface) reports nothing at all.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  captureCallerWorkspacePath,
  getCapturedWorkspacePath,
  resolveStdioWorkspacePath,
  resolveWorkspacePathArgument,
} from './workspace-path.ts';

const OVERRIDE = '/Users/matt/Development/openthrottle';

describe('resolveStdioWorkspacePath', () => {
  beforeEach(() => {
    delete process.env.OPENTHROTTLE_MCP_WORKSPACE_PATH;
  });

  afterEach(() => {
    delete process.env.OPENTHROTTLE_MCP_WORKSPACE_PATH;
  });

  it('prefers OPENTHROTTLE_MCP_WORKSPACE_PATH when it is set', () => {
    process.env.OPENTHROTTLE_MCP_WORKSPACE_PATH = OVERRIDE;

    expect(resolveStdioWorkspacePath()).toBe(OVERRIDE);
  });

  it('trims the override', () => {
    process.env.OPENTHROTTLE_MCP_WORKSPACE_PATH = `  ${OVERRIDE}  `;

    expect(resolveStdioWorkspacePath()).toBe(OVERRIDE);
  });

  it('falls back to the process cwd when the override is unset', () => {
    expect(resolveStdioWorkspacePath()).toBe(process.cwd());
  });

  it('falls back to the process cwd when the override is blank', () => {
    process.env.OPENTHROTTLE_MCP_WORKSPACE_PATH = '   ';

    expect(resolveStdioWorkspacePath()).toBe(process.cwd());
  });
});

describe('resolveWorkspacePathArgument', () => {
  afterEach(() => {
    captureCallerWorkspacePath(null);
  });

  it('reports nothing captured until the stdio transport captures', () => {
    expect(getCapturedWorkspacePath()).toBeNull();
  });

  it('sends the captured workspace when no argument is passed', () => {
    captureCallerWorkspacePath(OVERRIDE);

    expect(resolveWorkspacePathArgument(undefined)).toBe(OVERRIDE);
  });

  it('lets an explicit argument beat the captured workspace', () => {
    captureCallerWorkspacePath(OVERRIDE);

    expect(resolveWorkspacePathArgument('/somewhere/else')).toBe(
      '/somewhere/else',
    );
  });

  it('treats an empty-string argument as opting out, even when a workspace was captured', () => {
    captureCallerWorkspacePath(OVERRIDE);

    expect(resolveWorkspacePathArgument('')).toBeUndefined();
    expect(resolveWorkspacePathArgument('   ')).toBeUndefined();
  });

  it('treats an explicit null the same as opting out', () => {
    captureCallerWorkspacePath(OVERRIDE);

    expect(resolveWorkspacePathArgument(null)).toBeUndefined();
  });

  it('sends nothing on a surface that never captured (Nest/HTTP)', () => {
    expect(resolveWorkspacePathArgument(undefined)).toBeUndefined();
  });
});
