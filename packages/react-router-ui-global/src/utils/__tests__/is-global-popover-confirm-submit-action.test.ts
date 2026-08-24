import { describe, expect, test } from 'vitest';
import { isGlobalPopoverConfirmSubmitAction } from '../is-global-popover-confirm-submit-action';
import type { GlobalPopoverAction } from '../../components/GlobalPopover';

describe('isGlobalPopoverConfirmSubmitAction', () => {
  test('returns true for submit actions with confirm', () => {
    const action: GlobalPopoverAction = {
      confirm: { description: 'x', title: 'y' },
      fields: { intent: 'delete' },
      id: 'delete',
      kind: 'submit',
      label: 'Remove',
    };

    expect(isGlobalPopoverConfirmSubmitAction(action)).toBe(true);
  });

  test('returns false for submit without confirm, link, select, or undefined', () => {
    const submit: GlobalPopoverAction = {
      fields: { intent: 'refresh' },
      id: 'refresh',
      kind: 'submit',
      label: 'Refresh',
    };
    const link: GlobalPopoverAction = {
      id: 'view',
      kind: 'link',
      label: 'View',
      to: '/x',
    };
    const select: GlobalPopoverAction = {
      id: 'pause',
      kind: 'select',
      label: 'Pause',
      onSelect: () => undefined,
    };

    expect(isGlobalPopoverConfirmSubmitAction(submit)).toBe(false);
    expect(isGlobalPopoverConfirmSubmitAction(link)).toBe(false);
    expect(isGlobalPopoverConfirmSubmitAction(select)).toBe(false);
    expect(isGlobalPopoverConfirmSubmitAction(undefined)).toBe(false);
  });
});
