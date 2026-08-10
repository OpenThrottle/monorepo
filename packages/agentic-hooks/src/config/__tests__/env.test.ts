/**
 * Unit tests for env/git resolution (`config/env`). Split out of the original
 * package-wide `lib.test.ts` so each source module owns its own spec.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { resolveGraphqlUrl } from '../../index';

describe('resolveGraphqlUrl', () => {
  let tmpRoot: string;
  const prev = {
    APP: process.env.OPENTHROTTLE_SERVER_APP_URL,
    GRAPHQL: process.env.OPENTHROTTLE_GRAPHQL_URL,
    SKILL: process.env.SKILL_USAGE_GRAPHQL_URL,
    WORKER: process.env.OPENTHROTTLE_WORKER_GRAPHQL_URL,
  };

  beforeAll(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-usage-url-'));
    fs.writeFileSync(
      path.join(tmpRoot, '.env'),
      'OPENTHROTTLE_SERVER_APP_URL="http://localhost:7231"\n',
    );
  });

  afterAll(() => {
    fs.rmSync(tmpRoot, { force: true, recursive: true });
    const restore: Array<[keyof typeof prev, string]> = [
      ['GRAPHQL', 'OPENTHROTTLE_GRAPHQL_URL'],
      ['WORKER', 'OPENTHROTTLE_WORKER_GRAPHQL_URL'],
      ['APP', 'OPENTHROTTLE_SERVER_APP_URL'],
      ['SKILL', 'SKILL_USAGE_GRAPHQL_URL'],
    ];
    for (const [key, envKey] of restore) {
      if (prev[key] === undefined) {
        delete process.env[envKey];
      } else {
        process.env[envKey] = prev[key];
      }
    }
  });

  it('prefers worktree .env APP_URL over stale process.env', () => {
    delete process.env.OPENTHROTTLE_GRAPHQL_URL;
    delete process.env.OPENTHROTTLE_WORKER_GRAPHQL_URL;
    delete process.env.SKILL_USAGE_GRAPHQL_URL;
    process.env.OPENTHROTTLE_SERVER_APP_URL = 'http://localhost:6021';
    expect(resolveGraphqlUrl(tmpRoot)).toBe('http://localhost:7231/graphql');
  });

  it('SKILL_USAGE_GRAPHQL_URL overrides .env', () => {
    process.env.SKILL_USAGE_GRAPHQL_URL = 'http://localhost:9/graphql';
    expect(resolveGraphqlUrl(tmpRoot)).toBe('http://localhost:9/graphql');
  });
});
