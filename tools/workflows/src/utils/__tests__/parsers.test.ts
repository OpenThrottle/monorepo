/**
 * @description Tests for Ralph CLI parsers (complete-task signals, plan/task ID validation).
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  getRalphOutputMarkerFlags,
  isCortexPlanId,
  isCortexTaskId,
  parseRalphArgs,
  parseRalphCompleteTaskSignals,
} from '../parsers';
import { ralphDebugLogger, setRalphDebugLevel } from '../ralph-debug-logger';
import { WORKFLOW_RALPH_DEFAULTS_FILE } from '../ralph-runtime-config';

const PLAN_UUID = '77cb14a0-5eb0-4061-87ea-d618b85e8818';
const TASK_UUID = '93fcbc19-1861-4931-9631-6393d33220a2';
const TASK_UUID_UPPER = '93FCBC19-1861-4931-9631-6393D33220A2';
const OTHER_UUID = '89280b05-845f-4581-8e27-68f004d9b698';

describe('parseRalphCompleteTaskSignals', () => {
  it('returns empty array when result has no complete-task tag', () => {
    expect(parseRalphCompleteTaskSignals('')).toEqual([]);
    expect(
      parseRalphCompleteTaskSignals('Some output without any tag.'),
    ).toEqual([]);
    expect(
      parseRalphCompleteTaskSignals('Done with <ralph:other>foo</ralph:other>'),
    ).toEqual([]);
  });

  it('returns single task id when one tag is present', () => {
    const result = `Summary of work. <ralph:task-complete>${TASK_UUID}</ralph:task-complete>`;
    expect(parseRalphCompleteTaskSignals(result)).toEqual([
      TASK_UUID.toLowerCase(),
    ]);
  });

  it('normalizes task id to lowercase', () => {
    const result = `<ralph:task-complete>${TASK_UUID_UPPER}</ralph:task-complete>`;
    expect(parseRalphCompleteTaskSignals(result)).toEqual([
      TASK_UUID.toLowerCase(),
    ]);
  });

  it('returns unique task ids when multiple tags present', () => {
    const result = `First <ralph:task-complete>${TASK_UUID}</ralph:task-complete> then <ralph:task-complete>${OTHER_UUID}</ralph:task-complete>`;
    expect(parseRalphCompleteTaskSignals(result)).toEqual(
      expect.arrayContaining([
        TASK_UUID.toLowerCase(),
        OTHER_UUID.toLowerCase(),
      ]),
    );
    expect(parseRalphCompleteTaskSignals(result)).toHaveLength(2);
  });

  it('deduplicates same task id when repeated', () => {
    const result = `<ralph:task-complete>${TASK_UUID}</ralph:task-complete> again <ralph:task-complete>${TASK_UUID}</ralph:task-complete>`;
    expect(parseRalphCompleteTaskSignals(result)).toEqual([
      TASK_UUID.toLowerCase(),
    ]);
  });

  it('does not match malformed tags', () => {
    expect(
      parseRalphCompleteTaskSignals(
        '<ralph:task-complete>not-a-uuid</ralph:task-complete>',
      ),
    ).toEqual([]);
    expect(
      parseRalphCompleteTaskSignals(
        '<ralph:task-complete>93fcbc19-1861-4931-9631-6393d33220a2</ralph:complete-tas>',
      ),
    ).toEqual([]);
  });

  /**
   * Claude Code CLI uses the same combined stdout+stderr string as `cursor-agent` in
   * {@link runShellIterationAsync}. These fixtures approximate headless `claude --bare -p …` noise
   * (progress / logs on stderr, answer on stdout) without requiring a live CLI in CI.
   */
  it('parses task-complete when embedded in Claude-shaped stdout+stderr (async contract)', () => {
    const stdout = [
      '## Summary',
      '',
      'Implemented the feature.',
      '',
      `<ralph:task-complete>${TASK_UUID}</ralph:task-complete>`,
    ].join('\n');
    const stderr = ['[claude-code] session started', 'thinking…'].join('\n');
    const combined = `${stdout}\n${stderr}`;
    expect(parseRalphCompleteTaskSignals(combined)).toEqual([
      TASK_UUID.toLowerCase(),
    ]);
    expect(getRalphOutputMarkerFlags(combined).hasPromiseComplete).toBe(false);
  });

  it('parses markers when stderr precedes assistant text (same string contract)', () => {
    const combined = [
      'stderr: loading MCP…',
      '',
      `Assistant: Done. <ralph:task-complete>${TASK_UUID}</ralph:task-complete>`,
      '<promise>COMPLETE</promise>',
    ].join('\n');
    expect(parseRalphCompleteTaskSignals(combined)).toEqual([
      TASK_UUID.toLowerCase(),
    ]);
    expect(getRalphOutputMarkerFlags(combined).hasPromiseComplete).toBe(true);
  });

  it('still parses task-complete when ANSI escape codes wrap nearby text', () => {
    const ansiGreen = '\u001b[32m';
    const ansiReset = '\u001b[0m';
    const result = `${ansiGreen}ok${ansiReset} <ralph:task-complete>${TASK_UUID}</ralph:task-complete>`;
    expect(parseRalphCompleteTaskSignals(result)).toEqual([
      TASK_UUID.toLowerCase(),
    ]);
  });

  it('does not match HTML-escaped tags (model must emit literal angle brackets)', () => {
    const escaped =
      '&lt;ralph:task-complete&gt;' +
      TASK_UUID +
      '&lt;/ralph:task-complete&gt;';
    expect(parseRalphCompleteTaskSignals(escaped)).toEqual([]);
  });

  it('parses task-complete inside a markdown fence (literal tag characters)', () => {
    const result = [
      '```',
      `<ralph:task-complete>${TASK_UUID}</ralph:task-complete>`,
      '```',
    ].join('\n');
    expect(parseRalphCompleteTaskSignals(result)).toEqual([
      TASK_UUID.toLowerCase(),
    ]);
  });
});

describe('getRalphOutputMarkerFlags', () => {
  it('reports promise and complete-task markers independently', () => {
    expect(
      getRalphOutputMarkerFlags(
        'ok <promise>COMPLETE</promise> <ralph:task-complete>x</ralph:task-complete>',
      ),
    ).toEqual({
      hasCompleteTaskClose: true,
      hasCompleteTaskOpen: true,
      hasPromiseComplete: true,
      hasPromiseError: false,
      hasPromiseInputRequired: false,
    });
  });

  it('detects INPUT_REQUIRED and ERROR', () => {
    expect(
      getRalphOutputMarkerFlags(
        '<promise>INPUT_REQUIRED</promise><promise>ERROR</promise>',
      ),
    ).toEqual({
      hasCompleteTaskClose: false,
      hasCompleteTaskOpen: false,
      hasPromiseComplete: false,
      hasPromiseError: true,
      hasPromiseInputRequired: true,
    });
  });
});

describe('isCortexPlanId', () => {
  it('returns true for valid v4 UUID', () => {
    expect(isCortexPlanId(TASK_UUID)).toBe(true);
    expect(isCortexPlanId('6eaebb97-dfcf-474d-9630-f2c684aea45c')).toBe(true);
  });

  it('returns false for non-UUID strings', () => {
    expect(isCortexPlanId('')).toBe(false);
    expect(isCortexPlanId('abc')).toBe(false);
    expect(isCortexPlanId('93fcbc19-1861-4931-9631-6393d33220a2x')).toBe(false);
  });

  it('accepts UUID with surrounding whitespace', () => {
    expect(isCortexPlanId(`  ${TASK_UUID}  `)).toBe(true);
  });
});

describe('isCortexTaskId', () => {
  it('returns true for valid v4 UUID', () => {
    expect(isCortexTaskId(TASK_UUID)).toBe(true);
  });

  it('returns false for non-UUID strings', () => {
    expect(isCortexTaskId('')).toBe(false);
    expect(isCortexTaskId('task-1')).toBe(false);
  });
});

describe('parseRalphArgs (shim debug CLI)', () => {
  const originalArgv = process.argv;

  beforeEach(() => {
    delete process.env.WORKFLOW_RALPH_DEBUG;
    delete process.env.RALPH_DEBUG;
    delete process.env.WORKFLOW_RALPH_VERBOSE;
    setRalphDebugLevel('off');
  });

  afterEach(() => {
    process.argv = originalArgv;
    setRalphDebugLevel('off');
  });

  it('sets debug level from --debug', () => {
    process.argv = ['node', 'ralph.js', '--plan', PLAN_UUID, '--debug'];
    const args = parseRalphArgs();
    expect(args.ralphDebugLevel).toBe('debug');
    expect(ralphDebugLogger.level).toBe('debug');
  });

  it('sets verbose level from --verbose', () => {
    process.argv = ['node', 'ralph.js', '--plan', PLAN_UUID, '--verbose'];
    const args = parseRalphArgs();
    expect(args.ralphDebugLevel).toBe('verbose');
    expect(ralphDebugLogger.level).toBe('verbose');
  });

  it('sets verbose level from --verbose=verbose', () => {
    process.argv = [
      'node',
      'ralph.js',
      '--plan',
      PLAN_UUID,
      '--verbose=verbose',
    ];
    const args = parseRalphArgs();
    expect(args.ralphDebugLevel).toBe('verbose');
    expect(ralphDebugLogger.level).toBe('verbose');
  });

  it('throws when --verbose= has an invalid value', () => {
    process.argv = ['node', 'ralph.js', '--plan', PLAN_UUID, '--verbose=maybe'];
    expect(() => parseRalphArgs()).toThrow(
      /expects "verbose" or a truthy verbose flag/,
    );
  });

  it('sets verbose level from --debug=verbose', () => {
    process.argv = ['node', 'ralph.js', '--plan', PLAN_UUID, '--debug=verbose'];
    const args = parseRalphArgs();
    expect(args.ralphDebugLevel).toBe('verbose');
    expect(ralphDebugLogger.level).toBe('verbose');
  });

  it('keeps verbose when both --verbose and --debug appear', () => {
    process.argv = [
      'node',
      'ralph.js',
      '--plan',
      PLAN_UUID,
      '--verbose',
      '--debug',
    ];
    const args = parseRalphArgs();
    expect(args.ralphDebugLevel).toBe('verbose');
    expect(ralphDebugLogger.level).toBe('verbose');
  });

  it('applies env when no CLI debug flags (re-reads env after logger reset)', () => {
    process.env.WORKFLOW_RALPH_DEBUG = '1';
    process.argv = ['node', 'ralph.js', '--plan', PLAN_UUID];
    const args = parseRalphArgs();
    expect(args.ralphDebugLevel).toBe('debug');
    expect(ralphDebugLogger.level).toBe('debug');
  });

  it('CLI --debug overrides env verbose', () => {
    process.env.WORKFLOW_RALPH_DEBUG = 'verbose';
    process.argv = ['node', 'ralph.js', '--plan', PLAN_UUID, '--debug'];
    const args = parseRalphArgs();
    expect(args.ralphDebugLevel).toBe('debug');
    expect(ralphDebugLogger.level).toBe('debug');
  });

  it('throws when --debug= has an invalid value', () => {
    process.argv = ['node', 'ralph.js', '--plan', PLAN_UUID, '--debug=maybe'];
    expect(() => parseRalphArgs()).toThrow(
      /expects "verbose" or a truthy debug flag/,
    );
  });

  it('rejects uppercase --DEBUG and --VERBOSE argv (lowercase only)', () => {
    process.argv = ['node', 'ralph.js', '--plan', PLAN_UUID, '--DEBUG'];
    expect(() => parseRalphArgs()).toThrow(/Unknown flag: --DEBUG/);

    process.argv = ['node', 'ralph.js', '--plan', PLAN_UUID, '--VERBOSE'];
    expect(() => parseRalphArgs()).toThrow(/Unknown flag: --VERBOSE/);
  });

  it('sets verbose level from --verbose=true', () => {
    process.argv = ['node', 'ralph.js', '--plan', PLAN_UUID, '--verbose=true'];
    const args = parseRalphArgs();
    expect(args.ralphDebugLevel).toBe('verbose');
    expect(ralphDebugLogger.level).toBe('verbose');
  });

  it('applies debug from .workflow-ralph.json when no CLI or env debug flags', () => {
    const dir = mkdtempSync(join(tmpdir(), 'wr-parsers-'));
    const previousCwd = process.cwd();
    try {
      writeFileSync(
        join(dir, WORKFLOW_RALPH_DEFAULTS_FILE),
        JSON.stringify({ debug: 'verbose' }),
        'utf8',
      );
      process.chdir(dir);
      process.argv = ['node', 'ralph.js', '--plan', PLAN_UUID];
      const args = parseRalphArgs();
      expect(args.ralphDebugLevel).toBe('verbose');
      expect(ralphDebugLogger.level).toBe('verbose');
    } finally {
      process.chdir(previousCwd);
      rmSync(dir, { force: true, recursive: true });
    }
  });
});
