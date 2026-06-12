#!/usr/bin/env node

import { glob, readFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * @description Enforces 100% pnpm catalog coverage: every external dependency in every
 * workspace package.json must use the `catalog:` protocol (see MONOREPO.md § Dependency
 * Catalog). `workspace:*` references are always allowed. peerDependencies are exempt by
 * policy — intentionally wide peer ranges on published packages stay literal.
 */

const WORKSPACE_GLOBS = [
  'package.json',
  'applications/*/package.json',
  'infra/package.json',
  'packages/*/package.json',
  'tools/*/package.json',
];

const CHECKED_SECTIONS = [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
] as const;

interface Violation {
  dependency: string;
  file: string;
  section: string;
  spec: string;
}

const isAllowedSpec = (spec: string): boolean =>
  spec.startsWith('catalog:') || spec.startsWith('workspace:');

async function main(): Promise<void> {
  const files = (
    await Promise.all(
      WORKSPACE_GLOBS.map((pattern) =>
        Array.fromAsync(glob(pattern, { cwd: process.cwd() })),
      ),
    )
  ).flat();

  const manifests = await Promise.all(
    files.map(async (file) => ({
      file,
      manifest: JSON.parse(
        await readFile(join(process.cwd(), file), 'utf8'),
      ) as Record<string, Record<string, string> | undefined>,
    })),
  );

  const violations: Violation[] = [];

  for (const { file, manifest } of manifests) {
    for (const section of CHECKED_SECTIONS) {
      for (const [dependency, spec] of Object.entries(
        manifest[section] ?? {},
      )) {
        if (!isAllowedSpec(spec)) {
          violations.push({ dependency, file, section, spec });
        }
      }
    }
  }

  if (violations.length > 0) {
    console.error('❌ Non-catalog external dependency specs found:\n');
    for (const { dependency, file, section, spec } of violations) {
      console.error(`  ${file} → ${section}.${dependency}: "${spec}"`);
    }
    console.error(
      `\n${violations.length} violation(s). Add the version to the catalog in pnpm-workspace.yaml and reference it with "catalog:" (see MONOREPO.md § Dependency Catalog).`,
    );
    process.exit(1);
  }

  console.log('✅ pnpm catalog coverage is 100%.');
}

await main();
