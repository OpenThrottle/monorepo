import { describe, expect, test } from 'vitest';

import { MOCK_FRAGMENTS } from '../../data/mock.fragments';
import { applyFragmentDraft } from '../apply-fragment-draft';

describe('utils/applyFragmentDraft', () => {
  test('merges the draft over the edited fragment, however deep', () => {
    const [grid] = applyFragmentDraft(MOCK_FRAGMENTS, 'heading-2', {
      copy: 'Edited',
    });
    const nested = grid?.children[1]?.children[0];

    expect(nested?.properties).toStrictEqual({ copy: 'Edited', heading: 'h3' });
  });

  test('leaves the input and other fragments untouched', () => {
    const [grid] = applyFragmentDraft(MOCK_FRAGMENTS, 'heading-2', {
      copy: 'Edited',
    });

    expect(grid?.children[0]?.properties).toStrictEqual({
      copy: 'Hello world',
      heading: 'h1',
    });
    expect(MOCK_FRAGMENTS[0]?.children[1]?.children[0]?.properties.copy).toBe(
      'Variant B',
    );
  });

  test('changes nothing without a selection', () => {
    expect(
      applyFragmentDraft(MOCK_FRAGMENTS, undefined, { copy: 'x' }),
    ).toStrictEqual(MOCK_FRAGMENTS);
  });
});
