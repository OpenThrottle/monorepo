import { describe, expect, it } from 'vitest';

import {
  evaluateCompliance,
  formatReport,
  isExpressionAllowed,
  type LicensePolicy,
  type PnpmLicensesOutput,
  resolveEffectiveLicense,
  tokenizeSpdx,
} from './check-license-compliance.ts';

const ALLOW = new Set([
  '0BSD',
  'Apache-2.0',
  'BSD-3-Clause',
  'ISC',
  'MIT',
  'MPL-2.0',
  'Unlicense',
  'WTFPL',
  'Zlib',
]);

const policy: LicensePolicy = {
  allow: [...ALLOW],
  deny: ['AGPL-3.0-or-later', 'Commercial', 'GPL-3.0-only'],
  exceptions: [
    {
      license: 'LicenseRef-PolyForm-Shield-1.0.0',
      notice: true,
      package: '@paper-design/shaders-react',
      reason: 'Source-available non-compete; owner-approved waiver.',
      scope: 'runtime',
    },
    {
      license: 'Commercial',
      package: '@nx/gcs-cache',
      reason: 'Nx Powerpack, build-time only.',
      scope: 'build-tooling',
    },
  ],
  resolvedUnknowns: {
    '@browserbasehq/sdk': 'Apache-2.0',
    union: 'MIT',
  },
};

describe('tokenizeSpdx', () => {
  it('splits ids, operators, and parentheses', () => {
    expect(tokenizeSpdx('(MIT OR Apache-2.0)')).toEqual([
      '(',
      'MIT',
      'OR',
      'Apache-2.0',
      ')',
    ]);
  });

  it('handles bare ids and extra whitespace', () => {
    expect(tokenizeSpdx('  MIT  ')).toEqual(['MIT']);
  });
});

describe('isExpressionAllowed', () => {
  it('allows a bare permitted id', () => {
    expect(isExpressionAllowed('MIT', ALLOW)).toBe(true);
  });

  it('denies a bare non-permitted id', () => {
    expect(isExpressionAllowed('AGPL-3.0-or-later', ALLOW)).toBe(false);
    expect(isExpressionAllowed('Unknown', ALLOW)).toBe(false);
    expect(isExpressionAllowed('Commercial', ALLOW)).toBe(false);
  });

  it('OR passes when any operand is allowed', () => {
    expect(isExpressionAllowed('MIT OR Apache-2.0', ALLOW)).toBe(true);
    expect(isExpressionAllowed('(MPL-2.0 OR Apache-2.0)', ALLOW)).toBe(true);
    expect(isExpressionAllowed('(Apache-2.0 OR MPL-1.1)', ALLOW)).toBe(true);
    expect(isExpressionAllowed('(AFL-2.1 OR BSD-3-Clause)', ALLOW)).toBe(true);
  });

  it('OR fails only when every operand is disallowed', () => {
    expect(isExpressionAllowed('GPL-3.0-only OR SSPL-1.0', ALLOW)).toBe(false);
  });

  it('AND passes only when every operand is allowed', () => {
    expect(isExpressionAllowed('(Apache-2.0 AND BSD-3-Clause)', ALLOW)).toBe(
      true,
    );
    expect(isExpressionAllowed('MIT AND ISC', ALLOW)).toBe(true);
    expect(isExpressionAllowed('(MIT AND Zlib)', ALLOW)).toBe(true);
    expect(isExpressionAllowed('MIT AND MPL-2.0', ALLOW)).toBe(true);
  });

  it('AND fails if any operand is disallowed', () => {
    expect(isExpressionAllowed('MIT AND GPL-3.0-only', ALLOW)).toBe(false);
    expect(isExpressionAllowed('(MIT AND Commercial)', ALLOW)).toBe(false);
  });

  it('respects AND binding tighter than OR', () => {
    // GPL-3.0-only AND Zlib is false, but MIT OR (…) is true.
    expect(isExpressionAllowed('MIT OR GPL-3.0-only AND Zlib', ALLOW)).toBe(
      true,
    );
    // (GPL AND MIT) is false and Unknown is false → whole thing false.
    expect(isExpressionAllowed('GPL-3.0-only AND MIT OR Unknown', ALLOW)).toBe(
      false,
    );
  });

  it('judges a WITH leaf on its base id', () => {
    expect(isExpressionAllowed('Apache-2.0 WITH LLVM-exception', ALLOW)).toBe(
      true,
    );
    expect(
      isExpressionAllowed('GPL-3.0-only WITH Classpath-exception-2.0', ALLOW),
    ).toBe(false);
  });

  it('fails closed on empty or malformed expressions', () => {
    expect(isExpressionAllowed('', ALLOW)).toBe(false);
    expect(isExpressionAllowed('(MIT', ALLOW)).toBe(false);
    expect(isExpressionAllowed('MIT Apache-2.0', ALLOW)).toBe(false);
  });
});

describe('resolveEffectiveLicense', () => {
  it('overrides Unknown from resolvedUnknowns', () => {
    expect(
      resolveEffectiveLicense('union', 'Unknown', policy.resolvedUnknowns),
    ).toBe('MIT');
  });

  it('leaves a detected license untouched', () => {
    expect(
      resolveEffectiveLicense('react', 'MIT', policy.resolvedUnknowns),
    ).toBe('MIT');
  });

  it('leaves an unresolved Unknown as Unknown', () => {
    expect(
      resolveEffectiveLicense('mystery', 'Unknown', policy.resolvedUnknowns),
    ).toBe('Unknown');
  });
});

describe('evaluateCompliance', () => {
  it('passes a clean graph with no violations', () => {
    const output: PnpmLicensesOutput = {
      'Apache-2.0': [{ license: 'Apache-2.0', name: 'axios', versions: ['1'] }],
      MIT: [{ license: 'MIT', name: 'react', versions: ['19'] }],
    };
    const result = evaluateCompliance(output, policy);
    expect(result.violations).toEqual([]);
  });

  it('flags a disallowed copyleft license', () => {
    const output: PnpmLicensesOutput = {
      'AGPL-3.0-or-later': [
        { license: 'AGPL-3.0-or-later', name: 'ua-parser-js', versions: ['2'] },
      ],
    };
    const result = evaluateCompliance(output, policy);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]).toMatchObject({
      package: 'ua-parser-js',
      reason: 'disallowed',
    });
  });

  it('flags an unresolved Unknown as reason "unknown"', () => {
    const output: PnpmLicensesOutput = {
      Unknown: [{ license: 'Unknown', name: 'mystery-pkg', versions: ['0.1'] }],
    };
    const result = evaluateCompliance(output, policy);
    expect(result.violations[0]).toMatchObject({
      package: 'mystery-pkg',
      reason: 'unknown',
    });
  });

  it('resolves a known Unknown via resolvedUnknowns without a violation', () => {
    const output: PnpmLicensesOutput = {
      Unknown: [
        { license: 'Unknown', name: '@browserbasehq/sdk', versions: ['2'] },
        { license: 'Unknown', name: 'union', versions: ['0.5.0'] },
      ],
    };
    const result = evaluateCompliance(output, policy);
    expect(result.violations).toEqual([]);
  });

  it('waives a package covered by an exception regardless of its license', () => {
    const output: PnpmLicensesOutput = {
      Commercial: [
        { license: 'Commercial', name: '@nx/gcs-cache', versions: ['5'] },
      ],
      Unknown: [
        {
          license: 'Unknown',
          name: '@paper-design/shaders-react',
          versions: ['0.0.76'],
        },
      ],
    };
    const result = evaluateCompliance(output, policy);
    expect(result.violations).toEqual([]);
    expect(result.waived.map((entry) => entry.package).sort()).toEqual([
      '@nx/gcs-cache',
      '@paper-design/shaders-react',
    ]);
  });

  it('reports stale policy entries that match nothing installed', () => {
    const output: PnpmLicensesOutput = {
      MIT: [{ license: 'MIT', name: 'react', versions: ['19'] }],
    };
    const result = evaluateCompliance(output, policy);
    // None of the resolvedUnknowns/exceptions packages are installed here.
    expect(result.staleEntries.sort()).toEqual(
      [
        '@browserbasehq/sdk',
        '@nx/gcs-cache',
        '@paper-design/shaders-react',
        'union',
      ].sort(),
    );
  });
});

describe('formatReport', () => {
  it('reports success with a checkmark', () => {
    const report = formatReport({
      staleEntries: [],
      violations: [],
      waived: [],
    });
    expect(report).toContain('✅');
  });

  it('lists each violation and a remediation hint', () => {
    const report = formatReport({
      staleEntries: [],
      violations: [
        {
          license: 'AGPL-3.0-or-later',
          package: 'ua-parser-js',
          reason: 'disallowed',
          versions: ['2.0.9'],
        },
      ],
      waived: [],
    });
    expect(report).toContain('❌');
    expect(report).toContain('ua-parser-js@2.0.9');
    expect(report).toContain('license-policy.json');
  });
});
