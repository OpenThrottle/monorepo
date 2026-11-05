import { describe, expect, it } from 'vitest';

import { PLAN_EDITOR_ACTIONS_COPY } from '~/routing/plans/data/data.copy';
import { getPlanEditorTooltip } from '~/routing/plans/utils/plan-editor-tooltip';

describe('getPlanEditorTooltip', () => {
  describe('when the link cannot be built', () => {
    it('names the checkout fix', () => {
      expect(
        getPlanEditorTooltip({
          href: null,
          label: 'Cursor',
          promptTargetsFocusedWindow: true,
        }),
      ).toBe(PLAN_EDITOR_ACTIONS_COPY.needsCheckoutTooltip('Cursor'));
    });
  });

  describe('when the prompt targets the focused window', () => {
    it('returns the focused-window caveat', () => {
      expect(
        getPlanEditorTooltip({
          href: 'cursor://x',
          label: 'Cursor',
          promptTargetsFocusedWindow: true,
        }),
      ).toBe(PLAN_EDITOR_ACTIONS_COPY.focusedWindowTooltip('Cursor'));
    });
  });

  describe('when the link is plain', () => {
    it('returns the open hint', () => {
      expect(
        getPlanEditorTooltip({
          href: 'cursor://x',
          label: 'Cursor',
          promptTargetsFocusedWindow: false,
        }),
      ).toBe(PLAN_EDITOR_ACTIONS_COPY.openTooltip('Cursor'));
    });
  });
});
