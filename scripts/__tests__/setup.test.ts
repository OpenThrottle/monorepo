import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { buildSetupSteps } from '../setup.ts';
import {
  environmentDirectories,
  resetEnvironmentFiles,
} from '../setup_environment.ts';
import { isPullableBranch } from '../setup_update.ts';

describe('buildSetupSteps', () => {
  const steps = buildSetupSteps();
  const scripts = steps.map((step) => step.args[1]);

  it('keeps the load-bearing order', () => {
    // check:bootstrap-secrets must run AFTER both bootstrap scripts: the
    // service-account script writes the token keys and the default-user
    // script writes the URL/user keys — only then is the full set present.
    expect(scripts.indexOf('check:bootstrap-secrets')).toBeGreaterThan(
      scripts.indexOf('database:bootstrap-service-accounts'),
    );
    expect(scripts.indexOf('check:bootstrap-secrets')).toBeGreaterThan(
      scripts.indexOf('database:bootstrap-default-user'),
    );

    // Migrations run before anything touches rows.
    expect(scripts.indexOf('database:migrate')).toBeLessThan(
      scripts.indexOf('database:bootstrap-service-accounts'),
    );

    // The database must be running before it is migrated.
    expect(scripts.indexOf('database:start')).toBeLessThan(
      scripts.indexOf('database:migrate'),
    );
  });

  it('runs everything through pnpm', () => {
    expect(steps.every((step) => step.command === 'pnpm')).toBe(true);
  });
});

describe('environmentDirectories', () => {
  it('lists the root plus every applications/* and packages/* folder', () => {
    const root = mkdtempSync(join(tmpdir(), 'setup-env-'));
    mkdirSync(join(root, 'applications', 'app-a'), { recursive: true });
    mkdirSync(join(root, 'packages', 'pkg-a'), { recursive: true });
    mkdirSync(join(root, 'packages', 'pkg-b'), { recursive: true });

    expect(environmentDirectories(root)).toEqual([
      root,
      join(root, 'applications', 'app-a'),
      join(root, 'packages', 'pkg-a'),
      join(root, 'packages', 'pkg-b'),
    ]);
  });
});

describe('resetEnvironmentFiles', () => {
  const scaffold = (): string => {
    const root = mkdtempSync(join(tmpdir(), 'setup-reset-'));
    writeFileSync(join(root, '.env.default'), 'ROOT=default\n');
    mkdirSync(join(root, 'applications', 'app-a'), { recursive: true });
    writeFileSync(join(root, 'applications', 'app-a', '.env.default'), 'APP=default\n'); // prettier-ignore
    mkdirSync(join(root, 'applications', 'app-no-template'), { recursive: true }); // prettier-ignore

    return root;
  };

  it('creates missing .env files from their templates', async () => {
    const root = scaffold();

    const outcome = await resetEnvironmentFiles(root, async () => false);

    expect(outcome.created).toHaveLength(2);
    expect(readFileSync(join(root, '.env'), 'utf8')).toBe('ROOT=default\n');
    expect(readFileSync(join(root, 'applications', 'app-a', '.env'), 'utf8')).toBe('APP=default\n'); // prettier-ignore
  });

  it('keeps existing files when the confirm declines', async () => {
    const root = scaffold();
    writeFileSync(join(root, '.env'), 'ROOT=custom\n');

    const outcome = await resetEnvironmentFiles(root, async () => false);

    expect(outcome.kept).toEqual([join(root, '.env')]);
    expect(readFileSync(join(root, '.env'), 'utf8')).toBe('ROOT=custom\n');
  });

  it('resets existing files when the confirm accepts', async () => {
    const root = scaffold();
    writeFileSync(join(root, '.env'), 'ROOT=custom\n');

    const outcome = await resetEnvironmentFiles(root, async () => true);

    expect(outcome.reset).toEqual([join(root, '.env')]);
    expect(readFileSync(join(root, '.env'), 'utf8')).toBe('ROOT=default\n');
  });
});

describe('isPullableBranch', () => {
  it('pulls only default branches', () => {
    expect(isPullableBranch('main')).toBe(true);
    expect(isPullableBranch('master')).toBe(true);
    expect(isPullableBranch('feat/x')).toBe(false);
    expect(isPullableBranch(undefined)).toBe(false);
  });
});
