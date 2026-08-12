import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { toast } from '@openthrottle/react-router-shadcn';
import { useMessageDetail } from '../useMessageDetail';
import type { MailMessageDetail } from '~/types/mail';

vi.mock('@openthrottle/react-router-shadcn', () => ({
  toast: { success: vi.fn() },
}));

const successMock = vi.mocked(toast.success);

const message: MailMessageDetail = {
  body: 'Test body',
  date: '2025-01-01 12:00',
  from: 'from@example.com',
  id: 'msg-1',
  subject: 'Test subject',
  to: 'to@example.com',
};

describe('useMessageDetail', () => {
  beforeEach(() => {
    successMock.mockClear();
  });

  test('has no pending confirm action by default', () => {
    const { result } = renderHook(() => useMessageDetail({ message }));
    expect(result.current.confirmAction).toBeNull();
  });

  test('handleArchiveClick opens the archive confirm when a message is present', () => {
    const { result } = renderHook(() => useMessageDetail({ message }));

    act(() => {
      result.current.handleArchiveClick();
    });

    expect(result.current.confirmAction).toBe('archive');
  });

  test('handleArchiveClick is a no-op when there is no message', () => {
    const { result } = renderHook(() => useMessageDetail({ message: null }));

    act(() => {
      result.current.handleArchiveClick();
    });

    expect(result.current.confirmAction).toBeNull();
  });

  test('handleConfirmArchive calls onArchive, closes the confirm, and toasts', () => {
    const onArchive = vi.fn();
    const { result } = renderHook(() =>
      useMessageDetail({ message, onArchive }),
    );

    act(() => {
      result.current.handleArchiveClick();
    });
    act(() => {
      result.current.handleConfirmArchive();
    });

    expect(onArchive).toHaveBeenCalledWith(message);
    expect(result.current.confirmAction).toBeNull();
    expect(successMock).toHaveBeenCalledWith('Message archived');
  });

  test('handleConfirmDelete calls onDelete, closes the confirm, and toasts', () => {
    const onDelete = vi.fn();
    const { result } = renderHook(() =>
      useMessageDetail({ message, onDelete }),
    );

    act(() => {
      result.current.handleDeleteClick();
    });
    act(() => {
      result.current.handleConfirmDelete();
    });

    expect(onDelete).toHaveBeenCalledWith(message);
    expect(result.current.confirmAction).toBeNull();
    expect(successMock).toHaveBeenCalledWith('Message moved to trash');
  });

  test('handleCancelConfirm clears the pending confirm action', () => {
    const { result } = renderHook(() => useMessageDetail({ message }));

    act(() => {
      result.current.handleDeleteClick();
    });
    expect(result.current.confirmAction).toBe('delete');

    act(() => {
      result.current.handleCancelConfirm();
    });

    expect(result.current.confirmAction).toBeNull();
  });
});
