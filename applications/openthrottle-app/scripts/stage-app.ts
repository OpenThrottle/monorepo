// Stages the self-contained app directory electron-builder packages:
//
//   dist/stage/package.json      generated, no dependencies
//   dist/stage/out/              the electron-vite main/preload/renderer bundles
//   dist/stage/developer/        the developer build (server/ + client/)
//   dist/stage/node_modules/     the TRACED runtime closure, flat, no .env
//
// Run with `pnpm exec tsx scripts/stage-app.ts` from the project root (the
// `package` target does). It never reads a `.env` file and never copies one.
import {
  cp,
  mkdir,
  readdir,
  readFile,
  realpath,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';

import { nodeFileTrace } from '@vercel/nft';

import {
  DEVELOPER_BUILD_DIRS,
  EXPECTED_NATIVE_FILES,
  OUT_BUNDLE_DIRS,
  STAGE_DEVELOPER_DIR,
  STAGE_DIR,
  STAGE_OUT_DIR,
} from './data/data.stage.ts';
import { buildStagePackageJson } from './utils/buildStagePackageJson.ts';
import { findNativeFiles } from './utils/findNativeFiles.ts';
import { findNearestSlot } from './utils/findNearestSlot.ts';
import { isEnvFile, isExcludedFile } from './utils/isExcludedFile.ts';
import { parseAppManifest } from './utils/parseAppManifest.ts';
import type { StagePackage } from './utils/planStageFiles.ts';
import { isPackageLinkPath, planStageFiles } from './utils/planStageFiles.ts';
import { trimUnstagedDependencies } from './utils/trimUnstagedDependencies.ts';

const PROJECT_ROOT = resolve(import.meta.dirname, '..');
const REPO_ROOT = resolve(PROJECT_ROOT, '../..');
const DEVELOPER_BUILD = resolve(
  REPO_ROOT,
  'applications/openthrottle-developer/build',
);
const STAGE_ROOT = resolve(PROJECT_ROOT, STAGE_DIR);

const fail = (message: string): never => {
  process.stderr.write(`[stage-app] ${message}\n`);
  process.exit(1);
};

const listFiles = async (root: string): Promise<readonly string[]> => {
  const entries = await readdir(root, { recursive: true, withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name));
};

const copyFolder = async (from: string, to: string): Promise<void> => {
  await cp(from, to, {
    filter: (source) => !isExcludedFile(source),
    recursive: true,
  });
};

const traceEntries = async (): Promise<readonly string[]> => {
  const serverAssets = join(DEVELOPER_BUILD, 'server/assets');
  const assetFiles = (await readdir(serverAssets))
    .filter((name) => name.endsWith('.js'))
    .map((name) => join(serverAssets, name));

  return [
    join(PROJECT_ROOT, 'out/main/server.js'),
    join(DEVELOPER_BUILD, 'server/index.js'),
    ...assetFiles,
  ];
};

const topLevelDependencies = (
  packages: readonly StagePackage[],
): Record<string, string> => {
  return Object.fromEntries(
    packages
      .filter((pkg) => pkg.dir === `node_modules/${pkg.name}`)
      .map((pkg) => [pkg.name, pkg.version]),
  );
};

const readElectronVersion = async (): Promise<string> => {
  const manifest: unknown = JSON.parse(
    await readFile(
      join(PROJECT_ROOT, 'node_modules/electron/package.json'),
      'utf8',
    ),
  );

  if (
    typeof manifest !== 'object' ||
    manifest === null ||
    !('version' in manifest) ||
    typeof manifest.version !== 'string'
  ) {
    return fail('node_modules/electron/package.json has no version');
  }

  return manifest.version;
};

// electron-builder's traversal collector throws on a declared dependency the
// stage lacks, so staged manifests are made to list only what is staged.
const trimStagedManifests = async (
  packages: readonly StagePackage[],
): Promise<void> => {
  const dirs = new Set(packages.map((pkg) => pkg.dir));

  await Promise.all(
    packages.map(async (pkg) => {
      const path = join(STAGE_ROOT, pkg.dir, 'package.json');
      const manifest: unknown = JSON.parse(await readFile(path, 'utf8'));

      if (typeof manifest !== 'object' || manifest === null) {
        return;
      }

      const trimmed = trimUnstagedDependencies(
        Object.fromEntries(Object.entries(manifest)),
        (name) =>
          findNearestSlot((slot) => dirs.has(slot), pkg.dir, name) !==
          undefined,
      );

      if (trimmed.removed.length > 0) {
        await writeFile(path, `${JSON.stringify(trimmed.manifest, null, 2)}\n`);
      }
    }),
  );
};

const run = async (): Promise<void> => {
  const manifestResult = parseAppManifest(
    JSON.parse(await readFile(join(PROJECT_ROOT, 'package.json'), 'utf8')),
  );

  if (!manifestResult.ok) {
    return fail(manifestResult.reason);
  }

  const electronVersion = await readElectronVersion();

  await rm(STAGE_ROOT, { force: true, recursive: true });
  await mkdir(STAGE_ROOT, { recursive: true });

  // main.js imports only electron and node: builtins, so it adds no packages.
  // electron itself is the runtime and is excluded from tracing.
  const trace = await nodeFileTrace([...(await traceEntries())], {
    base: REPO_ROOT,
    conditions: ['node', 'import', 'production'],
    processCwd: PROJECT_ROOT,
  });
  const traced = [...trace.fileList];
  // The tracer also reports the dependency symlinks it walked through; their
  // real targets say which version each package resolves to.
  const links = await Promise.all(
    traced.filter(isPackageLinkPath).map(async (from) => {
      const target = await realpath(join(REPO_ROOT, from));

      return { from, to: relative(REPO_ROOT, target) };
    }),
  );
  const plan = planStageFiles(traced, links);

  if (!plan.ok) {
    return fail(
      `cannot flatten the traced closure:\n  ${plan.reasons.join('\n  ')}`,
    );
  }

  await Promise.all([
    ...OUT_BUNDLE_DIRS.map((name) =>
      copyFolder(
        join(PROJECT_ROOT, 'out', name),
        join(STAGE_ROOT, STAGE_OUT_DIR, name),
      ),
    ),
    ...DEVELOPER_BUILD_DIRS.map((name) =>
      copyFolder(
        join(DEVELOPER_BUILD, name),
        join(STAGE_ROOT, STAGE_DEVELOPER_DIR, name),
      ),
    ),
    ...plan.copies.map(async (copy) => {
      const target = join(STAGE_ROOT, copy.to);

      await mkdir(dirname(target), { recursive: true });
      await cp(join(REPO_ROOT, copy.from), target);
    }),
  ]);

  await writeFile(
    join(STAGE_ROOT, 'package.json'),
    `${JSON.stringify(buildStagePackageJson(manifestResult.manifest, topLevelDependencies(plan.packages), electronVersion), null, 2)}\n`,
  );

  await trimStagedManifests(plan.packages);

  const staged = await listFiles(STAGE_ROOT);
  const leaked = staged.filter((path) => isEnvFile(path));

  if (leaked.length > 0) {
    return fail(`a .env file reached the stage: ${leaked.join(', ')}`);
  }

  const entries = await Promise.all(
    staged.map(async (path) => {
      const { mode } = await stat(path);

      return { mode, path: relative(STAGE_ROOT, path) };
    }),
  );
  const native = findNativeFiles(entries);
  const unexpectedNative = native.filter(
    (path) => !EXPECTED_NATIVE_FILES.some((expected) => expected === path),
  );

  process.stdout.write(
    `${JSON.stringify(
      {
        excludedTracedFiles: plan.excluded.length,
        nativeFiles: native,
        packagesPlaced: plan.packages.length,
        skippedPhantoms: plan.skippedPhantoms,
        stage: relative(PROJECT_ROOT, STAGE_ROOT),
        stagedFiles: staged.length,
      },
      null,
      2,
    )}\n`,
  );

  if (unexpectedNative.length > 0) {
    fail(
      `native or executable files are staged; list them in asarUnpack (electron-builder.yml) and EXPECTED_NATIVE_FILES (scripts/data/data.stage.ts):\n  ${unexpectedNative.join('\n  ')}`,
    );
  }
};

run().catch((error: unknown) => {
  fail(error instanceof Error ? (error.stack ?? error.message) : String(error));
});
