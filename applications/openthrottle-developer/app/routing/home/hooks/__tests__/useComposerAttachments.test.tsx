import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { useComposerAttachments } from '../useComposerAttachments';

const { uploadComposerAttachment } = vi.hoisted(() => {
  return { uploadComposerAttachment: vi.fn() };
});

vi.mock('~/routing/home/utils/uploadComposerAttachment', () => ({
  uploadComposerAttachment,
}));

const png = (name = 'a.png'): File => {
  return new File(['x'], name, { type: 'image/png' });
};

describe('useComposerAttachments', () => {
  let counter = 0;
  const revoke = vi.fn();

  beforeEach(() => {
    counter = 0;
    uploadComposerAttachment.mockReset();
    revoke.mockReset();
    vi.stubGlobal('URL', {
      createObjectURL: () => {
        counter += 1;
        return `blob:${counter}`;
      },
      revokeObjectURL: revoke,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('uploads an added file: uploading first, then ready with the server id', async () => {
    uploadComposerAttachment.mockResolvedValue({ id: 'att-1', ok: true });
    const { result } = renderHook(() => useComposerAttachments());

    act(() => result.current.addFiles([png()]));

    expect(result.current.entries[0]).toMatchObject({
      name: 'a.png',
      previewUrl: 'blob:1',
      status: 'uploading',
    });
    expect(result.current.hasUploading).toBe(true);
    expect(result.current.attachmentIds).toEqual([]);

    await waitFor(() => expect(result.current.hasUploading).toBe(false));

    expect(result.current.entries[0]?.status).toBe('ready');
    expect(result.current.attachmentIds).toEqual(['att-1']);
  });

  test.each([
    ['too large', 'Image is too large (10 MB max).'],
    ['wrong format', 'Only PNG, JPEG, GIF or WebP images can be attached.'],
  ])(
    'keeps a %s failure as an error chip with its message',
    async (_name, error) => {
      uploadComposerAttachment.mockResolvedValue({ error, ok: false });
      const { result } = renderHook(() => useComposerAttachments());

      act(() => result.current.addFiles([png()]));
      await waitFor(() => expect(result.current.hasUploading).toBe(false));

      expect(result.current.entries[0]).toMatchObject({
        error,
        status: 'error',
      });
      expect(result.current.attachmentIds).toEqual([]);
    },
  );

  test('remove drops the chip and revokes its preview URL', async () => {
    uploadComposerAttachment.mockResolvedValue({ id: 'att-1', ok: true });
    const { result } = renderHook(() => useComposerAttachments());

    act(() => result.current.addFiles([png()]));
    await waitFor(() => expect(result.current.hasUploading).toBe(false));
    act(() => result.current.remove(result.current.entries[0]?.localId ?? ''));

    expect(result.current.entries).toEqual([]);
    expect(revoke).toHaveBeenCalledWith('blob:1');
  });

  test('an upload that finishes after its chip was removed is ignored', async () => {
    let finish: (value: { id: string; ok: true }) => void = () => {};
    uploadComposerAttachment.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const { result } = renderHook(() => useComposerAttachments());

    act(() => result.current.addFiles([png()]));
    act(() => result.current.remove(result.current.entries[0]?.localId ?? ''));
    await act(async () => {
      finish({ id: 'late', ok: true });
    });

    expect(result.current.entries).toEqual([]);
    expect(result.current.attachmentIds).toEqual([]);
  });

  test('clear empties the list and revokes every preview URL', async () => {
    uploadComposerAttachment.mockResolvedValue({ id: 'att-1', ok: true });
    const { result } = renderHook(() => useComposerAttachments());

    act(() => result.current.addFiles([png('a.png'), png('b.png')]));
    await waitFor(() => expect(result.current.hasUploading).toBe(false));
    act(() => result.current.clear());

    expect(result.current.entries).toEqual([]);
    expect(revoke).toHaveBeenCalledWith('blob:1');
    expect(revoke).toHaveBeenCalledWith('blob:2');
  });

  test('revokes live preview URLs on unmount', async () => {
    uploadComposerAttachment.mockResolvedValue({ id: 'att-1', ok: true });
    const { result, unmount } = renderHook(() => useComposerAttachments());

    act(() => result.current.addFiles([png()]));
    await waitFor(() => expect(result.current.hasUploading).toBe(false));
    unmount();

    expect(revoke).toHaveBeenCalledWith('blob:1');
  });

  test('files past the 8-image limit become error chips and are not uploaded', () => {
    uploadComposerAttachment.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useComposerAttachments());
    const files = Array.from({ length: 9 }, (_, index) => png(`${index}.png`));

    act(() => result.current.addFiles(files));

    expect(uploadComposerAttachment).toHaveBeenCalledTimes(8);
    expect(result.current.entries[8]).toMatchObject({
      error: 'Up to 8 images per message.',
      status: 'error',
    });
  });
});
