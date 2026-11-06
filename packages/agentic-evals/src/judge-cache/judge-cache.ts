import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { GraderVerdict } from '../types/index.ts';

/**
 * @description What a judge verdict depends on. Change any field and it is a different call.
 * @public
 */
export interface JudgeCacheKeyInput {
  readonly graderVersion: string;
  readonly input: string;
  readonly judgeModel: string;
  readonly prompt: string;
}

/**
 * @description A verdict cache for judge calls only. Agent trials are never cached: their
 * randomness is what an eval measures. `error` verdicts are never stored, so a retry re-asks.
 * @public
 */
export interface JudgeCache {
  readonly get: (key: JudgeCacheKeyInput) => Promise<GraderVerdict | undefined>;
  readonly set: (
    key: JudgeCacheKeyInput,
    verdict: GraderVerdict,
  ) => Promise<void>;
}

/**
 * @description Options for {@link createJudgeCache}: `dir` holds one JSON file per verdict.
 * @public
 */
export interface CreateJudgeCacheOptions {
  readonly dir: string;
}

const sha256 = (value: string): string => {
  return createHash('sha256').update(value).digest('hex');
};

/**
 * @description The cache key: sha256 over the prompt, input, grader version and judge model. The four
 * parts go through a JSON array, so no two distinct tuples collide by plain concatenation.
 * @public
 */
export const judgeCacheKey = (key: JudgeCacheKeyInput): string => {
  return sha256(
    JSON.stringify([key.prompt, key.input, key.graderVersion, key.judgeModel]),
  );
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const toCachedVerdict = (value: unknown): GraderVerdict | undefined => {
  if (!isRecord(value) || typeof value.evidence !== 'string') {
    return undefined;
  }

  if (value.kind === 'pass') {
    return { evidence: value.evidence, kind: 'pass' };
  }

  return value.kind === 'fail'
    ? { evidence: value.evidence, kind: 'fail' }
    : undefined;
};

/**
 * @description A file-backed {@link JudgeCache}: `<dir>/<sha256>.json`. A missing, unreadable or
 * malformed file is a miss.
 * @public
 */
export const createJudgeCache = (
  options: CreateJudgeCacheOptions,
): JudgeCache => {
  const fileFor = (key: JudgeCacheKeyInput): string => {
    return join(options.dir, `${judgeCacheKey(key)}.json`);
  };

  return {
    get: async (key) => {
      try {
        return toCachedVerdict(
          JSON.parse(await readFile(fileFor(key), 'utf8')),
        );
      } catch {
        return undefined;
      }
    },
    set: async (key, verdict) => {
      if (verdict.kind === 'error') {
        return;
      }

      await mkdir(options.dir, { recursive: true });
      await writeFile(fileFor(key), JSON.stringify(verdict), 'utf8');
    },
  };
};
