/**
 * Unit tests for the Cursor adapter payload normalization + the seam contract
 * (normalized invocation + CURSOR_SOURCE → source-stamped event).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildUsageEvent } from '../../../index';
import { CURSOR_SOURCE, normalizeCursorPayload } from '../payload';

describe('normalizeCursorPayload', () => {
  it('maps a skill-tool-style payload', () => {
    const normalized = normalizeCursorPayload({
      args: 'with logo',
      conversationId: 'conv-1',
      skill: 'create-readme',
      workspaceRoots: ['/tmp/repo'],
    });
    expect(normalized).toEqual({
      args: 'with logo',
      cwd: '/tmp/repo',
      hook_event_name: 'cursor',
      invocation_path: 'skill_tool',
      session_id: 'conv-1',
      skill_name: 'create-readme',
    });
  });

  it('maps a slash-command-style payload', () => {
    const normalized = normalizeCursorPayload({
      command: 'nx-workspace',
      command_args: 'PONG',
      cwd: '/tmp/repo',
      session_id: 'sess-2',
    });
    expect(normalized?.skill_name).toBe('nx-workspace');
    expect(normalized?.args).toBe('PONG');
    expect(normalized?.invocation_path).toBe('slash');
    expect(normalized?.session_id).toBe('sess-2');
  });

  it('returns null when there is no skill/command name', () => {
    expect(normalizeCursorPayload({ cwd: '/tmp' })).toBeNull();
    expect(normalizeCursorPayload(null)).toBeNull();
  });
});

describe('adapter seam → cursor-sourced event', () => {
  let tmpRoot: string;

  beforeAll(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-adapter-'));
    fs.mkdirSync(path.join(tmpRoot, 'skills', 'ot-plans'), { recursive: true });
  });

  afterAll(() => {
    fs.rmSync(tmpRoot, { force: true, recursive: true });
  });

  it('builds a cursor sourced event from a Cursor payload', () => {
    const normalized = normalizeCursorPayload({
      args: 'ping',
      conversationId: 'conv-9',
      cwd: tmpRoot,
      skill: 'ot-plans',
    });
    const event = buildUsageEvent({
      gitBranch: 'example-usage-tracking',
      normalized,
      repoRoot: tmpRoot,
      source: CURSOR_SOURCE,
      timestamp: '2026-08-01T00:00:00.000Z',
    });

    expect(event).not.toBeNull();
    if (!event) {
      return;
    }
    expect(event.source).toBe('cursor');
    expect(event.skill_name).toBe('ot-plans');
    expect(event.scope).toBe('ours');
  });
});
