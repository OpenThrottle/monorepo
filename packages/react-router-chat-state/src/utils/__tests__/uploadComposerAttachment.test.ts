import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { uploadComposerAttachment } from '../uploadComposerAttachment';

const mockFetch = vi.fn();
const file = new File(['x'], 'a.png', { type: 'image/png' });

describe('uploadComposerAttachment', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('posts the file as multipart field `file` and returns the id', async () => {
    mockFetch.mockResolvedValue(
      Response.json({ id: 'att-1' }, { status: 201 }),
    );

    const result = await uploadComposerAttachment(file);

    const [url, init] = mockFetch.mock.calls[0] ?? [];
    expect(url).toBe('/resources/attachments');
    expect(init.method).toBe('POST');
    expect(init.body.get('file')).toBeInstanceOf(File);
    expect(result).toEqual({ id: 'att-1', ok: true });
  });

  test.each([
    [413, 'Image is too large (10 MB max).'],
    [415, 'Only PNG, JPEG, GIF or WebP images can be attached.'],
    [401, 'Sign in again to attach images.'],
    [500, 'Upload failed. Try again.'],
  ])('maps a %i response to its message', async (status, error) => {
    mockFetch.mockResolvedValue(Response.json({}, { status }));

    expect(await uploadComposerAttachment(file)).toEqual({ error, ok: false });
  });

  test('treats a network failure as a failed upload', async () => {
    mockFetch.mockRejectedValue(new TypeError('offline'));

    expect(await uploadComposerAttachment(file)).toEqual({
      error: 'Upload failed. Try again.',
      ok: false,
    });
  });

  test('treats a body without an id as a failed upload', async () => {
    mockFetch.mockResolvedValue(Response.json({ nope: true }));

    expect(await uploadComposerAttachment(file)).toMatchObject({ ok: false });
  });
});
