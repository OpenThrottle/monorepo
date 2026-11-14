import { describe, expect, it } from 'vitest';

import { parseDoctorArgs } from '../parseDoctorArgs.ts';

describe('parseDoctorArgs', () => {
  it('defaults every flag off', () => {
    expect(parseDoctorArgs([])).toEqual({
      fix: false,
      json: false,
      strict: false,
    });
  });

  it('reads --fix, --json and --strict, ignoring the rest', () => {
    expect(parseDoctorArgs(['--json', '--strict', '--fix', '--bogus'])).toEqual(
      {
        fix: true,
        json: true,
        strict: true,
      },
    );
  });
});
