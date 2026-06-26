/**
 * @description Tests for `runTool`: success/no-result/throw normalization and error sanitization.
 * Locks in that thrown backend detail is never echoed verbatim to the MCP client.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { SafeToolError } from './errors.ts';
import { runTool } from './tool-result.ts';

describe('runTool', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('when the thunk resolves with a result', () => {
    it('returns content and structuredContent', async () => {
      const result = await runTool<{ value: number }>('demo', async () => ({
        structuredContent: { value: 42 },
        text: 'ok',
      }));

      expect(result).toEqual({
        content: [{ text: 'ok', type: 'text' }],
        structuredContent: { value: 42 },
      });
    });
  });

  describe('when the thunk resolves to null', () => {
    it('returns a no-result error prefixed with the tool name', async () => {
      const result = await runTool('demo', async () => null);

      expect(result).toEqual({
        content: [{ text: 'demo returned no result', type: 'text' }],
        isError: true,
      });
    });
  });

  describe('when the thunk throws a transport error', () => {
    it('sanitizes the message and never leaks backend detail', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined);

      const result = await runTool('demo', async () => {
        throw new Error('connect ECONNREFUSED 127.0.0.1:6020');
      });

      expect(result).toMatchObject({ isError: true });
      const [content] = result.content;
      expect(content.text).toBe(
        'demo failed: Could not reach the OpenThrottle (OT) server. Confirm the server is running and reachable, then retry.',
      );
      expect(content.text).not.toContain('127.0.0.1');
      expect(content.text).not.toContain('ECONNREFUSED');
    });

    it('logs the full detail to stderr (server-side only)', async () => {
      const spy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);
      const error = new Error('connect ECONNREFUSED 127.0.0.1:6020');

      await runTool('demo', async () => {
        throw error;
      });

      expect(spy).toHaveBeenCalledWith(
        '[openthrottle-mcp] demo failed (transport):',
        error,
      );
    });
  });

  describe('when the thunk throws a SafeToolError', () => {
    it('surfaces the author-controlled message verbatim', async () => {
      const result = await runTool('demo', async () => {
        throw new SafeToolError('Plan abc not found');
      });

      expect(result).toMatchObject({
        content: [{ text: 'demo failed: Plan abc not found' }],
        isError: true,
      });
    });
  });
});
