import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { toast } from '@openthrottle/react-router-shadcn';
import { useMessageListSelection } from '../useMessageListSelection';
import type { MailMessageSummary } from '~/types/mail';

vi.mock('@openthrottle/react-router-shadcn', () => ({
  toast: { success: vi.fn() },
}));

const successMock = vi.mocked(toast.success);

const messages: MailMessageSummary[] = [
  {
    date: '2025-01-01',
    from: 'a@example.com',
    id: '1',
    read: false,
    subject: 'A',
  },
  {
    date: '2025-01-02',
    from: 'b@example.com',
    id: '2',
    read: true,
    subject: 'B',
  },
];

describe('useMessageListSelection', () => {
  beforeEach(() => {
    successMock.mockClear();
  });

  test('reports no selection when selectedIds is undefined', () => {
    const { result } = renderHook(() => useMessageListSelection({ messages }));

    expect(result.current.hasSelection).toBe(false);
    expect(result.current.isAllSelected).toBe(false);
    expect(result.current.selectedSet.size).toBe(0);
  });

  test('handleSelectAll selects every message id', () => {
    const onSelectionChange = vi.fn();
    const { result } = renderHook(() =>
      useMessageListSelection({ messages, onSelectionChange }),
    );

    act(() => {
      result.current.handleSelectAll(true);
    });

    expect(onSelectionChange).toHaveBeenCalledWith(new Set(['1', '2']));
  });

  test('handleSelectAll(false) clears the selection', () => {
    const onSelectionChange = vi.fn();
    const { result } = renderHook(() =>
      useMessageListSelection({
        messages,
        onSelectionChange,
        selectedIds: new Set(['1', '2']),
      }),
    );

    act(() => {
      result.current.handleSelectAll(false);
    });

    expect(onSelectionChange).toHaveBeenCalledWith(new Set());
  });

  test('handleSelectOne adds and removes a single id', () => {
    const onSelectionChange = vi.fn();
    const { result, rerender } = renderHook(
      (selectedIds: ReadonlySet<string>) =>
        useMessageListSelection({
          messages,
          onSelectionChange,
          selectedIds,
        }),
      { initialProps: new Set<string>() },
    );

    act(() => {
      result.current.handleSelectOne('1', true);
    });
    expect(onSelectionChange).toHaveBeenLastCalledWith(new Set(['1']));

    rerender(new Set(['1']));

    act(() => {
      result.current.handleSelectOne('1', false);
    });
    expect(onSelectionChange).toHaveBeenLastCalledWith(new Set());
  });

  test('isAllSelected is true only when every message id is selected', () => {
    const { result } = renderHook(() =>
      useMessageListSelection({
        messages,
        selectedIds: new Set(['1', '2']),
      }),
    );

    expect(result.current.isAllSelected).toBe(true);
    expect(result.current.hasSelection).toBe(true);
  });

  test('bulk delete flow: request opens confirm, confirm clears selection and toasts', () => {
    const onSelectionChange = vi.fn();
    const { result } = renderHook(() =>
      useMessageListSelection({
        messages,
        onSelectionChange,
        selectedIds: new Set(['1']),
      }),
    );

    expect(result.current.showDeleteConfirm).toBe(false);

    act(() => {
      result.current.handleRequestBulkDelete();
    });
    expect(result.current.showDeleteConfirm).toBe(true);

    act(() => {
      result.current.handleBulkDeleteConfirm();
    });

    expect(result.current.showDeleteConfirm).toBe(false);
    expect(onSelectionChange).toHaveBeenCalledWith(new Set());
    expect(successMock).toHaveBeenCalledWith('1 message(s) moved to trash');
  });

  test('handleCancelBulkDelete closes the confirm without clearing selection', () => {
    const onSelectionChange = vi.fn();
    const { result } = renderHook(() =>
      useMessageListSelection({
        messages,
        onSelectionChange,
        selectedIds: new Set(['1']),
      }),
    );

    act(() => {
      result.current.handleRequestBulkDelete();
    });
    act(() => {
      result.current.handleCancelBulkDelete();
    });

    expect(result.current.showDeleteConfirm).toBe(false);
    expect(onSelectionChange).not.toHaveBeenCalled();
  });
});
