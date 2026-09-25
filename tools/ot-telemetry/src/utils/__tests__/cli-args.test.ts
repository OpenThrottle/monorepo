import { describe, expect, it } from 'vitest';

import { DETAIL_LEVELS, OUTPUT_FORMATS } from '../../config/index.ts';
import { CliArgsError, parseCliArgs } from '../cli-args.ts';

describe('parseCliArgs', () => {
  it('defaults detail to aggregate, format to both, and out to the OS temp scratch dir', () => {
    const options = parseCliArgs([]);

    expect(options.detailLevel).toBe(DETAIL_LEVELS.AGGREGATE);
    expect(options.format).toBe(OUTPUT_FORMATS.BOTH);
    expect(options.outDir).toMatch(/ot-telemetry-reports$/);
    expect(options.since).toBeUndefined();
    expect(options.until).toBeUndefined();
  });

  it('honors every explicit flag over its default', () => {
    const options = parseCliArgs([
      '--since',
      '2026-01-01',
      '--until',
      '2026-04-01',
      '--out',
      './tmp/ot-report',
      '--detail',
      'identifiers',
      '--format',
      'json',
    ]);

    expect(options.since).toBe('2026-01-01');
    expect(options.until).toBe('2026-04-01');
    expect(options.outDir).toBe('./tmp/ot-report');
    expect(options.detailLevel).toBe(DETAIL_LEVELS.IDENTIFIERS);
    expect(options.format).toBe(OUTPUT_FORMATS.JSON);
  });

  it('rejects an invalid --detail value without silently falling back', () => {
    expect(() => parseCliArgs(['--detail', 'everything'])).toThrow(
      CliArgsError,
    );
  });

  it('rejects an invalid --format value', () => {
    expect(() => parseCliArgs(['--format', 'csv'])).toThrow(CliArgsError);
  });

  it('rejects an unknown flag rather than ignoring it', () => {
    expect(() => parseCliArgs(['--bogus', 'x'])).toThrow(CliArgsError);
  });
});
