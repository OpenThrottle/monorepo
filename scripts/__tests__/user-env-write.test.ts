import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../utils/git.ts', () => ({
  isLinkedWorktree: vi.fn(() => false),
}));

import { runUserEnvWrite } from '../user-env-write.ts';
import { isLinkedWorktree } from '../utils/git.ts';

const isLinkedWorktreeMock = vi.mocked(isLinkedWorktree);

describe('user-env:write', () => {
  let configDir: string;

  const readFile = (): string => {
    return fs.readFileSync(path.join(configDir, '.env'), 'utf8');
  };

  beforeEach(() => {
    configDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ot-user-env-write-'));
    isLinkedWorktreeMock.mockReturnValue(false);
  });

  afterEach(() => {
    fs.rmSync(configDir, { force: true, recursive: true });
  });

  it('writes the given URL and token as managed lines at mode 600', () => {
    const code = runUserEnvWrite(
      ['--', '--url', 'https://ot.example.com/graphql', '--token', 'ot_sa_a_b'],
      { OPENTHROTTLE_USER_CONFIG_DIR: configDir },
    );
    expect(code).toBe(0);
    expect(readFile()).toContain('OPENTHROTTLE_GRAPHQL_URL=https://ot.example.com/graphql'); // prettier-ignore
    expect(readFile()).toContain('OPENTHROTTLE_MCP_AUTH_TOKEN=ot_sa_a_b');
    const mode = fs.statSync(path.join(configDir, '.env')).mode & 0o777;
    expect(mode).toBe(0o600);
  });

  it('takes the token from the environment when --token is absent', () => {
    const code = runUserEnvWrite(['--url', 'https://ot.example.com/graphql'], {
      OPENTHROTTLE_MCP_AUTH_TOKEN: 'ot_sa_env_tok',
      OPENTHROTTLE_USER_CONFIG_DIR: configDir,
    });
    expect(code).toBe(0);
    expect(readFile()).toContain('OPENTHROTTLE_MCP_AUTH_TOKEN=ot_sa_env_tok');
  });

  it('never touches a key the user set', () => {
    fs.writeFileSync(
      path.join(configDir, '.env'),
      'OPENTHROTTLE_GRAPHQL_URL=http://mine:1/graphql\n',
    );
    runUserEnvWrite(
      ['--url', 'https://ot.example.com/graphql', '--token', 't'],
      {
        OPENTHROTTLE_USER_CONFIG_DIR: configDir,
      },
    );
    expect(readFile()).toContain('OPENTHROTTLE_GRAPHQL_URL=http://mine:1/graphql'); // prettier-ignore
    expect(readFile()).not.toContain('ot.example.com');
  });

  it('fails without a token and writes nothing', () => {
    const code = runUserEnvWrite([], {
      OPENTHROTTLE_USER_CONFIG_DIR: configDir,
    });
    expect(code).toBe(1);
    expect(fs.existsSync(path.join(configDir, '.env'))).toBe(false);
  });

  describe('in a linked worktree', () => {
    it('refuses the local default', () => {
      isLinkedWorktreeMock.mockReturnValue(true);
      const code = runUserEnvWrite(['--token', 't'], {
        OPENTHROTTLE_USER_CONFIG_DIR: configDir,
      });
      expect(code).toBe(1);
      expect(fs.existsSync(path.join(configDir, '.env'))).toBe(false);
    });

    it('still honours an explicit --url', () => {
      isLinkedWorktreeMock.mockReturnValue(true);
      const code = runUserEnvWrite(
        ['--url', 'https://ot.example.com/graphql', '--token', 't'],
        { OPENTHROTTLE_USER_CONFIG_DIR: configDir },
      );
      expect(code).toBe(0);
    });
  });

  it('rejects an unknown flag', () => {
    expect(() => {
      return runUserEnvWrite(['--nope'], {});
    }).toThrow();
  });
});
