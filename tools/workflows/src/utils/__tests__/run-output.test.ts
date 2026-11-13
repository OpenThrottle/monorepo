import { WORKFLOW_PROMPT_SHELL_COMMAND_GUARDRAIL } from '@openthrottle/openthrottle-agentic-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createPlanOutputStreamer,
  sanitizeRalphShellNoise,
} from '../run-output';

/**
 * Unit tests for the Ralph iteration chunk handler's append behavior: in-order
 * (serialized) delivery, bounded retry of transient failures, and surfacing
 * ultimately-lost output instead of silently succeeding.
 */

const noopSleep = (): Promise<void> => {
  return Promise.resolve();
};

const silentLogger = () => {
  return {
    error: vi.fn<(...args: unknown[]) => void>(),
    warn: vi.fn<(...args: unknown[]) => void>(),
  };
};

describe('createPlanOutputStreamer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('appends chunks strictly in enqueue order even when an earlier append is slow', async () => {
    const order: string[] = [];
    let releaseFirst: (() => void) | undefined;

    const append = vi.fn((content: string): Promise<void> => {
      if (content === 'a') {
        return new Promise<void>((resolve) => {
          releaseFirst = () => {
            order.push('a');
            resolve();
          };
        });
      }
      order.push(content);
      return Promise.resolve();
    });

    const streamer = createPlanOutputStreamer({ append, sleep: noopSleep });
    streamer.enqueue('a');
    streamer.enqueue('b');
    streamer.enqueue('c');

    // 'b' and 'c' must not run until 'a' resolves — they are chained behind it.
    await Promise.resolve();
    expect(order).toEqual([]);

    releaseFirst?.();
    const summary = await streamer.drain();

    expect(order).toEqual(['a', 'b', 'c']);
    expect(summary).toEqual({
      attempted: 3,
      failed: 0,
      firstFailureMessage: undefined,
    });
  });

  it('retries a transient failure and still counts the chunk as succeeded', async () => {
    const append = vi
      .fn<(content: string) => Promise<void>>()
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValueOnce(undefined);
    const logger = silentLogger();

    const streamer = createPlanOutputStreamer({
      append,
      logger,
      maxAttempts: 3,
      sleep: noopSleep,
    });
    streamer.enqueue('chunk');
    const summary = await streamer.drain();

    expect(append).toHaveBeenCalledTimes(2);
    expect(summary).toEqual({
      attempted: 1,
      failed: 0,
      firstFailureMessage: undefined,
    });
    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('gives up after maxAttempts and records the failure without throwing', async () => {
    const append = vi
      .fn<(content: string) => Promise<void>>()
      .mockRejectedValue(new Error('openthrottle down'));
    const logger = silentLogger();

    const streamer = createPlanOutputStreamer({
      append,
      logger,
      maxAttempts: 3,
      sleep: noopSleep,
    });
    // enqueue must never throw, even when the append always rejects.
    expect(() => streamer.enqueue('chunk')).not.toThrow();
    const summary = await streamer.drain();

    expect(append).toHaveBeenCalledTimes(3);
    expect(summary.attempted).toBe(1);
    expect(summary.failed).toBe(1);
    expect(summary.firstFailureMessage).toBe('openthrottle down');
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  it('summarizes mixed success/failure and warns once on drain when output was lost', async () => {
    const append = vi.fn((content: string): Promise<void> => {
      if (content === 'bad') {
        return Promise.reject(new Error('first failure'));
      }
      return Promise.resolve();
    });
    const logger = silentLogger();

    const streamer = createPlanOutputStreamer({
      append,
      logger,
      maxAttempts: 1,
      sleep: noopSleep,
    });
    streamer.enqueue('ok-1');
    streamer.enqueue('bad');
    streamer.enqueue('bad');
    streamer.enqueue('ok-2');
    const summary = await streamer.drain();

    expect(summary.attempted).toBe(4);
    expect(summary.failed).toBe(2);
    // firstFailureMessage captures the first chunk that failed, not the last.
    expect(summary.firstFailureMessage).toBe('first failure');
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  it('reports zero failures for an empty stream', async () => {
    const append = vi.fn<(content: string) => Promise<void>>();
    const logger = silentLogger();

    const streamer = createPlanOutputStreamer({
      append,
      logger,
      sleep: noopSleep,
    });
    const summary = await streamer.drain();

    expect(summary).toEqual({
      attempted: 0,
      failed: 0,
      firstFailureMessage: undefined,
    });
    expect(append).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });
});

/*
 * @description Tests for the finding-#1 mitigations: the Shell-safety prompt guardrail and the
 * `/bin/sh` command-misparse output sanitizer (plan 65a8dd25).
 */

const TASK_UUID = '0c8e76bd-a82c-4f49-b5f8-a9a65c047430';

describe('WORKFLOW_PROMPT_SHELL_COMMAND_GUARDRAIL', () => {
  it('forbids multiline prose in the Shell tool', () => {
    expect(WORKFLOW_PROMPT_SHELL_COMMAND_GUARDRAIL).toContain(
      'Do NOT paste multiline prose into the Shell tool',
    );
  });

  it('tells the agent to keep Ralph signals as plain text', () => {
    expect(WORKFLOW_PROMPT_SHELL_COMMAND_GUARDRAIL).toContain(
      '<ralph:task-complete>',
    );
    expect(WORKFLOW_PROMPT_SHELL_COMMAND_GUARDRAIL).toContain(
      'plain assistant text',
    );
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
    const result = `\u001b[0;31m/bin/sh: line 1: foo: command not found\u001b[0m`;
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
