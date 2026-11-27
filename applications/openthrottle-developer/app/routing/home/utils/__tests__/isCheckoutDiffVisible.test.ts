import { CHAT_SESSION_DRAWER_SECTIONS } from '@openthrottle/react-router-chat';
import { describe, expect, test } from 'vitest';

import { isCheckoutDiffVisible } from '~/routing/home/utils/isCheckoutDiffVisible';

describe('isCheckoutDiffVisible', () => {
  test('is false when neither the column nor the sheet is open', () => {
    expect(
      isCheckoutDiffVisible({
        collapsedSections: [],
        isOpen: false,
        isSheetOpen: false,
      }),
    ).toBe(false);
  });

  test('is true when the column is open and Changes is expanded', () => {
    expect(
      isCheckoutDiffVisible({
        collapsedSections: [],
        isOpen: true,
        isSheetOpen: false,
      }),
    ).toBe(true);
  });

  test('is true when only the sheet is open', () => {
    expect(
      isCheckoutDiffVisible({
        collapsedSections: [],
        isOpen: false,
        isSheetOpen: true,
      }),
    ).toBe(true);
  });

  test('is true when Changes is collapsed but Environment is expanded', () => {
    expect(
      isCheckoutDiffVisible({
        collapsedSections: [CHAT_SESSION_DRAWER_SECTIONS.CHANGES],
        isOpen: true,
        isSheetOpen: false,
      }),
    ).toBe(true);
  });

  test('is false when both Changes and Environment are collapsed', () => {
    expect(
      isCheckoutDiffVisible({
        collapsedSections: [
          CHAT_SESSION_DRAWER_SECTIONS.CHANGES,
          CHAT_SESSION_DRAWER_SECTIONS.ENVIRONMENT,
        ],
        isOpen: true,
        isSheetOpen: false,
      }),
    ).toBe(false);
  });
});
