// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { getDefaultGithubRepo } from './github-default-repo';

describe('getDefaultGithubRepo', () => {
  let originalOwner: string | undefined;
  let originalRepo: string | undefined;

  beforeEach(() => {
    originalOwner = process.env.OPENTHROTTLE_GITHUB_OWNER;
    originalRepo = process.env.OPENTHROTTLE_GITHUB_REPO;
    delete process.env.OPENTHROTTLE_GITHUB_OWNER;
    delete process.env.OPENTHROTTLE_GITHUB_REPO;
  });

  afterEach(() => {
    if (originalOwner === undefined) {
      delete process.env.OPENTHROTTLE_GITHUB_OWNER;
    } else {
      process.env.OPENTHROTTLE_GITHUB_OWNER = originalOwner;
    }
    if (originalRepo === undefined) {
      delete process.env.OPENTHROTTLE_GITHUB_REPO;
    } else {
      process.env.OPENTHROTTLE_GITHUB_REPO = originalRepo;
    }
  });

  test('falls back to openthrottle/monorepo when env is unset', () => {
    expect(getDefaultGithubRepo()).toEqual({
      owner: 'openthrottle',
      repo: 'monorepo',
    });
  });

  test('honors the env overrides when present', () => {
    process.env.OPENTHROTTLE_GITHUB_OWNER = 'acme';
    process.env.OPENTHROTTLE_GITHUB_REPO = 'widgets';

    expect(getDefaultGithubRepo()).toEqual({ owner: 'acme', repo: 'widgets' });
  });
});
