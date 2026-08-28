#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  collectPlatformSpecificPackages,
  type LicensePolicy,
  type PnpmLicensesOutput,
  readInstalledLicenses,
  resolveEffectiveLicense,
} from './validate-license-compliance.ts';
import { createLogger, hasFlag } from './lib/index.ts';

const logger = createLogger();

/**
 * @description Generates `THIRD-PARTY-LICENSES.md` — the aggregated dependency-attribution
 * manifest that satisfies OpenThrottle's Apache-2.0 §4 obligations (and the PolyForm Shield
 * `Required Notice` obligation for the waived @paper-design/shaders* packages). Reads the
 * installed graph from `pnpm licenses list --json`, applies the `resolvedUnknowns` overrides
 * from license-policy.json, and embeds the full bundled license text for every waiver marked
 * `notice: true`. Run with `--check` to fail (non-zero) when the committed file is stale —
 * that is the CI freshness guard. Deterministic output (sorted) so the guard is stable.
 */

/** One third-party package's attribution row. */
export interface Attribution {
  author?: string;
  homepage?: string;
  license: string;
  name: string;
  versions: string[];
}

/** Full license text embedded for a `notice: true` waiver. */
export interface EmbeddedNotice {
  license: string;
  package: string;
  text: string;
}

/** First-party scopes to exclude from the third-party manifest. */
export const FIRST_PARTY_SCOPES = ['@openthrottle/', '@tools/'] as const;

/**
 * @description True for OpenThrottle's own workspace packages, which are not third-party
 * attributions and must be excluded from the manifest.
 */
export const isFirstParty = (name: string): boolean =>
  name === 'monorepo' ||
  FIRST_PARTY_SCOPES.some((scope) => name.startsWith(scope));

/**
 * @description Deterministic, locale-independent string order (UTF-16 code units). Used for
 * every sort in the manifest so the output is byte-identical across operating systems and
 * Node ICU builds — `String#localeCompare` is not (it varies by platform/locale), which
 * would break the CI drift guard.
 */
export const compareCodeUnits = (a: string, b: string): number =>
  a < b ? -1 : a > b ? 1 : 0;

/**
 * @description Normalize a package `author` (pnpm emits a string, but package.json may carry
 * an object) to a plain display name, or undefined. Exported for unit testing.
 */
export const normalizeAuthor = (author: unknown): string | undefined => {
  if (typeof author === 'string') {
    return author.trim() || undefined;
  }

  if (typeof author === 'object' && author !== null && 'name' in author) {
    const { name } = author;
    return typeof name === 'string' ? name.trim() || undefined : undefined;
  }

  return undefined;
};

/**
 * @description Flatten the pnpm payload into a sorted, deduped list of third-party
 * attributions, applying `resolvedUnknowns` so a package shows its verified SPDX id rather
 * than "Unknown". Exported for unit testing.
 */
export const collectAttributions = (
  output: PnpmLicensesOutput,
  policy: LicensePolicy,
  excludedPackages: ReadonlySet<string> = new Set(),
): Attribution[] => {
  const exceptionLicenses = new Map(
    policy.exceptions.map((exception) => [
      exception.package,
      exception.license,
    ]),
  );

  const rows: Attribution[] = [];
  for (const packages of Object.values(output)) {
    for (const pkg of packages) {
      if (isFirstParty(pkg.name) || excludedPackages.has(pkg.name)) {
        continue;
      }
      // A waiver's declared license is the accurate attribution (e.g. the PolyForm /
      // Microsoft LicenseRefs pnpm reports only as "Unknown"); otherwise resolve
      // Unknowns from the policy, otherwise use pnpm's detected expression.
      const license =
        exceptionLicenses.get(pkg.name) ??
        resolveEffectiveLicense(pkg.name, pkg.license, policy.resolvedUnknowns);
      rows.push({
        author: normalizeAuthor(pkg.author),
        homepage: pkg.homepage,
        license,
        name: pkg.name,
        versions: [...(pkg.versions ?? [])].sort(compareCodeUnits),
      });
    }
  }

  return rows.sort(
    (a, b) =>
      compareCodeUnits(a.name, b.name) ||
      compareCodeUnits(a.versions.join(','), b.versions.join(',')),
  );
};

/**
 * @description Render the full `THIRD-PARTY-LICENSES.md` document from the attribution rows
 * and the embedded notice texts. Pure (no I/O) so it is deterministic and unit-testable.
 */
export const renderThirdPartyNotices = (
  rows: readonly Attribution[],
  embedded: readonly EmbeddedNotice[],
): string => {
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.license, (counts.get(row.license) ?? 0) + 1);
  }

  const summary = [...counts.entries()].sort(
    (a, b) => b[1] - a[1] || compareCodeUnits(a[0], b[0]),
  );

  const lines: string[] = [];
  lines.push('# Third-party licenses');
  lines.push('');
  lines.push(
    '<!-- GENERATED FILE — do not edit by hand. Regenerate with `pnpm generate:notices`',
  );
  lines.push(
    '     (scripts/generate-third-party-notices.ts). CI fails if this file is stale. -->',
  );
  lines.push('');
  lines.push(
    'OpenThrottle is distributed under the Apache License 2.0. This file aggregates the',
  );
  lines.push(
    'license attributions for the third-party packages in the installed dependency graph,',
  );
  lines.push(
    'satisfying Apache-2.0 §4 attribution obligations. Each dependency also ships its own',
  );
  lines.push(
    'complete license text inside its package under `node_modules`. Licenses that carry a',
  );
  lines.push(
    'specific notice obligation are reproduced in full at the end of this file.',
  );
  lines.push('');
  lines.push(
    'Platform-specific prebuilt binaries (packages that declare `os`/`cpu`, e.g.',
  );
  lines.push(
    '`@rollup/rollup-linux-x64-gnu`, `fsevents`) are omitted: which ones install depends on',
  );
  lines.push(
    'the host OS, and each shares the license of the cross-platform toolchain already listed.',
  );
  lines.push('');
  lines.push(`**${rows.length}** third-party packages.`);
  lines.push('');
  lines.push('## License summary');
  lines.push('');
  lines.push('| License | Packages |');
  lines.push('| --- | --- |');
  for (const [license, count] of summary) {
    lines.push(`| ${license} | ${count} |`);
  }
  lines.push('');
  lines.push('## Packages');
  lines.push('');
  lines.push('| Package | Version(s) | License | Attribution |');
  lines.push('| --- | --- | --- | --- |');
  for (const row of rows) {
    const attribution = row.homepage
      ? `[${row.author ?? 'source'}](${row.homepage})`
      : (row.author ?? '');
    lines.push(
      `| \`${row.name}\` | ${row.versions.join(', ')} | ${row.license} | ${attribution} |`,
    );
  }
  lines.push('');

  if (embedded.length > 0) {
    lines.push('## Full license texts (notice-required dependencies)');
    lines.push('');
    for (const notice of embedded) {
      lines.push(`### ${notice.package} — ${notice.license}`);
      lines.push('');
      lines.push('```');
      lines.push(notice.text.trimEnd());
      lines.push('```');
      lines.push('');
    }
  }

  return `${lines.join('\n').trimEnd()}\n`;
};

const LICENSE_FILENAMES = [
  'LICENSE',
  'LICENSE.md',
  'LICENSE.txt',
  'LICENCE',
  'LICENCE.md',
  'LICENSE-MIT',
];

const findPackagePath = (
  output: PnpmLicensesOutput,
  name: string,
): string | undefined => {
  for (const packages of Object.values(output)) {
    for (const pkg of packages) {
      if (pkg.name === name) {
        return pkg.paths?.[0];
      }
    }
  }
  return undefined;
};

const readBundledLicense = async (
  directory: string,
): Promise<string | undefined> => {
  // Read every candidate filename concurrently, then take the first that resolved
  // (order preserved by the map) — avoids a sequential await-in-loop.
  const candidates = await Promise.all(
    LICENSE_FILENAMES.map((filename) =>
      readFile(join(directory, filename), 'utf8').then(
        (text) => text,
        () => undefined,
      ),
    ),
  );
  return candidates.find((text) => text !== undefined);
};

/**
 * @description Read the full bundled license text for every waiver marked `notice: true`.
 */
export const collectEmbeddedNotices = async (
  output: PnpmLicensesOutput,
  policy: LicensePolicy,
): Promise<EmbeddedNotice[]> => {
  const noticeExceptions = policy.exceptions
    .filter((exception) => exception.notice)
    .sort((a, b) => compareCodeUnits(a.package, b.package));

  return Promise.all(
    noticeExceptions.map(async (exception) => {
      const directory = findPackagePath(output, exception.package);
      const text = directory ? await readBundledLicense(directory) : undefined;
      return {
        license: exception.license,
        package: exception.package,
        text:
          text ??
          `(bundled license text for ${exception.package} not found at install time; see ${exception.license})`,
      };
    }),
  );
};

const OUTPUT_FILENAME = 'THIRD-PARTY-LICENSES.md';

/** Matches a package row (`| \`name\` | …`) so the drift diff can name packages. */
const PACKAGE_ROW = /^\| `([^`]+)` \|/;

/**
 * @description Line-level diff between the committed manifest and the one freshly
 * rendered on this host, used by `--check` to show WHAT drifted. Manifest lines are
 * unique (package rows, summary counts), so an order-preserving set difference
 * pinpoints the changed rows without a full LCS. `added` = lines only in the
 * freshly-rendered output (e.g. a platform-specific package that leaked in on this
 * OS); `removed` = lines only in the committed file. Exported for unit testing.
 */
export const diffManifestLines = (
  existing: string,
  rendered: string,
): { added: string[]; removed: string[] } => {
  const existingLines = new Set(existing.split('\n'));
  const renderedLines = new Set(rendered.split('\n'));
  return {
    added: rendered.split('\n').filter((line) => !existingLines.has(line)),
    removed: existing.split('\n').filter((line) => !renderedLines.has(line)),
  };
};

/** Pull the package names out of any package-table rows in a set of diff lines. */
export const packageNamesFromLines = (lines: readonly string[]): string[] =>
  lines
    .map((line) => line.match(PACKAGE_ROW)?.[1])
    .filter((name): name is string => name !== undefined);

/**
 * @description Emit the drift detail behind the "out of date" failure to stderr: the
 * package names that appear only on this host vs only in the committed file (the usual
 * culprit is an `os`/`cpu`-specific package not yet handled by
 * `collectPlatformSpecificPackages`), followed by the raw line diff (capped).
 */
const MAX_DIFF_LINES = 40;
export const logManifestDrift = (
  existing: string,
  rendered: string,
  log: (message: string) => void = logger.detail,
): void => {
  const { added, removed } = diffManifestLines(existing, rendered);
  log(
    `   Freshly generated on this host differs from the committed ${OUTPUT_FILENAME} by ` +
      `${added.length} added / ${removed.length} removed line(s).`,
  );

  const addedPackages = packageNamesFromLines(added);
  const removedPackages = packageNamesFromLines(removed);
  if (addedPackages.length > 0) {
    log(
      `   Packages only in the freshly-generated manifest (present on THIS host — ` +
        `likely a platform-specific package to exclude): ${addedPackages.join(', ')}`,
    );
  }
  if (removedPackages.length > 0) {
    log(
      `   Packages only in the committed manifest (absent on this host): ${removedPackages.join(', ')}`,
    );
  }

  log('   ---- line diff (freshly-generated vs committed) ----');
  for (const line of added.slice(0, MAX_DIFF_LINES)) log(`   + ${line}`);
  for (const line of removed.slice(0, MAX_DIFF_LINES)) log(`   - ${line}`);
  if (added.length > MAX_DIFF_LINES || removed.length > MAX_DIFF_LINES) {
    log(
      `   … diff truncated at ${MAX_DIFF_LINES} lines each; run \`pnpm generate:notices\` locally for the full result.`,
    );
  }
};

async function main(): Promise<void> {
  const cwd = process.cwd();
  const checkMode = hasFlag('check');
  const policy: LicensePolicy = JSON.parse(
    await readFile(join(cwd, 'license-policy.json'), 'utf8'),
  );

  const output = readInstalledLicenses(cwd);
  const excludedPackages = await collectPlatformSpecificPackages(output);
  const rows = collectAttributions(output, policy, excludedPackages);
  const embedded = await collectEmbeddedNotices(output, policy);
  const rendered = renderThirdPartyNotices(rows, embedded);

  const outputPath = join(cwd, OUTPUT_FILENAME);

  if (checkMode) {
    const existing = await readFile(outputPath, 'utf8').catch(() => '');
    if (existing !== rendered) {
      logger.fail(
        `${OUTPUT_FILENAME} is out of date. Run \`pnpm generate:notices\` and commit the result.`,
      );
      logManifestDrift(existing, rendered);
      process.exit(1);
    }

    logger.success(
      `${OUTPUT_FILENAME} is up to date (${rows.length} packages).`,
    );

    return;
  }

  await writeFile(outputPath, rendered, 'utf8');
  logger.success(`Wrote ${OUTPUT_FILENAME} (${rows.length} packages).`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
