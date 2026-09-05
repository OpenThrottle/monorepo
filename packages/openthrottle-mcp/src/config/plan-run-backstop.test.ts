import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  forgetPlanRunForBackstop,
  rememberPlanRunForBackstop,
} from './plan-run-backstop.ts';
import { captureCallerWorkspacePath } from './workspace-path.ts';

const SESSION_ID = 'sess-abc-123';

describe('plan-run backstop note', () => {
  let repoRoot: string;
  let previousSessionId: string | undefined;

  beforeEach(() => {
    repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-backstop-'));
    previousSessionId = process.env.CLAUDE_CODE_SESSION_ID;
    process.env.CLAUDE_CODE_SESSION_ID = SESSION_ID;
    captureCallerWorkspacePath(repoRoot);
  });

  afterEach(() => {
    captureCallerWorkspacePath(null);
    if (previousSessionId === undefined) {
      delete process.env.CLAUDE_CODE_SESSION_ID;
    } else {
      process.env.CLAUDE_CODE_SESSION_ID = previousSessionId;
    }
    fs.rmSync(repoRoot, { force: true, recursive: true });
  });

  const notePath = (sessionId = SESSION_ID): string =>
    path.join(repoRoot, '.cache', 'plan-runs', `${sessionId}.json`);

  it('writes the note where the janitor looks, in the shape it reads', () => {
    // This file IS the contract between the MCP and the Stop-hook janitor — they share
    // no import, so a silent shape change here would silently disable the backstop.
    rememberPlanRunForBackstop('plan-1', 'run-1');

    const parsed: unknown = JSON.parse(fs.readFileSync(notePath(), 'utf8'));
    expect(parsed).toMatchObject({
      planId: 'plan-1',
      planRunId: 'run-1',
      sessionId: SESSION_ID,
    });
    expect(parsed).toHaveProperty('recordedAt');
  });

  it('forgets the note, so the janitor and the loop cannot both settle', () => {
    rememberPlanRunForBackstop('plan-1', 'run-1');
    forgetPlanRunForBackstop();

    expect(fs.existsSync(notePath())).toBe(false);
  });

  it('sanitizes a session id that would escape the state directory', () => {
    process.env.CLAUDE_CODE_SESSION_ID = '../../etc/passwd';

    rememberPlanRunForBackstop('plan-1', 'run-1');

    expect(fs.existsSync(notePath('..-..-etc-passwd'))).toBe(true);
  });

  it('writes nothing when there is no captured workspace (the HTTP surface)', () => {
    captureCallerWorkspacePath(null);

    rememberPlanRunForBackstop('plan-1', 'run-1');

    expect(fs.existsSync(path.join(repoRoot, '.cache'))).toBe(false);
  });

  it('writes nothing when no session id is available', () => {
    delete process.env.CLAUDE_CODE_SESSION_ID;

    rememberPlanRunForBackstop('plan-1', 'run-1');

    expect(fs.existsSync(path.join(repoRoot, '.cache'))).toBe(false);
  });
});
