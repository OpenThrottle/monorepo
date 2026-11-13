import { describe, expect, it } from 'vitest';

import { buildWorkerPrompt } from '../buildWorkerPrompt.ts';
import { parseRequirements } from '../parseRequirements.ts';
import { tailForRetry } from '../tailForRetry.ts';
import { makeTask } from './loop-fakes.ts';

describe('buildWorkerPrompt', () => {
  describe('first attempt', () => {
    const task = makeTask('1', {
      description: `Verbatim description\nwith two lines.`,
      requirements: ['First criterion', 'Second criterion'],
    });
    const prompt = buildWorkerPrompt({
      guidance: [],
      previousFailure: undefined,
      task,
    });

    it('carries the title and verbatim description', () => {
      expect(prompt).toContain(
        `# Task\nTask 1\n\nVerbatim description\nwith two lines.`,
      );
    });

    it('lists the acceptance criteria', () => {
      expect(prompt).toContain(`- First criterion\n- Second criterion`);
    });

    it('omits guidance and failure sections', () => {
      expect(prompt).not.toContain('# Operator guidance');
      expect(prompt).not.toContain('# Previous attempt');
    });

    it('states the hard rules and result file instructions', () => {
      expect(prompt).toContain('do NOT commit');
      expect(prompt).toContain('.ot-loop/result.json');
      expect(prompt).toContain('"version": 1');
    });

    it('has no slash command or MCP instruction', () => {
      expect(prompt).not.toMatch(/^\//m);
      expect(prompt.toLowerCase()).not.toContain('mcp');
    });
  });

  describe('without requirements', () => {
    it('omits the acceptance criteria section', () => {
      const prompt = buildWorkerPrompt({
        guidance: [],
        previousFailure: undefined,
        task: makeTask('1'),
      });

      expect(prompt).not.toContain('# Acceptance criteria');
    });
  });

  describe('with guidance', () => {
    it('includes the bodies oldest first', () => {
      const prompt = buildWorkerPrompt({
        guidance: ['first note', 'second note'],
        previousFailure: undefined,
        task: makeTask('1'),
      });

      expect(prompt).toContain(
        '# Operator guidance\nfirst note\n\nsecond note',
      );
    });
  });

  describe('retry', () => {
    it('adds the validation failure tail', () => {
      const prompt = buildWorkerPrompt({
        guidance: [],
        previousFailure: {
          command: 'pnpm nx run x:lint',
          exitCode: 2,
          kind: 'validation',
          tail: `\u001b[31mred\u001b[0m\nline two`,
        },
        task: makeTask('1'),
      });

      expect(prompt).toContain('# Previous attempt failed validation');
      expect(prompt).toContain('Command: pnpm nx run x:lint');
      expect(prompt).toContain('Exit code: 2');
      expect(prompt).toContain('Last 2 lines of output:\nred\nline two');
    });

    it('adds commit and worker failures', () => {
      const commit = buildWorkerPrompt({
        guidance: [],
        previousFailure: { kind: 'commit', output: 'hook said no' },
        task: makeTask('1'),
      });
      const worker = buildWorkerPrompt({
        guidance: [],
        previousFailure: { kind: 'worker', message: 'result file was missing' },
        task: makeTask('1'),
      });

      expect(commit).toContain('hook said no');
      expect(worker).toContain('result file was missing');
    });
  });
});

describe('parseRequirements', () => {
  it('reads a JSON array of strings', () => {
    expect(parseRequirements('["a","b"]')).toEqual(['a', 'b']);
  });

  it('drops non-strings and blanks', () => {
    expect(parseRequirements('["a",1,"  "]')).toEqual(['a']);
  });

  it('yields nothing for anything else', () => {
    expect(parseRequirements(undefined)).toEqual([]);
    expect(parseRequirements('{"a":1}')).toEqual([]);
    expect(parseRequirements('not json')).toEqual([]);
    expect(parseRequirements(['a'])).toEqual([]);
  });
});

describe('tailForRetry', () => {
  it('strips ANSI codes', () => {
    expect(tailForRetry(`\u001b[1;31mboom\u001b[0m`)).toBe('boom');
  });

  it('keeps the last 200 lines', () => {
    const output = Array.from({ length: 300 }, (_, i) => `l${i}`).join('\n');
    const lines = tailForRetry(output).split('\n');

    expect(lines).toHaveLength(200);
    expect(lines[0]).toBe('l100');
    expect(lines.at(-1)).toBe('l299');
  });

  it('caps at 16 KB keeping the end', () => {
    const tail = tailForRetry(`${'x'.repeat(40_000)}END`);

    expect(Buffer.byteLength(tail)).toBeLessThanOrEqual(16 * 1024);
    expect(tail.endsWith('END')).toBe(true);
  });
});
