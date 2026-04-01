/**
 * @description ValueTransformer for pgvector vector(1536) columns. Serializes number[] to Postgres vector string format and back.
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
    return trimmed.split(',').map((s) => Number(s.trim()));
  },
  to(value: unknown): string | null {
    if (value == null) return null;
    if (!Array.isArray(value)) return null;
    const arr = value as number[];
    if (arr.length !== VECTOR_DIM) return null;
    return `[${arr.join(',')}]`;
  },
};
