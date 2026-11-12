import { describe, expect, it } from 'vitest';

import { splitToolRuns } from '../split-tool-runs.ts';

describe('splitToolRuns', () => {
  it('splits prose and tool runs in order', () => {
    expect(splitToolRuns('thinking\n→ Read a.ts\n→ Bash ls\ndone\n')).toEqual([
      { kind: 'worker', text: 'thinking\n' },
      { kind: 'tool', text: '→ Read a.ts\n→ Bash ls\n' },
      { kind: 'worker', text: 'done\n' },
    ]);
  });

  it('keeps blank lines in the prose run and reproduces the input exactly', () => {
    const text = '\n  → Edit b.ts\n\nprose\n\n→ Bash x';
    const runs = splitToolRuns(text);

    expect(runs.map((run) => run.text).join('')).toBe(text);
    expect(runs.map((run) => run.kind)).toEqual([
      'worker',
      'tool',
      'worker',
      'tool',
    ]);
  });

  it('treats an arrow mid-line as prose and an empty batch as no runs', () => {
    expect(splitToolRuns('a → b\n')).toEqual([
      { kind: 'worker', text: 'a → b\n' },
    ]);
    expect(splitToolRuns('')).toEqual([]);
  });
});
