/**
 * @description Shared helpers for MCP tool handlers that return {@link GenericResult}.
 */

import type { GenericResult } from '../types/index.js';

/**
 * @description Runs an async thunk and normalizes success/throw into a {@link GenericResult}.
 * Use for handlers that fetch data and return { content, structuredContent } or { content, isError }.
 * @param toolName - Prefix for error messages (e.g. "create_note").
 * @param run - Async function that returns { text, structuredContent } on success, or null for "no result" error.
 * @returns GenericResult; throws are caught and returned as isError.
 */
export async function runTool<T extends Record<string, unknown>>(
  toolName: string,
  run: () => Promise<{ text: string; structuredContent: T } | null>,
): Promise<GenericResult<T>> {
  try {
    const result = await run();

    if (result === null) {
      const text = `${toolName} returned no result`;
      return {
        content: [{ text, type: 'text' as const }],
        isError: true,
      };
    }

    return {
      content: [{ text: result.text, type: 'text' as const }],
      structuredContent: result.structuredContent,
    };
  } catch (error: unknown) {
    const isError = error instanceof Error;
    const message = isError ? error.message : String(error);
    const text = `${toolName} failed: ${message}`;

    return {
      content: [{ text, type: 'text' as const }],
      isError: true,
    };
  }
}
