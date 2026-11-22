import { describe, expect, test } from 'vitest';

import { buildNormalizeArgs, buildSliceArgs } from '../slice-take.ts';

describe('buildNormalizeArgs', () => {
  const args = buildNormalizeArgs({
    audioFilter: 'loudnorm=I=-14',
    input: '/a/take.raw.wav',
    output: '/a/take.norm.wav',
    sampleRate: 48_000,
  });

  test('applies the gain and the resample in one invocation', () => {
    expect(args[args.indexOf('-af') + 1]).toBe('loudnorm=I=-14');
    expect(args[args.indexOf('-ar') + 1]).toBe('48000');
    expect(args[args.indexOf('-c:a') + 1]).toBe('pcm_s16le');
  });

  test('reads the raw take and writes the normalised take', () => {
    expect(args[args.indexOf('-i') + 1]).toBe('/a/take.raw.wav');
    expect(args.at(-1)).toBe('/a/take.norm.wav');
  });
});

describe('buildSliceArgs', () => {
  const args = buildSliceArgs({
    endSeconds: 2.5,
    input: '/a/take.norm.wav',
    output: '/a/001-000.wav',
    startSeconds: 1,
  });

  test('cuts after the input so the cut is sample-accurate', () => {
    expect(args.indexOf('-i')).toBeLessThan(args.indexOf('-ss'));
    expect(args).toContain('1.000000');
    expect(args).toContain('2.500000');
  });

  test('applies no filter and no resample', () => {
    expect(args).not.toContain('-af');
    expect(args).not.toContain('-ar');
    expect(args.at(-1)).toBe('/a/001-000.wav');
  });
});
