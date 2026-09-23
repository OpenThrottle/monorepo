import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

/**
 * Integration coverage for `scripts/check-pr-attribution.sh` — the local
 * backstop that inspects a drafted PR title/body for agent-attribution lines
 * BEFORE `gh pr create`/`gh pr edit` ever publishes them, closing the gap the
 * CI `attribution-guard` job cannot: it only ever sees a PR body after GitHub
 * already has it (PR #554, body line 39).
 *
 * The pattern set itself (`.husky/lib/attribution-patterns.sh`) is exercised
 * indirectly here — this suite is about the script's own plumbing (arg
 * parsing, title vs. body pattern selection, exit codes, message shape), not
 * a re-test of the shared regex. Same split as `personal-skills-tier.test.ts`
 * uses for the staging guard.
 */

const SCRIPT = join(import.meta.dirname, '..', 'check-pr-attribution.sh');

interface RunResult {
  readonly output: string;
  readonly status: number;
}

/** Shape execFileSync throws on a non-zero exit. A predicate, not a cast. */
interface ExecFailure {
  readonly status?: number;
  readonly stderr?: unknown;
  readonly stdout?: unknown;
}

const isExecFailure = (error: unknown): error is ExecFailure =>
  typeof error === 'object' && error !== null;

const run = (args: readonly string[]): RunResult => {
  try {
    return {
      output: execFileSync('sh', [SCRIPT, ...args], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      }),
      status: 0,
    };
  } catch (error) {
    if (!isExecFailure(error)) {
      throw error;
    }
    return {
      output: `${String(error.stdout ?? '')}${String(error.stderr ?? '')}`,
      status: error.status ?? 1,
    };
  }
};

describe('check-pr-attribution.sh', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'check-pr-attribution-'));
  });

  afterEach(() => {
    rmSync(dir, { force: true, recursive: true });
  });

  const writeBody = (contents: string): string => {
    const file = join(dir, 'body.txt');
    writeFileSync(file, contents);
    return file;
  };

  const writeTitle = (contents: string): string => {
    const file = join(dir, 'title.txt');
    writeFileSync(file, contents);
    return file;
  };

  it('rejects a PR body carrying the observed Claude Code sign-off (PR #554)', () => {
    const body = writeBody(
      [
        '## Summary',
        '- did a thing',
        '',
        '🤖 Generated with [Claude Code](https://claude.com/claude-code)',
        '',
      ].join('\n'),
    );

    const result = run(['--body-file', body]);

    expect(result.status).toBe(1);
    expect(result.output).toContain('PR body');
    expect(result.output).toContain(
      '🤖 Generated with [Claude Code](https://claude.com/claude-code)',
    );
    expect(result.output).toContain('AGENTS.md § No agent attribution');
    expect(result.output).toContain('.husky/lib/attribution-patterns.sh');
  });

  it('rejects Co-Authored-By regardless of casing', () => {
    const body = writeBody('Co-Authored-By: Claude <noreply@anthropic.com>\n');

    const result = run(['--body-file', body]);

    expect(result.status).toBe(1);
    expect(result.output).toContain('Co-Authored-By');
  });

  it('accepts a clean body', () => {
    const body = writeBody('## Summary\n- did a thing\n');

    const result = run(['--body-file', body]);

    expect(result.status).toBe(0);
    expect(result.output).toContain('No attribution found');
  });

  it('does not trip on the conventional footers', () => {
    const body = writeBody(
      [
        '## Testing',
        '- [ ] run the tests',
        '',
        'BREAKING CHANGE: nothing actually breaks',
        'Closes #123',
        'Plan-Id: 61af5bc6-26ce-4b69-910c-7c7661eecb07',
        'Task-Id: a6a2076d-28a5-418c-bf23-b15963379847',
        '',
      ].join('\n'),
    );

    const result = run(['--body-file', body]);

    expect(result.status).toBe(0);
  });

  it('rejects a title with a trailing emoji sign-off using the unanchored pattern', () => {
    const title = writeTitle('feat(monorepo): add pr attribution guard 🤖');

    const result = run(['--title-file', title]);

    expect(result.status).toBe(1);
    expect(result.output).toContain('PR title');
  });

  it('accepts a clean title', () => {
    const title = writeTitle('feat(monorepo): add pr attribution guard');

    const result = run(['--title-file', title]);

    expect(result.status).toBe(0);
  });

  it('checks both title and body in one invocation, naming each independently', () => {
    const title = writeTitle('feat(monorepo): add pr attribution guard 🤖');
    const body = writeBody(
      'Co-authored-by: Claude Sonnet 5 <noreply@anthropic.com>\n',
    );

    const result = run(['--title-file', title, '--body-file', body]);

    expect(result.status).toBe(1);
    expect(result.output).toContain('PR title');
    expect(result.output).toContain('PR body');
  });

  it('reads the body from stdin when given "-"', () => {
    const result = (() => {
      try {
        return {
          output: execFileSync('sh', [SCRIPT, '--body-file', '-'], {
            encoding: 'utf8',
            input: 'Co-Authored-By: Claude <noreply@anthropic.com>\n',
            stdio: ['pipe', 'pipe', 'pipe'],
          }),
          status: 0,
        };
      } catch (error) {
        if (!isExecFailure(error)) {
          throw error;
        }
        return {
          output: `${String(error.stdout ?? '')}${String(error.stderr ?? '')}`,
          status: error.status ?? 1,
        };
      }
    })();

    expect(result.status).toBe(1);
    expect(result.output).toContain('Co-Authored-By');
  });

  it('exits with usage (status 2) when given no file arguments', () => {
    const result = run([]);

    expect(result.status).toBe(2);
    expect(result.output).toContain('Usage:');
  });
});
