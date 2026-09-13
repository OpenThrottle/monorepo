/**
 * Unit tests for env resolution (`config/env`).
 *
 * Resolution is by LOCATION, and each location is exercised in isolation as
 * well as against the one below it:
 *
 *   1. `<repoRoot>/.env` — OpenThrottle checkouts only
 *   2. `process.env`
 *   3. `~/.openthrottle/.env`
 *
 * `$HOME` is redirected at a tmpdir for the user-global layer; `os.homedir()`
 * follows it on POSIX and the module resolves the directory per call.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  describeTelemetryConfig,
  isOpenThrottleCheckout,
  readRepoEnvFile,
  resolveAuthToken,
  resolveGraphqlUrl,
  TELEMETRY_CONFIG_SOURCES,
} from '../../index.ts';

const OT_ENV_KEYS = [
  'OPENTHROTTLE_GRAPHQL_URL',
  'OPENTHROTTLE_MCP_AUTH_TOKEN',
  'OPENTHROTTLE_SERVER_APP_URL',
  'OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN',
  'OPENTHROTTLE_WORKER_GRAPHQL_URL',
] as const;

/** Give `root` the marker that identifies an OpenThrottle checkout. */
const makeOpenThrottleCheckout = (root: string): void => {
  const dir = path.join(root, 'applications', 'openthrottle-server');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify({ name: 'openthrottle-server' }),
  );
};

const writeEnv = (dir: string, body: string): void => {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, '.env'), body);
};

describe('config/env resolution by location', () => {
  let tmpRoot: string;
  let otRepo: string;
  let foreignRepo: string;
  let fakeHome: string;
  let prevHome: string | undefined;
  const prevEnv = new Map<string, string | undefined>();

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ot-hooks-env-'));
    otRepo = path.join(tmpRoot, 'monorepo');
    foreignRepo = path.join(tmpRoot, 'native-apps');
    fakeHome = path.join(tmpRoot, 'home');
    makeOpenThrottleCheckout(otRepo);
    fs.mkdirSync(foreignRepo, { recursive: true });
    fs.mkdirSync(fakeHome, { recursive: true });

    prevHome = process.env.HOME;
    process.env.HOME = fakeHome;
    for (const key of OT_ENV_KEYS) {
      prevEnv.set(key, process.env[key]);
      delete process.env[key];
    }
  });

  afterEach(() => {
    fs.rmSync(tmpRoot, { force: true, recursive: true });
    if (prevHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = prevHome;
    }
    for (const [key, value] of prevEnv) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    prevEnv.clear();
  });

  describe('isOpenThrottleCheckout', () => {
    it('matches a checkout carrying the openthrottle-server marker', () => {
      expect(isOpenThrottleCheckout(otRepo)).toBe(true);
    });

    it('fails closed for a foreign repo, a missing path and undefined', () => {
      expect(isOpenThrottleCheckout(foreignRepo)).toBe(false);
      expect(isOpenThrottleCheckout(path.join(tmpRoot, 'nope'))).toBe(false);
      expect(isOpenThrottleCheckout(undefined)).toBe(false);
    });
  });

  describe('the repo layer is gated on the checkout being OpenThrottle', () => {
    it('never opens a foreign repo .env', () => {
      writeEnv(
        foreignRepo,
        'OPENTHROTTLE_GRAPHQL_URL=http://decoy:1/graphql\n',
      );
      expect(readRepoEnvFile(foreignRepo)).toEqual({});
      expect(resolveGraphqlUrl(foreignRepo)).toBeNull();
    });

    it('reads an OpenThrottle checkout .env', () => {
      writeEnv(otRepo, 'OPENTHROTTLE_SERVER_APP_URL="http://localhost:7231"\n');
      expect(resolveGraphqlUrl(otRepo)).toBe('http://localhost:7231/graphql');
    });
  });

  describe('precedence', () => {
    it('this worktree .env beats a stale ambient shell', () => {
      writeEnv(otRepo, 'OPENTHROTTLE_SERVER_APP_URL="http://localhost:7231"\n');
      process.env.OPENTHROTTLE_SERVER_APP_URL = 'http://localhost:6021';
      expect(resolveGraphqlUrl(otRepo)).toBe('http://localhost:7231/graphql');
    });

    it('the ambient shell beats the user-global file', () => {
      writeEnv(
        fakeHome + '/.openthrottle',
        'OPENTHROTTLE_GRAPHQL_URL=http://home:3/graphql\n',
      );
      process.env.OPENTHROTTLE_GRAPHQL_URL = 'http://shell:2/graphql';
      expect(resolveGraphqlUrl(otRepo)).toBe('http://shell:2/graphql');
    });

    it('resolves from the user-global file alone, with no repo .env and an empty shell', () => {
      writeEnv(
        path.join(fakeHome, '.openthrottle'),
        'OPENTHROTTLE_GRAPHQL_URL=http://home:3/graphql\nOPENTHROTTLE_MCP_AUTH_TOKEN=home-token\n',
      );
      expect(resolveGraphqlUrl(foreignRepo)).toBe('http://home:3/graphql');
      expect(resolveAuthToken(foreignRepo)).toBe('home-token');
    });

    it('asks each layer for a complete answer before falling through', () => {
      // The repo sets only APP_URL; the user-global file sets GRAPHQL_URL.
      // The repo layer answers first and is not married to the lower layer.
      writeEnv(otRepo, 'OPENTHROTTLE_SERVER_APP_URL="http://localhost:7231"\n');
      writeEnv(
        path.join(fakeHome, '.openthrottle'),
        'OPENTHROTTLE_GRAPHQL_URL=http://home:3/graphql\n',
      );
      expect(resolveGraphqlUrl(otRepo)).toBe('http://localhost:7231/graphql');
    });

    it('trailing slashes are stripped at every layer', () => {
      writeEnv(
        path.join(fakeHome, '.openthrottle'),
        'OPENTHROTTLE_GRAPHQL_URL=http://home:3/graphql/\n',
      );
      expect(resolveGraphqlUrl(foreignRepo)).toBe('http://home:3/graphql');
    });
  });

  describe('resolveAuthToken', () => {
    it('prefers the MCP token and falls back to the worker token', () => {
      writeEnv(otRepo, 'OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN=worker\n');
      expect(resolveAuthToken(otRepo)).toBe('worker');
      writeEnv(
        otRepo,
        'OPENTHROTTLE_MCP_AUTH_TOKEN=mcp\nOPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN=worker\n',
      );
      expect(resolveAuthToken(otRepo)).toBe('mcp');
    });
  });
});

describe('describeTelemetryConfig', () => {
  let tmpRoot: string;
  let otRepo: string;
  let foreignRepo: string;
  let fakeHome: string;
  let prevHome: string | undefined;
  const prevEnv = new Map<string, string | undefined>();

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ot-hooks-describe-'));
    otRepo = path.join(tmpRoot, 'monorepo');
    foreignRepo = path.join(tmpRoot, 'native-apps');
    fakeHome = path.join(tmpRoot, 'home');
    makeOpenThrottleCheckout(otRepo);
    fs.mkdirSync(foreignRepo, { recursive: true });
    fs.mkdirSync(fakeHome, { recursive: true });

    prevHome = process.env.HOME;
    process.env.HOME = fakeHome;
    for (const key of [...OT_ENV_KEYS, 'OPENTHROTTLE_TELEMETRY_OFFLINE']) {
      prevEnv.set(key, process.env[key]);
      delete process.env[key];
    }
  });

  afterEach(() => {
    fs.rmSync(tmpRoot, { force: true, recursive: true });
    if (prevHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = prevHome;
    }
    for (const [key, value] of prevEnv) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    prevEnv.clear();
  });

  it('reports no endpoint for a foreign repo with nothing configured', () => {
    const described = describeTelemetryConfig(foreignRepo);
    expect(described.endpointConfigured).toBe(false);
    expect(described.endpointSource).toBe(TELEMETRY_CONFIG_SOURCES.NONE);
    expect(described.openThrottleCheckout).toBe(false);
    expect(described.offline).toBe(false);
  });

  it('names the layer that answered — repo, then shell, then user-global', () => {
    writeEnv(
      path.join(fakeHome, '.openthrottle'),
      'OPENTHROTTLE_GRAPHQL_URL=http://home:3/graphql\n',
    );
    expect(describeTelemetryConfig(foreignRepo).endpointSource).toBe(
      TELEMETRY_CONFIG_SOURCES.USER_ENV,
    );

    process.env.OPENTHROTTLE_GRAPHQL_URL = 'http://shell:2/graphql';
    expect(describeTelemetryConfig(foreignRepo).endpointSource).toBe(
      TELEMETRY_CONFIG_SOURCES.PROCESS_ENV,
    );

    writeEnv(otRepo, 'OPENTHROTTLE_GRAPHQL_URL=http://repo:1/graphql\n');
    expect(describeTelemetryConfig(otRepo).endpointSource).toBe(
      TELEMETRY_CONFIG_SOURCES.REPO_ENV,
    );
  });

  it('never exposes the endpoint URL or the auth token', () => {
    writeEnv(
      otRepo,
      'OPENTHROTTLE_GRAPHQL_URL=http://secret-host:1/graphql\nOPENTHROTTLE_MCP_AUTH_TOKEN=super-secret\n',
    );
    const described = describeTelemetryConfig(otRepo);
    expect(described.authTokenConfigured).toBe(true);
    expect(described.endpointConfigured).toBe(true);
    expect(JSON.stringify(described)).not.toContain('secret-host');
    expect(JSON.stringify(described)).not.toContain('super-secret');
  });

  it('can exclude the ambient shell, for a caller in a different process', () => {
    // A server describing a checkout is not the process the agent runs in, so
    // its own environment must not count as configuration the agent will see.
    process.env.OPENTHROTTLE_GRAPHQL_URL = 'http://shell:2/graphql';
    process.env.OPENTHROTTLE_MCP_AUTH_TOKEN = 'shell-token';

    const withShell = describeTelemetryConfig(foreignRepo);
    expect(withShell.endpointConfigured).toBe(true);
    expect(withShell.endpointSource).toBe(TELEMETRY_CONFIG_SOURCES.PROCESS_ENV);

    const withoutShell = describeTelemetryConfig(foreignRepo, {
      includeProcessEnv: false,
    });
    expect(withoutShell.endpointConfigured).toBe(false);
    expect(withoutShell.authTokenConfigured).toBe(false);
    expect(withoutShell.endpointSource).toBe(TELEMETRY_CONFIG_SOURCES.NONE);
  });

  it('still reads both file layers when the shell is excluded', () => {
    writeEnv(
      path.join(fakeHome, '.openthrottle'),
      'OPENTHROTTLE_GRAPHQL_URL=http://home:3/graphql\n',
    );
    process.env.OPENTHROTTLE_GRAPHQL_URL = 'http://shell:2/graphql';

    const described = describeTelemetryConfig(foreignRepo, {
      includeProcessEnv: false,
    });
    expect(described.endpointConfigured).toBe(true);
    expect(described.endpointSource).toBe(TELEMETRY_CONFIG_SOURCES.USER_ENV);
  });

  it('reports the offline flag and the buffer directory', () => {
    process.env.OPENTHROTTLE_TELEMETRY_OFFLINE = '1';
    const described = describeTelemetryConfig(foreignRepo);
    expect(described.offline).toBe(true);
    expect(described.telemetryDir).toBe(
      path.join(fakeHome, '.openthrottle', 'skill-usage'),
    );
  });
});
