import { describe, expect, it } from 'vitest';

import { validateDrafts } from '../validateDrafts.ts';

describe('validateDrafts', () => {
  it('gives one verdict per draft', () => {
    const result = validateDrafts(
      JSON.stringify([
        { kind: 'single', postOn: '2026-12-07', text: 'fine' },
        { kind: 'single', postOn: '2026-12-08', text: 'x'.repeat(281) },
      ]),
    );

    expect(result.ok && result.value.map((verdict) => verdict.ok)).toEqual([
      true,
      false,
    ]);
    expect(result.ok && result.value[0]?.line).toBe(
      'draft 0: ok single 2026-12-07 lengths=4',
    );
    expect(result.ok && result.value[1]?.line).toContain('too-long');
  });

  it('refuses input that is not a JSON array', () => {
    expect(validateDrafts('{}').ok).toBe(false);
    expect(validateDrafts('nope').ok).toBe(false);
  });
});
