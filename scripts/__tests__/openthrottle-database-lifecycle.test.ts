import { describe, expect, it } from 'vitest';

import {
  OWN_COMPOSE_ARGS,
  parseDatabaseAction,
  planDatabaseAction,
  primaryStartArgs,
  resolvePrimaryComposeProject,
} from '../openthrottle-database-lifecycle.ts';

describe('planDatabaseAction', () => {
  it("runs the primary checkout's original compose commands, byte for byte", () => {
    expect(
      planDatabaseAction({ action: 'start', mode: 'primary', sharedReachable: false }), // prettier-ignore
    ).toEqual({ args: ['compose', 'up', '-d', 'redis', 'postgres'], kind: 'own-compose' }); // prettier-ignore
    expect(
      planDatabaseAction({ action: 'stop', mode: 'primary', sharedReachable: false }), // prettier-ignore
    ).toEqual({ args: ['compose', 'down', '--remove-orphans'], kind: 'own-compose' }); // prettier-ignore
  });

  it('never consults reachability for the primary (a reachable DB must not turn start into a no-op)', () => {
    expect(
      planDatabaseAction({ action: 'start', mode: 'primary', sharedReachable: true }), // prettier-ignore
    ).toEqual({ args: OWN_COMPOSE_ARGS.start, kind: 'own-compose' });
  });

  it('treats isolated like the primary: it starts and stops its own containers', () => {
    expect(
      planDatabaseAction({ action: 'start', mode: 'isolated', sharedReachable: true }), // prettier-ignore
    ).toEqual({ args: OWN_COMPOSE_ARGS.start, kind: 'own-compose' });
    expect(
      planDatabaseAction({ action: 'stop', mode: 'isolated', sharedReachable: false }), // prettier-ignore
    ).toEqual({ args: OWN_COMPOSE_ARGS.stop, kind: 'own-compose' });
  });

  it('shared + start is a no-op when the shared database is reachable', () => {
    expect(
      planDatabaseAction({ action: 'start', mode: 'shared', sharedReachable: true }), // prettier-ignore
    ).toEqual({ kind: 'shared-reachable' });
  });

  it("shared + start starts the primary's containers when the database is not reachable", () => {
    expect(
      planDatabaseAction({ action: 'start', mode: 'shared', sharedReachable: false }), // prettier-ignore
    ).toEqual({ kind: 'shared-start-primary' });
  });

  it('shared + stop never stops anything, whatever the reachability', () => {
    for (const sharedReachable of [true, false]) {
      expect(
        planDatabaseAction({ action: 'stop', mode: 'shared', sharedReachable }),
      ).toEqual({ kind: 'shared-stop-skipped' });
    }
  });
});

describe('primaryStartArgs', () => {
  it("pins compose to the primary's file, directory and project", () => {
    expect(primaryStartArgs('/repos/monorepo', 'openthrottle')).toEqual([
      'compose',
      '-f',
      '/repos/monorepo/docker-compose.yml',
      '--project-directory',
      '/repos/monorepo',
      '-p',
      'openthrottle',
      'up',
      '-d',
      'redis',
      'postgres',
    ]);
  });
});

describe('resolvePrimaryComposeProject', () => {
  const composeContents = "# header\nname: 'OpenThrottle'\n\nservices:\n  name: not-this\n"; // prettier-ignore

  it("uses the compose file's top-level name, normalized like compose", () => {
    expect(
      resolvePrimaryComposeProject({ composeContents, primaryDir: '/r/monorepo', primaryEnv: {} }), // prettier-ignore
    ).toBe('openthrottle');
  });

  it("lets the primary's own COMPOSE_PROJECT_NAME win", () => {
    expect(
      resolvePrimaryComposeProject({
        composeContents,
        primaryDir: '/r/monorepo',
        primaryEnv: { COMPOSE_PROJECT_NAME: 'Custom.Stack' },
      }),
    ).toBe('customstack');
  });

  it('falls back to the directory name when the file declares no name', () => {
    expect(
      resolvePrimaryComposeProject({ composeContents: 'services: {}\n', primaryDir: '/r/My-Repo', primaryEnv: {} }), // prettier-ignore
    ).toBe('my-repo');
  });
});

describe('parseDatabaseAction', () => {
  it('accepts only start and stop', () => {
    expect(parseDatabaseAction('start')).toBe('start');
    expect(parseDatabaseAction('stop')).toBe('stop');
    expect(parseDatabaseAction('down')).toBeUndefined();
    expect(parseDatabaseAction(undefined)).toBeUndefined();
  });
});
