/**
 * @description Tests for the finding-#1 mitigations: the Shell-safety prompt guardrail and the
 * `/bin/sh` command-misparse output sanitizer (plan 65a8dd25).
 */

import { describe, expect, it } from 'vitest';
import {
  RALPH_SHELL_COMMAND_GUARDRAIL,
  sanitizeRalphShellNoise,
} from '../ralph-shell-misparse';

const TASK_UUID = '0c8e76bd-a82c-4f49-b5f8-a9a65c047430';

describe('RALPH_SHELL_COMMAND_GUARDRAIL', () => {
  it('forbids multiline prose in the Shell tool', () => {
    expect(RALPH_SHELL_COMMAND_GUARDRAIL).toContain(
      'Do NOT paste multiline prose into the Shell tool',
    );
  });

  it('tells the agent to keep Ralph signals as plain text', () => {
    expect(RALPH_SHELL_COMMAND_GUARDRAIL).toContain('<ralph:task-complete>');
    expect(RALPH_SHELL_COMMAND_GUARDRAIL).toContain('plain assistant text');
  });
});

describe('sanitizeRalphShellNoise', () => {
  it('returns empty result unchanged', () => {
    expect(sanitizeRalphShellNoise('')).toEqual({
      collapsedBlockCount: 0,
      sanitized: '',
      suppressedLineCount: 0,
    });
  });

  it('leaves output without /bin/sh errors untouched', () => {
    const result = ['## Summary', 'Implemented the feature.'].join('\n');
    const out = sanitizeRalphShellNoise(result);

    expect(out.sanitized).toBe(result);
    expect(out.collapsedBlockCount).toBe(0);
    expect(out.suppressedLineCount).toBe(0);
  });

  it('collapses a run of /bin/sh command-not-found lines into one summary', () => {
    const result = [
      `<ralph:task-complete>${TASK_UUID}</ralph:task-complete>`,
      '/bin/sh: line 1: Implemented: command not found',
      '/bin/sh: line 2: Key: command not found',
      '/bin/sh: line 3: files: command not found',
    ].join('\n');
    const out = sanitizeRalphShellNoise(result);

    expect(out.collapsedBlockCount).toBe(1);
    expect(out.suppressedLineCount).toBe(3);
    expect(out.sanitized).toContain(
      `<ralph:task-complete>${TASK_UUID}</ralph:task-complete>`,
    );
    expect(out.sanitized).toContain('suppressed 3 /bin/sh command-misparse');
    expect(out.sanitized).not.toContain('command not found');
  });

  it('collapses /bin/sh syntax-error lines', () => {
    const result = [
      'before',
      "/bin/sh: -c: line 5: syntax error near unexpected token `('",
      'after',
    ].join('\n');
    const out = sanitizeRalphShellNoise(result);

    expect(out.collapsedBlockCount).toBe(1);
    expect(out.suppressedLineCount).toBe(1);
    expect(out.sanitized).toBe(
      [
        'before',
        '[workflow-ralph] suppressed 1 /bin/sh command-misparse line(s) (cursor-agent Shell tool passed multiline prose to the shell; see plan 65a8dd25 finding #1)',
        'after',
      ].join('\n'),
    );
  });

  it('collapses multiple separate runs independently', () => {
    const result = [
      '/bin/sh: line 1: a: command not found',
      '/bin/sh: line 2: b: command not found',
      'normal output',
      '/bin/sh: line 1: c: command not found',
    ].join('\n');
    const out = sanitizeRalphShellNoise(result);

    expect(out.collapsedBlockCount).toBe(2);
    expect(out.suppressedLineCount).toBe(3);
    expect(out.sanitized).toContain('normal output');
  });

  it('matches /bin/bash misparse lines', () => {
    const result = '/bin/bash: line 1: foo: command not found';
    const out = sanitizeRalphShellNoise(result);

    expect(out.collapsedBlockCount).toBe(1);
    expect(out.suppressedLineCount).toBe(1);
  });

  it('tolerates leading ANSI color codes before the /bin/sh prefix', () => {
    const result =
      '\u001b[0;31m/bin/sh: line 1: foo: command not found\u001b[0m';
    const out = sanitizeRalphShellNoise(result);

    expect(out.collapsedBlockCount).toBe(1);
    expect(out.suppressedLineCount).toBe(1);
  });

  it('does not collapse prose that merely mentions sh:', () => {
    const result = ['The sh: prefix is fine', 'run bash: scripts here'].join(
      '\n',
    );
    const out = sanitizeRalphShellNoise(result);

    expect(out.sanitized).toBe(result);
    expect(out.collapsedBlockCount).toBe(0);
  });
});
