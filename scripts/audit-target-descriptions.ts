#!/usr/bin/env node

import { glob, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createLogger } from './lib/index.ts';

const logger = createLogger();

/**
 * @description Audits (and, with `--check`, enforces) `description` coverage for every
 * CONFIG-DECLARED Nx target in the workspace — the targets we own and can edit. Two
 * sources are inspected:
 *   1. `nx.json` → `targetDefaults` (keyed by target NAME, e.g. `lint`, or by EXECUTOR,
 *      e.g. `@nx/js:tsc`). A description here cascades into every project's resolved
 *      target of that name / executor (verified via `nx show project --json`).
 *   2. Each workspace `package.json` → `nx.targets` (per-project explicit targets).
 *
 * Coverage is cascade-aware: a per-project target counts as described if it has its OWN
 * description, OR a name-keyed targetDefault of the same name has one, OR an
 * executor-keyed targetDefault matching the target's executor has one. This mirrors how
 * Nx merges targetDefaults, so we don't need to shell out to `nx show project` per
 * project (slower, and it would also surface plugin-inferred targets we cannot edit).
 *
 * Plugin-INFERRED targets (never declared in our config) are intentionally NOT checked.
 * Targets disabled via naming hacks (`__`-prefix, `__DISABLED__`, padded underscores,
 * etc.) are skipped — see the describe-or-skip policy. Renaming them is out of scope.
 *
 * Usage:
 *   tsx scripts/audit-target-descriptions.ts            # report only (exit 0)
 *   tsx scripts/audit-target-descriptions.ts --check    # exit 1 if any owned target is undescribed
 */

const WORKSPACE_GLOBS = [
  'package.json',
  'applications/*/package.json',
  'infra/package.json',
  'packages/*/package.json',
  'tools/*/package.json',
];

/** A target whose name signals it is intentionally disabled, not a real runnable target. */
const isDisabledMarker = (target: string): boolean =>
  /^_|_{3,}|DISABLED/i.test(target);

/** A targetDefaults key is executor-keyed (vs name-keyed) when it looks like `@scope/pkg:exec`. */
const isExecutorKey = (key: string): boolean => key.includes(':');

interface TargetRecord {
  covered: boolean;
  ownDescription: boolean;
  project: string;
  source: 'package.json' | 'targetDefaults';
  target: string;
}

type NxTargetConfig = { description?: unknown; executor?: unknown } | undefined;

const readJson = async (file: string): Promise<Record<string, unknown>> =>
  JSON.parse(await readFile(join(process.cwd(), file), 'utf8'));

const hasDescription = (config: NxTargetConfig): boolean => {
  const value = config?.description;
  return typeof value === 'string' && value.trim().length > 0;
};

interface Defaults {
  byExecutor: Map<string, boolean>;
  byName: Map<string, boolean>;
  records: TargetRecord[];
}

async function collectTargetDefaults(): Promise<Defaults> {
  const nxJson = await readJson('nx.json');
  const targetDefaults = nxJson.targetDefaults ?? {};
  const byName = new Map<string, boolean>();
  const byExecutor = new Map<string, boolean>();
  const records: TargetRecord[] = [];

  for (const [key, config] of Object.entries(targetDefaults)) {
    const described = hasDescription(config);
    if (isExecutorKey(key)) {
      byExecutor.set(key, described);
    } else {
      byName.set(key, described);
    }

    records.push({
      covered: described,
      ownDescription: described,
      project: '(targetDefaults)',
      source: 'targetDefaults',
      target: key,
    });
  }
  return { byExecutor, byName, records };
}

async function collectPackageTargets(
  defaults: Defaults,
): Promise<TargetRecord[]> {
  const files = (
    await Promise.all(
      WORKSPACE_GLOBS.map((pattern) =>
        Array.fromAsync(glob(pattern, { cwd: process.cwd() })),
      ),
    )
  ).flat();

  const perFile = await Promise.all(
    files.map(async (file: string): Promise<TargetRecord[]> => {
      const manifest = await readJson(file);

      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const nx = manifest.nx as unknown as
        { targets?: Record<string, NxTargetConfig> } | undefined;

      const targets = nx?.targets;
      if (!targets) {
        return [];
      }

      const project = typeof manifest.name === 'string' ? manifest.name : file;
      return Object.entries(targets).map(([target, config]) => {
        const ownDescription = hasDescription(config);
        const executor =
          typeof config?.executor === 'string' ? config.executor : undefined;
        const covered =
          ownDescription ||
          defaults.byName.get(target) === true ||
          (executor !== undefined &&
            defaults.byExecutor.get(executor) === true);
        return {
          covered,
          ownDescription,
          project,
          source: 'package.json',
          target,
        };
      });
    }),
  );
  return perFile.flat();
}

const partition = (records: TargetRecord[]) => {
  const active = records.filter((r) => !isDisabledMarker(r.target));
  const disabled = records.filter((r) => isDisabledMarker(r.target));
  const uncovered = active.filter((r) => !r.covered);

  return { active, disabled, uncovered };
};

async function main(): Promise<void> {
  const check = process.argv.includes('--check');
  const defaults = await collectTargetDefaults();
  const packageTargets = await collectPackageTargets(defaults);

  const defaultsPart = partition(defaults.records);
  const packagePart = partition(packageTargets);
  const uncovered = [...defaultsPart.uncovered, ...packagePart.uncovered];

  if (!check) {
    logger.heading('Nx target description audit');
    logger.info('## nx.json targetDefaults');
    logger.info(
      `  active: ${defaultsPart.active.length}, undescribed: ${defaultsPart.uncovered.length}; disabled markers: ${defaultsPart.disabled.length}`,
    );

    for (const r of defaultsPart.uncovered) {
      logger.detail(`✗ ${r.target}`);
    }

    logger.blank();
    logger.info('## package.json nx.targets (cascade-aware)');
    logger.info(
      `  active: ${packagePart.active.length}, uncovered: ${packagePart.uncovered.length}; disabled markers: ${packagePart.disabled.length}`,
    );

    const byProject = new Map<string, string[]>();
    for (const r of packagePart.uncovered) {
      const list = byProject.get(r.project) ?? [];
      list.push(r.target);
      byProject.set(r.project, list);
    }

    for (const [project, targets] of [...byProject.entries()].sort()) {
      logger.detail(`✗ ${project}: ${targets.sort().join(', ')}`);
    }

    logger.blank();
    logger.info('## Totals');
    logger.info(
      `  config-declared active targets: ${defaultsPart.active.length + packagePart.active.length}; uncovered: ${uncovered.length}; disabled markers (skipped): ${defaultsPart.disabled.length + packagePart.disabled.length}`,
    );

    return;
  }

  if (uncovered.length > 0) {
    logger.fail(
      'Nx targets missing a `description` (own or inherited from targetDefaults):',
    );
    logger.blank();

    for (const r of uncovered) {
      const where =
        r.source === 'targetDefaults' ? 'nx.json targetDefaults' : r.project;
      logger.detail(`${where} → ${r.target}`);
    }

    logger.blank();
    logger.fail(
      `${uncovered.length} undescribed target(s). Add a description to the target in its package.json, or to the matching nx.json targetDefaults entry so it cascades (see CONTRIBUTING.md § Nx target descriptions).`,
    );

    process.exit(1);
  }

  logger.success('Every config-declared Nx target has a description.');
}

await main();
