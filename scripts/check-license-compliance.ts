#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * @description Dependency-license compliance gate. Reads the installed dependency graph
 * from `pnpm licenses list --json`, applies the allowlist policy in `license-policy.json`,
 * and exits non-zero on any disallowed OR undetected ("Unknown") license — preventing a
 * repeat of the ua-parser-js AGPL slip. Allowlist-based / default-deny: a package passes
 * only if every license in its SPDX expression is allowed, or the package carries a
 * documented waiver. See CONTRIBUTING.md § Dependency licenses.
 */

/** A single package entry as emitted under a license bucket by `pnpm licenses list --json`. */
export interface PnpmLicensePackage {
  author?: string;
  description?: string;
  homepage?: string;
  license: string;
  name: string;
  paths?: string[];
  versions?: string[];
}

/** `pnpm licenses list --json` output: a map of license-expression → packages. */
export type PnpmLicensesOutput = Record<string, PnpmLicensePackage[]>;

/** A package-scoped waiver that overrides an otherwise-flagged license. */
export interface LicenseException {
  license: string;
  notice?: boolean;
  package: string;
  reason: string;
  scope: string;
}

/** The parsed `license-policy.json`. */
export interface LicensePolicy {
  allow: string[];
  deny?: string[];
  description?: string;
  exceptions: LicenseException[];
  resolvedUnknowns: Record<string, string>;
}

/** A dependency that fails the policy. */
export interface Violation {
  homepage?: string;
  license: string;
  package: string;
  reason: 'disallowed' | 'unknown';
  versions: string[];
}

/** Outcome of applying the policy to a `pnpm licenses list --json` payload. */
export interface ComplianceResult {
  /** `resolvedUnknowns` keys / `exceptions` packages that matched no installed package. */
  staleEntries: string[];
  violations: Violation[];
  /** Packages permitted by an `exceptions` waiver, with the waiver applied. */
  waived: Array<{ exception: LicenseException; package: string }>;
}

const LICENSE_TOKEN = /\s+|(?=[()])|(?<=[()])/;

/**
 * @description Tokenize an SPDX license expression into ids, parentheses, and the
 * `AND`/`OR`/`WITH` operators. Empty tokens are dropped.
 */
export const tokenizeSpdx = (expression: string): string[] =>
  expression
    .split(LICENSE_TOKEN)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);

/**
 * @description Evaluate an SPDX license expression against the allowlist. Implements the
 * SPDX operator semantics: `OR` passes if ANY operand is allowed (you may elect the
 * permissive side of a dual license), `AND` passes only if EVERY operand is allowed, and
 * `AND` binds tighter than `OR`. A leaf `<id> WITH <exception>` is judged on its base id.
 * An unparseable or empty expression is treated as not allowed (fail closed).
 */
export const isExpressionAllowed = (
  expression: string,
  allow: ReadonlySet<string>,
): boolean => {
  const tokens = tokenizeSpdx(expression);
  if (tokens.length === 0) {
    return false;
  }

  let position = 0;

  const peek = (): string | undefined => tokens[position];
  const next = (): string | undefined => tokens[position++];

  const parseLeaf = (): boolean => {
    const token = next();
    if (token === undefined) {
      throw new Error('Unexpected end of license expression');
    }
    if (token === '(') {
      const value = parseOr();
      if (next() !== ')') {
        throw new Error('Unbalanced parentheses in license expression');
      }
      return value;
    }
    // `<id> WITH <exception>` — judge on the base id (or the full string if allowlisted).
    if (peek() === 'WITH') {
      next(); // consume WITH
      const exceptionId = next();
      const full = `${token} WITH ${exceptionId}`;
      return allow.has(full) || allow.has(token);
    }
    return allow.has(token);
  };

  const parseAnd = (): boolean => {
    let value = parseLeaf();
    while (peek() === 'AND') {
      next();
      // Evaluate the right side regardless of short-circuit so the parser advances.
      const right = parseLeaf();
      value = value && right;
    }
    return value;
  };

  function parseOr(): boolean {
    let value = parseAnd();
    while (peek() === 'OR') {
      next();
      const right = parseAnd();
      value = value || right;
    }
    return value;
  }

  try {
    const result = parseOr();
    if (position !== tokens.length) {
      // Trailing tokens → malformed expression; fail closed.
      return false;
    }
    return result;
  } catch {
    // Unbalanced parens or any other parse error → fail closed.
    return false;
  }
};

/**
 * @description Resolve a package's effective license expression, applying a
 * `resolvedUnknowns` override when pnpm reported `Unknown`.
 */
export const resolveEffectiveLicense = (
  name: string,
  reportedLicense: string,
  resolvedUnknowns: Record<string, string>,
): string => {
  if (reportedLicense === 'Unknown' && resolvedUnknowns[name] !== undefined) {
    return resolvedUnknowns[name];
  }
  return reportedLicense;
};

/**
 * @description Pure policy application. Flattens the pnpm payload, applies waivers and
 * `resolvedUnknowns`, evaluates each remaining package against the allowlist, and reports
 * violations, applied waivers, and stale policy entries. Exported for unit testing.
 */
export const evaluateCompliance = (
  output: PnpmLicensesOutput,
  policy: LicensePolicy,
): ComplianceResult => {
  const allow = new Set(policy.allow);
  const exceptionsByPackage = new Map(
    policy.exceptions.map((exception) => [exception.package, exception]),
  );

  const violations: Violation[] = [];
  const waived: ComplianceResult['waived'] = [];
  const matchedPackages = new Set<string>();

  for (const packages of Object.values(output)) {
    for (const pkg of packages) {
      const exception = exceptionsByPackage.get(pkg.name);
      if (exception !== undefined) {
        matchedPackages.add(pkg.name);
        waived.push({ exception, package: pkg.name });
        continue;
      }

      const effective = resolveEffectiveLicense(
        pkg.name,
        pkg.license,
        policy.resolvedUnknowns,
      );
      if (policy.resolvedUnknowns[pkg.name] !== undefined) {
        matchedPackages.add(pkg.name);
      }

      if (isExpressionAllowed(effective, allow)) {
        continue;
      }

      violations.push({
        homepage: pkg.homepage,
        license: effective,
        package: pkg.name,
        reason: effective === 'Unknown' ? 'unknown' : 'disallowed',
        versions: pkg.versions ?? [],
      });
    }
  }

  const declaredPackages = [
    ...Object.keys(policy.resolvedUnknowns),
    ...policy.exceptions.map((exception) => exception.package),
  ];
  const staleEntries = [...new Set(declaredPackages)].filter(
    (name) => !matchedPackages.has(name),
  );

  return { staleEntries, violations, waived };
};

/**
 * @description Render a human-readable compliance report. Returns the text; the caller
 * decides the exit code from `result.violations`.
 */
export const formatReport = (result: ComplianceResult): string => {
  const lines: string[] = [];
  const { staleEntries, violations, waived } = result;

  if (waived.length > 0) {
    lines.push(
      `ℹ️  ${waived.length} package(s) permitted by documented waiver:`,
    );
    for (const { exception, package: name } of waived) {
      lines.push(`   • ${name} — ${exception.license} (${exception.scope})`);
    }
    lines.push('');
  }

  if (staleEntries.length > 0) {
    lines.push(
      `⚠️  ${staleEntries.length} policy entry/entries no longer match any installed package (safe to remove from license-policy.json):`,
    );
    for (const name of staleEntries) {
      lines.push(`   • ${name}`);
    }
    lines.push('');
  }

  if (violations.length === 0) {
    lines.push('✅ All dependency licenses satisfy the policy.');
    return lines.join('\n');
  }

  lines.push('❌ Disallowed or undetected dependency licenses found:\n');
  for (const violation of violations) {
    const versions =
      violation.versions.length > 0 ? `@${violation.versions.join(', ')}` : '';
    const homepage = violation.homepage ? ` — ${violation.homepage}` : '';
    const hint =
      violation.reason === 'unknown'
        ? 'undetected license: verify the bundled LICENSE text, then add it to resolvedUnknowns or exceptions'
        : 'license not on the allowlist';
    lines.push(
      `  ${violation.package}${versions}: "${violation.license}" (${hint})${homepage}`,
    );
  }
  lines.push(
    `\n${violations.length} violation(s). Permit a license by adding its SPDX id to \`allow\`, resolve an Unknown via \`resolvedUnknowns\`, or file a package-scoped waiver under \`exceptions\` in license-policy.json. See CONTRIBUTING.md § Dependency licenses.`,
  );
  return lines.join('\n');
};

/**
 * @description Run `pnpm licenses list --json` and parse it. The workspace graph is large
 * (~2800 packages), so the stdout buffer is generously sized.
 */
export const readInstalledLicenses = (cwd: string): PnpmLicensesOutput => {
  const stdout = execFileSync('pnpm', ['licenses', 'list', '--json'], {
    cwd,
    encoding: 'utf8',
    maxBuffer: 128 * 1024 * 1024,
  });
  // JSON.parse returns `any`; assigning to a typed const narrows without an assertion.
  const parsed: PnpmLicensesOutput = JSON.parse(stdout);
  return parsed;
};

const parseArg = (flag: string): string | undefined => {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
};

async function main(): Promise<void> {
  const cwd = process.cwd();
  const policyPath = parseArg('--policy') ?? join(cwd, 'license-policy.json');
  const policy: LicensePolicy = JSON.parse(await readFile(policyPath, 'utf8'));

  const fixturePath = parseArg('--json');
  const output: PnpmLicensesOutput = fixturePath
    ? JSON.parse(await readFile(fixturePath, 'utf8'))
    : readInstalledLicenses(cwd);

  const result = evaluateCompliance(output, policy);
  const report = formatReport(result);

  if (result.violations.length > 0) {
    console.error(report);
    process.exit(1);
  }

  console.log(report);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
