#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  type LicensePolicy,
  type PnpmLicensesOutput,
  readInstalledLicenses,
  resolveEffectiveLicense,
} from './check-license-compliance.ts';

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
      if (isFirstParty(pkg.name)) {
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
        versions: [...(pkg.versions ?? [])].sort(),
      });
    }
  }
  return rows.sort(
    (a, b) =>
      a.name.localeCompare(b.name) ||
      a.versions.join(',').localeCompare(b.versions.join(',')),
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
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  );

  const lines: string[] = [];
  lines.push('# Third-party licenses');
  lines.push('');
  lines.push(
    '<!-- GENERATED FILE — do not edit by hand. Regenerate with `pnpm notice:generate`',
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
    .sort((a, b) => a.package.localeCompare(b.package));

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

async function main(): Promise<void> {
  const cwd = process.cwd();
  const checkMode = process.argv.includes('--check');
  const policy: LicensePolicy = JSON.parse(
    await readFile(join(cwd, 'license-policy.json'), 'utf8'),
  );

  const output = readInstalledLicenses(cwd);
  const rows = collectAttributions(output, policy);
  const embedded = await collectEmbeddedNotices(output, policy);
  const rendered = renderThirdPartyNotices(rows, embedded);

  const outputPath = join(cwd, OUTPUT_FILENAME);

  if (checkMode) {
    const existing = await readFile(outputPath, 'utf8').catch(() => '');
    if (existing !== rendered) {
      console.error(
        `❌ ${OUTPUT_FILENAME} is out of date. Run \`pnpm notice:generate\` and commit the result.`,
      );
      process.exit(1);
    }
    console.log(
      `✅ ${OUTPUT_FILENAME} is up to date (${rows.length} packages).`,
    );
    return;
  }

  await writeFile(outputPath, rendered, 'utf8');
  console.log(`✅ Wrote ${OUTPUT_FILENAME} (${rows.length} packages).`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
