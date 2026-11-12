import { describe, expect, test } from 'vitest';

import {
  formatOtLoopCommandsText,
  isPlanRunRunner,
  mergeOtLoopFields,
  parseOtLoopCommandsText,
  parseOtLoopMaxRetriesText,
  resolvePlanRunRunner,
} from '../plan-run-ot-loop';

describe('plan-run-ot-loop utils', () => {
  test('parseOtLoopCommandsText trims and drops blank lines', () => {
    expect(parseOtLoopCommandsText('  a \n\n   \n b\n')).toEqual(['a', 'b']);
    expect(parseOtLoopCommandsText('')).toEqual([]);
  });

  test('formatOtLoopCommandsText is the one-per-line inverse', () => {
    expect(formatOtLoopCommandsText(['a', 'b'])).toBe('a\nb');
    expect(formatOtLoopCommandsText(undefined)).toBe('');
  });

  test.each([
    ['', undefined],
    ['  ', undefined],
    ['0', 0],
    ['5', 5],
    ['6', null],
    ['-1', null],
    ['1.5', null],
    ['abc', null],
  ])('parseOtLoopMaxRetriesText(%j) is %j', (text, expected) => {
    expect(parseOtLoopMaxRetriesText(text)).toBe(expected);
  });

  test('isPlanRunRunner accepts only the two runners; absent resolves to ralph', () => {
    expect(isPlanRunRunner('ot-loop')).toBe(true);
    expect(isPlanRunRunner('ralph')).toBe(true);
    expect(isPlanRunRunner('turbo')).toBe(false);
    expect(resolvePlanRunRunner(undefined)).toBe('ralph');
  });

  describe('mergeOtLoopFields', () => {
    test('keeps setup and final commands and replaces the edited fields', () => {
      expect(
        mergeOtLoopFields(
          {
            finalValidationCommands: ['final'],
            maxRetries: 1,
            setupCommands: ['setup'],
            validationCommands: ['old'],
          },
          { maxRetries: 3, validationCommands: ['new'] },
        ),
      ).toEqual({
        finalValidationCommands: ['final'],
        maxRetries: 3,
        setupCommands: ['setup'],
        validationCommands: ['new'],
      });
    });

    test('returns undefined when nothing is left', () => {
      expect(
        mergeOtLoopFields(undefined, {
          maxRetries: undefined,
          validationCommands: [],
        }),
      ).toBeUndefined();
    });
  });
});
