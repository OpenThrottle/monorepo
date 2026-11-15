/**
 * Unit tests for the `~/.openthrottle/.env` fill-in writer. Each test points the
 * writer at its own tmpdir, so the real home directory is never touched; the
 * round trip back through `readEnvFile` proves the reader sees what was written.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  ensureUserEnvEntries,
  readEnvFile,
  USER_ENV_CHANGES,
  USER_ENV_MANAGED_MARKER,
} from '../../index.ts';

const URL = 'http://127.0.0.1:6021/graphql';
const TOKEN = 'ot_sa_new_secret';
const ENTRIES = { authToken: TOKEN, graphqlUrl: URL } as const;

describe('ensureUserEnvEntries', () => {
  let configDir: string;
  let envPath: string;

  beforeEach(() => {
    configDir = path.join(
      fs.mkdtempSync(path.join(os.tmpdir(), 'ot-user-env-')),
      '.openthrottle',
    );
    envPath = path.join(configDir, '.env');
  });

  afterEach(() => {
    fs.chmodSync(path.dirname(configDir), 0o700);
    fs.rmSync(path.dirname(configDir), { force: true, recursive: true });
  });

  const write = (body: string): void => {
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(envPath, body);
  };

  const read = (): string => {
    return fs.readFileSync(envPath, 'utf8');
  };

  describe('when no file exists', () => {
    it('creates the directory and both managed lines at mode 600', () => {
      const result = ensureUserEnvEntries(ENTRIES, configDir);

      expect(result).toMatchObject({
        changed: true,
        endpoint: USER_ENV_CHANGES.ADDED,
        ok: true,
        token: USER_ENV_CHANGES.ADDED,
      });
      expect(read()).toBe(
        [
          USER_ENV_MANAGED_MARKER,
          `OPENTHROTTLE_GRAPHQL_URL=${URL}`,
          USER_ENV_MANAGED_MARKER,
          `OPENTHROTTLE_MCP_AUTH_TOKEN=${TOKEN}`,
          '',
        ].join('\n'),
      );
      expect(fs.statSync(envPath).mode & 0o777).toBe(0o600);
      expect(readEnvFile(envPath)).toEqual({
        OPENTHROTTLE_GRAPHQL_URL: URL,
        OPENTHROTTLE_MCP_AUTH_TOKEN: TOKEN,
      });
    });

    it('is a no-op on the second run', () => {
      ensureUserEnvEntries(ENTRIES, configDir);
      const first = read();

      const result = ensureUserEnvEntries(ENTRIES, configDir);

      expect(result).toMatchObject({
        changed: false,
        endpoint: USER_ENV_CHANGES.UNCHANGED,
        token: USER_ENV_CHANGES.UNCHANGED,
      });
      expect(read()).toBe(first);
    });
  });

  describe('when the user set the endpoint', () => {
    it('leaves a user-set URL untouched and fills in only the token', () => {
      write('OPENTHROTTLE_GRAPHQL_URL=https://ot.example.com/graphql\n');

      const result = ensureUserEnvEntries(ENTRIES, configDir);

      expect(result).toMatchObject({
        endpoint: USER_ENV_CHANGES.USER_SET,
        token: USER_ENV_CHANGES.ADDED,
      });
      expect(readEnvFile(envPath)).toEqual({
        OPENTHROTTLE_GRAPHQL_URL: 'https://ot.example.com/graphql',
        OPENTHROTTLE_MCP_AUTH_TOKEN: TOKEN,
      });
    });

    it('treats an alias key as user-set, so it is never outranked', () => {
      write('OPENTHROTTLE_SERVER_APP_URL=http://localhost:6021\n');

      const result = ensureUserEnvEntries(ENTRIES, configDir);

      expect(result).toMatchObject({ endpoint: USER_ENV_CHANGES.USER_SET });
      expect(readEnvFile(envPath).OPENTHROTTLE_GRAPHQL_URL).toBeUndefined();
    });

    it('changes nothing when the user set both concerns', () => {
      const body = [
        'OPENTHROTTLE_GRAPHQL_URL=https://ot.example.com/graphql',
        'OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN=mine',
      ].join('\n');
      write(body);

      const result = ensureUserEnvEntries(ENTRIES, configDir);

      expect(result).toMatchObject({ changed: false, ok: true });
      expect(read()).toBe(body);
    });
  });

  describe('when a managed line is stale', () => {
    it('refreshes the managed token in place', () => {
      write(
        [
          USER_ENV_MANAGED_MARKER,
          `OPENTHROTTLE_GRAPHQL_URL=${URL}`,
          USER_ENV_MANAGED_MARKER,
          'OPENTHROTTLE_MCP_AUTH_TOKEN=ot_sa_rotated_away',
          '',
        ].join('\n'),
      );

      const result = ensureUserEnvEntries(ENTRIES, configDir);

      expect(result).toMatchObject({
        changed: true,
        endpoint: USER_ENV_CHANGES.UNCHANGED,
        token: USER_ENV_CHANGES.REFRESHED,
      });
      expect(readEnvFile(envPath).OPENTHROTTLE_MCP_AUTH_TOKEN).toBe(TOKEN);
      expect(read().split(USER_ENV_MANAGED_MARKER)).toHaveLength(3);
    });
  });

  describe('when the file holds unrelated content', () => {
    it('preserves other keys, comments and blank lines byte-for-byte', () => {
      const original = [
        '# my settings',
        'OPENTHROTTLE_SKILL_USAGE_DISABLED=0',
        '',
        'OTHER="quoted value"',
      ].join('\n');
      write(original);

      ensureUserEnvEntries(ENTRIES, configDir);

      expect(read().startsWith(`${original}\n`)).toBe(true);
      expect(readEnvFile(envPath)).toMatchObject({
        OPENTHROTTLE_SKILL_USAGE_DISABLED: '0',
        OTHER: 'quoted value',
      });
    });

    it('writes through a symlink instead of replacing it', () => {
      const realPath = path.join(path.dirname(configDir), 'dotfiles.env');
      fs.writeFileSync(realPath, 'KEEP=1\n');
      fs.mkdirSync(configDir, { recursive: true });
      fs.symlinkSync(realPath, envPath);

      ensureUserEnvEntries(ENTRIES, configDir);

      expect(fs.lstatSync(envPath).isSymbolicLink()).toBe(true);
      expect(readEnvFile(realPath)).toMatchObject({
        KEEP: '1',
        OPENTHROTTLE_MCP_AUTH_TOKEN: TOKEN,
      });
    });
  });

  describe('when the write cannot happen', () => {
    it('returns a failure instead of throwing for an unwritable directory', () => {
      fs.chmodSync(path.dirname(configDir), 0o500);

      const result = ensureUserEnvEntries(ENTRIES, configDir);

      expect(result.ok).toBe(false);
      expect(fs.existsSync(envPath)).toBe(false);
    });

    it('rejects a multi-line value without writing', () => {
      const result = ensureUserEnvEntries(
        { authToken: 'a\nEVIL=1', graphqlUrl: URL },
        configDir,
      );

      expect(result.ok).toBe(false);
      expect(fs.existsSync(envPath)).toBe(false);
    });
  });
});
