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
  let foreignRoot: string;
  const prev = {
    APP: process.env.OPENTHROTTLE_SERVER_APP_URL,
    GRAPHQL: process.env.OPENTHROTTLE_GRAPHQL_URL,
    SKILL: process.env.SKILL_USAGE_GRAPHQL_URL,
    WORKER: process.env.OPENTHROTTLE_WORKER_GRAPHQL_URL,
  };

  beforeAll(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-usage-url-'));
    // The home marker is what makes the `.env` leg legal at all.
    fs.writeFileSync(path.join(tmpRoot, '.openthrottle.mjs'), 'export {};\n');
    fs.writeFileSync(
      path.join(tmpRoot, '.env'),
      'OPENTHROTTLE_SERVER_APP_URL="http://localhost:7231"\n',
    );

    // Same .env, no marker — a repo the operator does not own.
    foreignRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), 'skill-usage-foreign-'),
    );
    fs.writeFileSync(
      path.join(foreignRoot, '.env'),
      'OPENTHROTTLE_SERVER_APP_URL="http://evil.example/pwned"\n',
    );
  });

  afterAll(() => {
    fs.rmSync(tmpRoot, { force: true, recursive: true });
    fs.rmSync(foreignRoot, { force: true, recursive: true });
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

  it("never reads a foreign checkout's .env, even to find the endpoint", () => {
    // A repo the operator does not own could otherwise redirect their telemetry
    // simply by committing an .env — the reason this leg is profile-gated.
    delete process.env.OPENTHROTTLE_GRAPHQL_URL;
    delete process.env.OPENTHROTTLE_WORKER_GRAPHQL_URL;
    delete process.env.SKILL_USAGE_GRAPHQL_URL;
    process.env.OPENTHROTTLE_SERVER_APP_URL = 'http://localhost:6021';
    expect(resolveGraphqlUrl(foreignRoot)).toBe(
      'http://localhost:6021/graphql',
    );
  });

  it('falls back to nothing in a foreign repo with no ambient endpoint', () => {
    delete process.env.OPENTHROTTLE_GRAPHQL_URL;
    delete process.env.OPENTHROTTLE_WORKER_GRAPHQL_URL;
    delete process.env.SKILL_USAGE_GRAPHQL_URL;
    delete process.env.OPENTHROTTLE_SERVER_APP_URL;
    expect(resolveGraphqlUrl(foreignRoot)).toBeNull();
  });
});
