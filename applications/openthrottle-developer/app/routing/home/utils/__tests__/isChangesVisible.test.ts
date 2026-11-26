import { CHAT_SESSION_DRAWER_SECTIONS } from '@openthrottle/react-router-chat';
import { describe, expect, test } from 'vitest';

import { isChangesVisible } from '~/routing/home/utils/isChangesVisible';

describe('isChangesVisible', () => {
  test('is false when neither the column nor the sheet is open', () => {
    expect(
      isChangesVisible({
        collapsedSections: [],
        isOpen: false,
        isSheetOpen: false,
      }),
    ).toBe(false);
  });

  test('is true when the column is open and Changes is expanded', () => {
    expect(
      isChangesVisible({
        collapsedSections: [],
        isOpen: true,
        isSheetOpen: false,
      }),
    ).toBe(true);
  });

  test('is true when only the sheet is open', () => {
    expect(
      isChangesVisible({
        collapsedSections: [],
        isOpen: false,
        isSheetOpen: true,
      }),
    ).toBe(true);
  });

  test('is false when Changes is collapsed', () => {
    expect(
      isChangesVisible({
        collapsedSections: [CHAT_SESSION_DRAWER_SECTIONS.CHANGES],
        isOpen: true,
        isSheetOpen: false,
      }),
    ).toBe(false);
  });
});
