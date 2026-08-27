import { mkdtempSync, mkdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, test } from 'vitest';
import {
  CUSTOM_PROMPT_WRITE_REFUSAL,
  resolveCustomPromptWritePath,
} from './custom-prompt-write-path';

describe('resolveCustomPromptWritePath', () => {
  let workspaceRoot: string;
  let outside: string;

  beforeAll(() => {
    const base = mkdtempSync(join(tmpdir(), 'custom-prompt-write-path-'));
    workspaceRoot = join(base, 'workspace');
    outside = join(base, 'outside');

    mkdirSync(join(workspaceRoot, '.agents', 'skills', 'create-cli'), {
      recursive: true,
    });
    mkdirSync(outside, { recursive: true });

    writeFileSync(
      join(workspaceRoot, '.agents', 'skills', 'create-cli', 'SKILL.md'),
      '---\nname: create-cli\n---\n',
    );
    writeFileSync(join(outside, 'stolen.md'), 'original\n');

    // A directory symlink pointing out of the workspace: `path.resolve` alone
    // reports it as contained, only the realpath check catches it.
    symlinkSync(outside, join(workspaceRoot, 'escape-hatch'));
  });

  test('accepts an ordinary workspace-relative path', () => {
    const result = resolveCustomPromptWritePath(
      workspaceRoot,
      '.cursor/rules/agents.mdc',
    );

    expect(result.ok).toBe(true);
    expect(result.ok && result.absolutePath).toContain(
      join('.cursor', 'rules', 'agents.mdc'),
    );
  });

  test('refuses an empty path', () => {
    expect(resolveCustomPromptWritePath(workspaceRoot, '   ')).toEqual({
      ok: false,
      reason: CUSTOM_PROMPT_WRITE_REFUSAL.emptyPath,
    });
  });

  test('refuses an absolute path', () => {
    expect(
      resolveCustomPromptWritePath(workspaceRoot, '/etc/authorized_keys'),
    ).toEqual({
      ok: false,
      reason: CUSTOM_PROMPT_WRITE_REFUSAL.absolutePath,
    });
  });

  test('refuses a traversal escape', () => {
    expect(
      resolveCustomPromptWritePath(workspaceRoot, '../outside/stolen.md'),
    ).toEqual({
      ok: false,
      reason: CUSTOM_PROMPT_WRITE_REFUSAL.parentSegment,
    });
  });

  test('refuses a path that escapes through a symlinked directory', () => {
    expect(
      resolveCustomPromptWritePath(workspaceRoot, 'escape-hatch/stolen.md'),
    ).toEqual({
      ok: false,
      reason: CUSTOM_PROMPT_WRITE_REFUSAL.escapesWorkspace,
    });
  });

  test('refuses skill content, external or authored', () => {
    expect(
      resolveCustomPromptWritePath(
        workspaceRoot,
        '.agents/skills/create-cli/SKILL.md',
      ),
    ).toEqual({
      ok: false,
      reason: CUSTOM_PROMPT_WRITE_REFUSAL.skillContent,
    });

    expect(
      resolveCustomPromptWritePath(
        workspaceRoot,
        'skills/agents-ralph/SKILL.md',
      ),
    ).toEqual({
      ok: false,
      reason: CUSTOM_PROMPT_WRITE_REFUSAL.skillContent,
    });
  });

  test('refuses an unresolvable workspace root', () => {
    expect(
      resolveCustomPromptWritePath(join(outside, 'nope'), 'prompt.md'),
    ).toEqual({
      ok: false,
      reason: CUSTOM_PROMPT_WRITE_REFUSAL.unresolvableRoot,
    });
  });
});
