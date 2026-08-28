import { describe, expect, it } from 'vitest';

import { renderCommand, run } from '../lib/exec.ts';

describe('renderCommand', () => {
  it('joins the argv for human-facing messages', () => {
    expect(renderCommand('git', ['status', '--short'])).toBe(
      'git status --short',
    );
  });
});

describe('run', () => {
  it('captures trimmed stdout by default', () => {
    const result = run('node', ['-e', 'console.log("hello ")']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('hello');
  });

  it('throws on non-zero exit with the command and stderr', () => {
    expect(() =>
      run('node', ['-e', 'console.error("boom"); process.exit(3)']),
    ).toThrow(/exited with code 3[\s\S]*boom/);
  });

  it('reports failure instead of throwing with allowFailure', () => {
    const result = run('node', ['-e', 'process.exit(2)'], {
      allowFailure: true,
    });

    expect(result.exitCode).toBe(2);
  });

  it('reports a spawn failure for a missing binary with allowFailure', () => {
    const result = run('definitely-not-a-real-binary-xyz', [], {
      allowFailure: true,
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).not.toBe('');
  });

  it('merges env over process.env and feeds stdin input', () => {
    const result = run(
      'node',
      ['-e', 'process.stdin.on("data",(d)=>console.log(process.env.LIB_EXEC_TEST + String(d)))'], // prettier-ignore
      { env: { LIB_EXEC_TEST: 'v:' }, input: 'in' },
    );

    expect(result.stdout).toBe('v:in');
  });
});
