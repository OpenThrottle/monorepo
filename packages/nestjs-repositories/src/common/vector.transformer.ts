/**
 * @description ValueTransformer for pgvector vector(1536) columns. Serializes number[] to Postgres vector string format and back.
 * Matches databases/migrations (001, 004, 005).
 */

import type { ValueTransformer } from 'typeorm';

const VECTOR_DIM = 1536;

/**
 * @description Transforms between JS number[] and Postgres vector(1536) string format.
 */
export const vectorTransformer: ValueTransformer = {
  from(value: unknown): number[] | null {
    if (value == null || typeof value !== 'string') return null;

    const trimmed = value.replace(/^\[|\]$/g, '').trim();
    if (!trimmed) return null;

    const parsed = trimmed.split(',').map((s) => Number(s.trim()));

    // Reject malformed vectors loudly rather than feeding NaN / wrong-length
    // data into similarity math. Mirrors the length guard on `to`.
    if (parsed.length !== VECTOR_DIM) return null;
    if (parsed.some((n) => Number.isNaN(n))) return null;

    return parsed;
  },
  to(value: unknown): string | null {
    if (value == null) return null;
    if (!Array.isArray(value)) return null;

    const arr: readonly unknown[] = value;
    if (arr.length !== VECTOR_DIM) return null;

    return `[${arr.join(',')}]`;
  },
};
