import { describe, expect, it } from 'vitest';

import {
  formatDuration,
  labelForCommand,
  summarizeCommand,
} from '../summarize-command.ts';

describe('labelForCommand', () => {
  it('uses the targets of nx affected and run-many', () => {
    expect(
      labelForCommand('pnpm nx affected -t typecheck --base=abc --parallel=1'),
    ).toBe('typecheck');
    expect(
      labelForCommand('pnpm nx run-many -t lint,typecheck,test --parallel=1'),
    ).toBe('lint,typecheck,test');
    expect(
      labelForCommand('pnpm nx run-many --target=codegen-graphql --all'),
    ).toBe('codegen-graphql');
    expect(labelForCommand('pnpm nx affected -t lint test --base=x')).toBe(
      'lint,test',
    );
  });

  it('collapses and truncates any other command to one line', () => {
    expect(labelForCommand('pnpm nx format:check')).toBe(
      'pnpm nx format:check',
    );
    expect(labelForCommand('a\n  b')).toBe('a b');
    expect(labelForCommand('x'.repeat(100))).toHaveLength(60);
  });
});

describe('formatDuration', () => {
  it('formats seconds and minutes', () => {
    expect(formatDuration(46_400)).toBe('46s');
    expect(formatDuration(125_000)).toBe('2m 5s');
  });
});

describe('summarizeCommand', () => {
  it('renders green, red and timed out', () => {
    const base = { command: 'pnpm nx affected -t lint', durationMs: 54_000 };

    expect(summarizeCommand({ ...base, outcome: { kind: 'green' } })).toBe(
      'lint ✔ · 54s',
    );
    expect(
      summarizeCommand({ ...base, outcome: { exitCode: 1, kind: 'red' } }),
    ).toBe('lint ✗ exit 1 · 54s');
    expect(summarizeCommand({ ...base, outcome: { kind: 'timed_out' } })).toBe(
      'lint ✗ timed out · 54s',
    );
  });
});
