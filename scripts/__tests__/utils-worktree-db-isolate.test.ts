import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'; // prettier-ignore
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { readEnvFile } from '../utils/env.ts';
import type { WorktreeComposeDb } from '../utils/worktree-compose.ts';
import { worktreeComposeOverride } from '../utils/worktree-compose.ts';
import {
  composeProjectFor,
  configureIsolatedDb,
  ISOLATED_SEED_STEPS,
  isolateEnvContents,
  SEED_RECOVERY,
  wantsOwnDb,
  withUrlPort,
} from '../utils/worktree-db-isolate.ts';

describe('ISOLATED_SEED_STEPS', () => {
  it('migrates, then bootstraps the default user, then the service-account credentials', () => {
    expect(ISOLATED_SEED_STEPS.map(([, script]) => script)).toEqual([
      'database:migrate',
      'database:bootstrap-default-user',
      'database:bootstrap-service-accounts',
    ]);
  });

  it('prints every step, after database:start, as the recovery commands', () => {
    expect(SEED_RECOVERY).toBe(
      'pnpm run database:start && pnpm run database:migrate && pnpm run database:bootstrap-default-user && pnpm run database:bootstrap-service-accounts',
    );
  });
});

const PORTS = { postgres: 7098, redis: 7099 } as const;
const SERVER_ENV = 'applications/openthrottle-server/.env';

const ROOT_ENV = [
  'POSTGRES_HOST="host.docker.internal"',
  'POSTGRES_PORT="6010"',
  'REDIS_PORT="6011"',
  'OT_WORKTREE_DB=shared',
  'COMPOSE_PROJECT_NAME=openthrottle-probe',
  '',
].join('\n');

const SERVER_ENV_CONTENTS = [
  'POSTGRES_PORT="6010"',
  'POSTGRES_URL="postgresql://u:p%40ss@localhost:6010/openthrottle" # ✏️ CHANGE THIS ✏️',
  'REDIS_PORT="6011"',
  'OT_WORKTREE_DB=shared',
  '',
].join('\n');

/** A provisioned-looking shared worktree named `probe`. */
const makeWorktree = (): string => {
  const parent = mkdtempSync(join(tmpdir(), 'ot-isolate-'));
  const root = join(parent, 'probe');

  mkdirSync(join(root, 'applications/openthrottle-server'), {
    recursive: true,
  });
  mkdirSync(join(root, 'applications/openthrottle-developer'), {
    recursive: true,
  });
  writeFileSync(join(root, '.env'), ROOT_ENV);
  writeFileSync(join(root, SERVER_ENV), SERVER_ENV_CONTENTS);
  writeFileSync(join(root, 'applications/openthrottle-developer/.env'), 'APP_NAME=dev\n'); // prettier-ignore
  writeFileSync(join(root, '.worktree-ports'), 'OT_PORT_BASE=7090\n');
  writeFileSync(join(root, 'docker-compose.worktree.yml'), worktreeComposeOverride('shared')); // prettier-ignore

  return root;
};

describe('withUrlPort', () => {
  it('rewrites only the port of the authority', () => {
    expect(withUrlPort('postgresql://u:p%40ss@localhost:6010/openthrottle', 7098)).toBe('postgresql://u:p%40ss@localhost:7098/openthrottle'); // prettier-ignore
    expect(withUrlPort('redis://localhost:6011', 7099)).toBe('redis://localhost:7099'); // prettier-ignore
  });

  it('adds a port when the URL has none', () => {
    expect(withUrlPort('postgresql://u:p@db/x', 7098)).toBe('postgresql://u:p@db:7098/x'); // prettier-ignore
  });
});

describe('isolateEnvContents', () => {
  it('rewrites ports and the derived URL, keeping quotes and trailing comments, and flips the marker', () => {
    const out = isolateEnvContents(SERVER_ENV_CONTENTS, { compose: undefined, owner: true, ports: PORTS }); // prettier-ignore

    expect(out).toContain('POSTGRES_PORT="7098"');
    expect(out).toContain('REDIS_PORT="7099"');
    expect(out).toContain('POSTGRES_URL="postgresql://u:p%40ss@localhost:7098/openthrottle" # ✏️ CHANGE THIS ✏️'); // prettier-ignore
    expect(out).toContain('OT_WORKTREE_DB=isolated');
    expect(out).not.toContain('OT_WORKTREE_DB=shared');
  });

  it('is idempotent', () => {
    const once = isolateEnvContents(SERVER_ENV_CONTENTS, { compose: undefined, owner: true, ports: PORTS }); // prettier-ignore

    expect(isolateEnvContents(once, { compose: undefined, owner: true, ports: PORTS })).toBe(once); // prettier-ignore
  });

  it('leaves a non-owner app .env without the keys untouched', () => {
    expect(isolateEnvContents('APP_NAME=dev\n', { compose: undefined, owner: false, ports: PORTS })).toBe('APP_NAME=dev\n'); // prettier-ignore
  });

  it('adds the compose project only when the root .env has none', () => {
    const compose = { prefix: 'wt-probe-', project: 'openthrottle-probe' };

    expect(isolateEnvContents('A=1\n', { compose, owner: true, ports: PORTS })).toContain('COMPOSE_PROJECT_NAME=openthrottle-probe'); // prettier-ignore
    expect(
      isolateEnvContents('COMPOSE_PROJECT_NAME=custom\n', { compose, owner: true, ports: PORTS }), // prettier-ignore
    ).toContain('COMPOSE_PROJECT_NAME=custom');
  });
});

describe('configureIsolatedDb', () => {
  const free = (): boolean => false;

  it('allocates base+8/base+9 of the existing block and rewrites root and app env files', () => {
    const root = makeWorktree();
    const result = configureIsolatedDb(root, { isPortInUse: free });

    expect(result).toMatchObject({ base: 7090, kind: 'configured', ports: { postgres: 7098, redis: 7099 } }); // prettier-ignore

    const rootEnv = readEnvFile(join(root, '.env'));
    const serverEnv = readEnvFile(join(root, SERVER_ENV));

    expect(rootEnv).toMatchObject({ OT_WORKTREE_DB: 'isolated', POSTGRES_PORT: '7098', REDIS_PORT: '7099' }); // prettier-ignore
    expect(serverEnv).toMatchObject({ OT_WORKTREE_DB: 'isolated', POSTGRES_PORT: '7098', REDIS_PORT: '7099' }); // prettier-ignore
    expect(readFileSync(join(root, SERVER_ENV), 'utf8')).toContain('POSTGRES_URL="postgresql://u:p%40ss@localhost:7098/openthrottle" # ✏️ CHANGE THIS ✏️'); // prettier-ignore
    expect(readFileSync(join(root, 'applications/openthrottle-developer/.env'), 'utf8')).toBe('APP_NAME=dev\n'); // prettier-ignore
  });

  it('stops excluding postgres/redis in the compose override', () => {
    const root = makeWorktree();

    configureIsolatedDb(root, { isPortInUse: free });

    const override = readFileSync(join(root, 'docker-compose.worktree.yml'), 'utf8'); // prettier-ignore

    expect(override).not.toContain('profiles: ["disabled"]');
    expect(override).toContain('server-dev:');
  });

  it('bumps the pair a block at a time when a port is busy', () => {
    const root = makeWorktree();
    const result = configureIsolatedDb(root, { isPortInUse: (port) => port === 7099 }); // prettier-ignore

    expect(result).toMatchObject({ kind: 'configured', ports: { postgres: 7108, redis: 7109 } }); // prettier-ignore
  });

  it('is a no-op on an already-isolated worktree', () => {
    const root = makeWorktree();

    configureIsolatedDb(root, { isPortInUse: free });

    const snapshot = [readFileSync(join(root, '.env'), 'utf8'), readFileSync(join(root, SERVER_ENV), 'utf8')]; // prettier-ignore
    // Even with the (now our own) ports busy, nothing is re-allocated.
    const again = configureIsolatedDb(root, { isPortInUse: () => true });

    expect(again).toEqual({ kind: 'already-isolated', ports: { postgres: 7098, redis: 7099 } }); // prettier-ignore
    expect([readFileSync(join(root, '.env'), 'utf8'), readFileSync(join(root, SERVER_ENV), 'utf8')]).toEqual(snapshot); // prettier-ignore
  });

  it('refuses a checkout without the marker (the primary) and changes nothing', () => {
    const root = makeWorktree();

    writeFileSync(join(root, '.env'), 'POSTGRES_PORT="6010"\n');

    expect(configureIsolatedDb(root, { isPortInUse: free })).toMatchObject({ kind: 'refused' }); // prettier-ignore
    expect(readFileSync(join(root, '.env'), 'utf8')).toBe('POSTGRES_PORT="6010"\n'); // prettier-ignore
  });
});

describe('provisioning helpers', () => {
  it('reads the --own-db request from the environment', () => {
    expect(wantsOwnDb({ OPENTHROTTLE_WORKTREE_OWN_DB: '1' })).toBe(true);
    expect(wantsOwnDb({ OPENTHROTTLE_WORKTREE_OWN_DB: 'true' })).toBe(true);
    expect(wantsOwnDb({ OPENTHROTTLE_WORKTREE_OWN_DB: '0' })).toBe(false);
    expect(wantsOwnDb({})).toBe(false);
  });

  it('names the compose project teardown expects', () => {
    expect(composeProjectFor('/x/y/Probe-One')).toBe('openthrottle-probe-one');
  });
});

describe('worktreeComposeOverride', () => {
  it('shared disables postgres/redis; isolated does not', () => {
    expect(worktreeComposeOverride('shared')).toContain('profiles: ["disabled"]'); // prettier-ignore
    expect(worktreeComposeOverride('isolated')).not.toContain('profiles: ["disabled"]'); // prettier-ignore
  });
});

const REPO_ROOT = join(import.meta.dirname, '..', '..');
const DB_SERVICES = ['migrations', 'postgres', 'redis'];
const PROFILES = ['bootstrap', 'dev', 'prod', 'voice'];

const hasDockerCompose =
  spawnSync('docker', ['compose', 'version'], { stdio: 'ignore' }).status === 0;

interface ComposeServicesResult {
  readonly services: string[];
  readonly status: number | null;
  readonly stderr: string;
}

/** `docker compose config --services` for the real compose file plus a generated override. */
const composeServices = (
  db: WorktreeComposeDb,
  profile: string,
): ComposeServicesResult => {
  const root = mkdtempSync(join(tmpdir(), 'wt-compose-'));
  copyFileSync(
    join(REPO_ROOT, 'docker-compose.yml'),
    join(root, 'docker-compose.yml'),
  );
  copyFileSync(join(REPO_ROOT, '.env.default'), join(root, '.env'));
  writeFileSync(join(root, 'docker-compose.worktree.yml'), worktreeComposeOverride(db)); // prettier-ignore

  const result = spawnSync(
    'docker',
    ['compose', '--project-directory', root, '-f', 'docker-compose.yml', '-f', 'docker-compose.worktree.yml', '--profile', profile, 'config', '--services'], // prettier-ignore
    { cwd: root, encoding: 'utf8', env: { HOME: process.env.HOME, PATH: process.env.PATH } }, // prettier-ignore
  );

  return {
    services: result.stdout.split('\n').filter((line) => line !== ''),
    status: result.status,
    stderr: result.stderr,
  };
};

// `config` needs the Compose CLI, not a running daemon. It is the only check that
// catches a depends_on edge to a service the override disabled.
describe.skipIf(!hasDockerCompose)(
  'worktreeComposeOverride against docker-compose.yml',
  () => {
    describe.each(PROFILES)('--profile %s', (profile) => {
      it('shared validates and starts no database service of its own', () => {
        const { services, status, stderr } = composeServices('shared', profile);

        expect(stderr).not.toContain('depends on undefined service');
        expect(status).toBe(0);
        expect(services.filter((service) => DB_SERVICES.includes(service))).toEqual([]); // prettier-ignore
      });

      it('isolated validates and keeps its own postgres/redis', () => {
        const { services, status, stderr } = composeServices(
          'isolated',
          profile,
        );

        expect(stderr).not.toContain('depends on undefined service');
        expect(status).toBe(0);
        expect(services).toEqual(expect.arrayContaining(['postgres', 'redis']));
      });
    });
  },
);
