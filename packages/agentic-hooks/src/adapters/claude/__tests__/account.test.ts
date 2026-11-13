import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  resolveClaudeTokenUsageAccount,
  toTokenUsageAccount,
} from '../account.ts';

/** A stub `claude` that prints `stdout` for `auth status --json`. */
const writeStub = (dir: string, stdout: string): string => {
  const file = path.join(dir, 'claude');
  fs.writeFileSync(file, `#!/bin/sh\ncat <<'JSON'\n${stdout}\nJSON\n`, {
    mode: 0o755,
  });
  return file;
};

describe('toTokenUsageAccount', () => {
  it('maps an identified account to the snake_case record field', () => {
    expect(
      toTokenUsageAccount({
        credentialKind: 'subscription',
        email: 'dev@example.com',
        externalAccountId: 'org-1:dev@example.com',
        kind: 'identified',
        orgId: 'org-1',
        orgName: 'Example',
        plan: 'team',
        provider: 'claude',
      }),
    ).toEqual({
      credential_kind: 'subscription',
      email: 'dev@example.com',
      external_account_id: 'org-1:dev@example.com',
      org_id: 'org-1',
      org_name: 'Example',
      plan: 'team',
    });
  });
});

describe('resolveClaudeTokenUsageAccount', () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-account-'));
  });

  afterEach(() => {
    fs.rmSync(dir, { force: true, recursive: true });
  });

  describe('when logged in with a subscription', () => {
    it('returns the account the CLI reports', async () => {
      const binary = writeStub(
        dir,
        JSON.stringify({
          authMethod: 'claude.ai',
          email: 'dev@example.com',
          loggedIn: true,
          orgId: 'org-1',
          orgName: 'Example',
          subscriptionType: 'team',
        }),
      );

      await expect(
        resolveClaudeTokenUsageAccount({
          HOME: dir,
          OPENTHROTTLE_CLAUDE_BIN: binary,
          PATH: process.env.PATH,
        }),
      ).resolves.toMatchObject({
        external_account_id: 'org-1:dev@example.com',
        plan: 'team',
      });
    });
  });

  describe('when logged out', () => {
    it('returns null', async () => {
      const binary = writeStub(dir, JSON.stringify({ loggedIn: false }));

      await expect(
        resolveClaudeTokenUsageAccount({
          HOME: dir,
          OPENTHROTTLE_CLAUDE_BIN: binary,
          PATH: process.env.PATH,
        }),
      ).resolves.toBeNull();
    });
  });

  describe('when the binary does not exist', () => {
    it('returns null', async () => {
      await expect(
        resolveClaudeTokenUsageAccount({
          HOME: dir,
          OPENTHROTTLE_CLAUDE_BIN: path.join(dir, 'missing'),
          PATH: process.env.PATH,
        }),
      ).resolves.toBeNull();
    });
  });
});
