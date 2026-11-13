import { describe, expect, it } from 'vitest';

import { parseDoctorArgs } from '../parseDoctorArgs.ts';

describe('parseDoctorArgs', () => {
  it('defaults both flags off', () => {
    expect(parseDoctorArgs([])).toEqual({ json: false, strict: false });
  });

  it('reads --json and --strict, ignoring the rest', () => {
    expect(parseDoctorArgs(['--json', '--strict', '--bogus'])).toEqual({
      json: true,
      strict: true,
    });
  });
});
