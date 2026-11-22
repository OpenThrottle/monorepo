import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, test } from 'vitest';

import { repositoryRoot } from '../../../runner/format.ts';
import { scanText } from '../../../scan/scanText.ts';
import {
  SETUP_FROM_SCRATCH_COMMANDS,
  SETUP_FROM_SCRATCH_FACTS,
  SETUP_FROM_SCRATCH_SURFACES,
} from '../surface.ts';

const root = repositoryRoot();

const repositoryFile = (name: string): string => {
  return readFileSync(join(root, name), 'utf8');
};

/** The major of `v26.13.1` or `12.18.0`. */
const major = (version: string): number => {
  return Number(version.replace(/^v/, '').split('.')[0]);
};

/** The number after `>=` in an `engines` range such as `>=26`. */
const minimumMajor = (range: unknown): number => {
  return Number(String(range).replace('>=', ''));
};

const readEngines = (): { readonly node: unknown; readonly pnpm: unknown } => {
  const parsed: unknown = JSON.parse(repositoryFile('package.json'));
  const isObject = typeof parsed === 'object' && parsed !== null;
  const engines: unknown = isObject
    ? Reflect.get(parsed, 'engines')
    : undefined;

  if (typeof engines !== 'object' || engines === null) {
    throw new Error('package.json has no engines');
  }

  return {
    node: Reflect.get(engines, 'node'),
    pnpm: Reflect.get(engines, 'pnpm'),
  };
};

describe('L2-setup-from-scratch surfaces', () => {
  const surfaces = Object.entries(SETUP_FROM_SCRATCH_SURFACES);
  const terminal = SETUP_FROM_SCRATCH_SURFACES['terminal'] ?? '';

  test('every surface is scanned', () => {
    expect(surfaces.map(([name]) => name)).toStrictEqual([
      'agent',
      'mcp',
      'terminal',
      'trouble',
    ]);
  });

  test.each(surfaces)('%s carries no leak-scan error', (name, html) => {
    const errors = scanText(name, html, 'frame').filter(
      (finding) => finding.severity === 'error',
    );

    expect(errors).toStrictEqual([]);
  });

  test.each(surfaces)('%s shows no home directory', (name, html) => {
    expect(name).not.toBe('');
    expect(html).not.toMatch(/\/(?:Users|home)\//i);
  });

  test('docker ps shows the empty-list header and no container rows', () => {
    expect(terminal).toContain('CONTAINER ID   IMAGE   COMMAND');
    expect(terminal).not.toMatch(/Up \d+ (?:seconds|minutes)/);
  });
});

describe('L2-setup-from-scratch captured versions', () => {
  test('the captured node and pnpm satisfy the repo engines', () => {
    const engines = readEngines();

    expect(major(SETUP_FROM_SCRATCH_FACTS.nodeVersion)).toBeGreaterThanOrEqual(
      minimumMajor(engines.node),
    );
    expect(major(SETUP_FROM_SCRATCH_FACTS.pnpmVersion)).toBeGreaterThanOrEqual(
      minimumMajor(engines.pnpm),
    );
  });
});

describe('L2-setup-from-scratch setup transcript', () => {
  const terminal = SETUP_FROM_SCRATCH_SURFACES['terminal'] ?? '';
  const setupSource = repositoryFile('scripts/setup.ts');
  const shimSource = repositoryFile('scripts/setup.sh');

  test('the banner is the one setup.sh prints', () => {
    expect(shimSource).toContain(
      'setup.sh — pre-install bootstrap, then tsx ./scripts/setup.ts',
    );
    expect(terminal).toContain(
      'setup.sh — pre-install bootstrap, then tsx ./scripts/setup.ts',
    );
  });

  test.each([
    ['Start Postgres + Redis', 'database:start'],
    ['Apply database migrations', 'database:migrate'],
    ['Seed the default login user', 'database:bootstrap-default-user'],
  ])('setup.ts still runs %s as %s', (title, script) => {
    expect(setupSource).toContain(`title: '${title}'`);
    expect(setupSource).toContain(`args: ['run', '${script}']`);
    expect(terminal).toContain(`▶ ${title}`);
    expect(terminal).toContain(`pnpm run ${script}`);
  });

  test('the ledger lists one Running line per migration file, and the count', () => {
    const files = readdirSync(
      join(root, 'databases', 'openthrottle', 'migrations'),
    ).filter((name) => name.endsWith('.sql'));

    expect(SETUP_FROM_SCRATCH_FACTS.migrationCount).toBe(files.length);
    expect(terminal).toContain(
      `Migrations completed (${String(files.length)} applied).`,
    );

    for (const file of files) {
      expect(terminal, file).toContain(`Running: ${file}`);
    }
  });

  test("the migration strings are the runner's own", () => {
    const runner = repositoryFile('databases/migration-runner.ts');

    expect(runner).toContain('log(`Running: ${file}`)');
    expect(runner).toContain(
      'Migrations completed (${appliedNow.length} applied).',
    );
  });

  test("the seeded-user lines are the bootstrap script's own", () => {
    const bootstrap = repositoryFile('scripts/bootstrap-default-user.ts');

    expect(bootstrap).toContain('`Default user ready: ${DEFAULT_USER.email}`');
    expect(bootstrap).toContain('`Role ${roleName}: assigned.`');
  });

  test('the server boot line is the one main.ts logs', () => {
    expect(
      repositoryFile('applications/openthrottle-server/src/main.ts'),
    ).toContain('Application is running on:');
    expect(terminal).toContain('Application is running on:');
  });

  test('pnpm run start is still what the flow types', () => {
    expect(repositoryFile('package.json')).toContain(
      '"start": "pnpm run sync:skills && pnpm run start:docker',
    );
    expect(SETUP_FROM_SCRATCH_COMMANDS.start).toBe('pnpm run start');
  });
});

describe('L2-setup-from-scratch troubleshooting', () => {
  const trouble = SETUP_FROM_SCRATCH_SURFACES['trouble'] ?? '';

  test("the Postgres error is what the repo's gate prints right now", () => {
    // The generator is `scripts/ensure-migrations.ts`; this re-runs it against a
    // port nothing listens on, which is a refused connection and nothing else, and
    // fails if the output stops matching the checked-in capture.
    let stdout = '';

    try {
      execFileSync(
        join(root, 'node_modules', '.bin', 'tsx'),
        [join(root, 'scripts', 'ensure-migrations.ts')],
        {
          cwd: root,
          encoding: 'utf8',
          env: {
            ...process.env,
            // Nx runs tests with FORCE_COLOR set, which beats NO_COLOR.
            FORCE_COLOR: '0',
            NO_COLOR: '1',
            OPENTHROTTLE_POSTGRES_URL: 'postgresql://u:p@localhost:59999/d',
          },
          stdio: ['ignore', 'pipe', 'ignore'],
          timeout: 60_000,
        },
      );
    } catch (error) {
      const isObject = typeof error === 'object' && error !== null;

      stdout = isObject ? String(Reflect.get(error, 'stdout')) : '';
    }

    // Strip any ANSI styling a terminal-detecting logger still emits: the capture
    // is the words on screen, not the colour codes.
    const ESCAPE = String.fromCharCode(27);
    const plain = stdout.replaceAll(
      new RegExp(`${ESCAPE}\\[[0-9;]*m`, 'g'),
      '',
    );

    expect(plain.trimEnd()).toBe(SETUP_FROM_SCRATCH_FACTS.postgresUnreachable);
  });

  test('the capture names the fix the flow then types', () => {
    expect(SETUP_FROM_SCRATCH_FACTS.postgresUnreachable).toContain(
      `start it with: ${SETUP_FROM_SCRATCH_COMMANDS.databaseStart}`,
    );
    expect(trouble).toContain('Postgres is not reachable after 10 attempt(s)');
  });

  test("the stale-token banner is the launcher's own text", () => {
    const launcher = repositoryFile('scripts/run-openthrottle-mcp.ts');

    expect(launcher).toContain(
      '`openthrottle-mcp: refusing to start — ${reason}`',
    );
    expect(launcher).toContain(
      "OPENTHROTTLE_MCP_AUTH_TOKEN is unset (not in the launching env, this worktree's .env, or the root .env).",
    );

    for (const line of SETUP_FROM_SCRATCH_FACTS.staleEnvFix
      .split('\n')
      .filter(
        (entry) =>
          entry.includes('  1.') ||
          entry.includes('  2.') ||
          entry.includes('  3.'),
      )) {
      expect(launcher, line).toContain(line.trim());
    }

    expect(launcher).toContain(
      "logger.detail('Details: packages/openthrottle-mcp/docs/AUTH.md')",
    );
  });

  test('the launcher invocation exists', () => {
    expect(
      repositoryFile(
        SETUP_FROM_SCRATCH_COMMANDS.staleLauncher.replace('bash ', ''),
      ),
    ).toContain('run-openthrottle-mcp');
  });
});
