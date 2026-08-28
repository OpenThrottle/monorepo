import { PassThrough } from 'node:stream';
import { describe, expect, it } from 'vitest';

import { createLogger, SYMBOLS } from '../lib/logger.ts';

/** Collect everything written to a stream as plain text (color-free in CI). */
const collector = (): { lines: () => string; stream: PassThrough } => {
  const stream = new PassThrough();
  const chunks: string[] = [];
  stream.on('data', (chunk: Buffer) => chunks.push(chunk.toString('utf8')));

  return { lines: (): string => chunks.join(''), stream };
};

// Strip ANSI escapes so assertions hold whether or not chalk colorizes.
// eslint-disable-next-line no-control-regex -- ANSI escape bytes are the point
const plain = (text: string): string => text.replace(/\[[0-9;]*m/g, '');

describe('createLogger', () => {
  it('writes every level to the provided stream, nothing elsewhere', () => {
    const { lines, stream } = collector();
    const logger = createLogger({ stream });

    logger.heading('Phase');
    logger.step('doing');
    logger.info('plain');
    logger.success('done');
    logger.warn('careful');
    logger.fail('broken');
    logger.detail('context');

    const output = plain(lines());
    expect(output).toContain('▶ Phase');
    expect(output).toContain(`${SYMBOLS.step} doing`);
    expect(output).toContain('plain');
    expect(output).toContain(`${SYMBOLS.success} done`);
    expect(output).toContain(`${SYMBOLS.warn} careful`);
    expect(output).toContain(`${SYMBOLS.fail} broken`);
    expect(output).toContain('context');
  });

  it('suppresses detail lines when verbose is false', () => {
    const { lines, stream } = collector();
    const logger = createLogger({ stream, verbose: false });

    logger.detail('hidden');
    logger.info('visible');

    const output = plain(lines());
    expect(output).not.toContain('hidden');
    expect(output).toContain('visible');
  });

  it('routes to stderr when constructed for a stdout-contract script', () => {
    const out = collector();
    const err = collector();
    const logger = createLogger({ stream: err.stream });

    logger.step('narration');
    out.stream.write('the-contract-payload\n');

    expect(plain(err.lines())).toContain('narration');
    expect(out.lines()).toBe('the-contract-payload\n');
  });
});
