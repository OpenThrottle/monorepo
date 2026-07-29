import { describe, expect, it } from 'vitest';

import type {
  LicensePolicy,
  PnpmLicensesOutput,
} from './check-license-compliance.ts';
import {
  type Attribution,
  collectAttributions,
  isFirstParty,
  normalizeAuthor,
  renderThirdPartyNotices,
} from './generate-third-party-notices.ts';

const policy: LicensePolicy = {
  allow: ['Apache-2.0', 'MIT'],
  exceptions: [],
  resolvedUnknowns: { '@browserbasehq/sdk': 'Apache-2.0' },
};

describe('isFirstParty', () => {
  it('flags workspace scopes and the root package', () => {
    expect(isFirstParty('@openthrottle/react-router-chat')).toBe(true);
    expect(isFirstParty('@tools/generators')).toBe(true);
    expect(isFirstParty('monorepo')).toBe(true);
  });

  it('does not flag third-party packages', () => {
    expect(isFirstParty('react')).toBe(false);
    expect(isFirstParty('@paper-design/shaders')).toBe(false);
  });
});

describe('collectAttributions', () => {
  it('excludes first-party packages and sorts by name', () => {
    const output: PnpmLicensesOutput = {
      MIT: [
        { license: 'MIT', name: 'react', versions: ['19'] },
        {
          license: 'MIT',
          name: '@openthrottle/react-router-utils',
          versions: ['1'],
        },
        { license: 'MIT', name: 'axios', versions: ['1.7'] },
      ],
    };
    const rows = collectAttributions(output, policy);
    expect(rows.map((row) => row.name)).toEqual(['axios', 'react']);
  });

  it('applies resolvedUnknowns to the reported license', () => {
    const output: PnpmLicensesOutput = {
      Unknown: [
        { license: 'Unknown', name: '@browserbasehq/sdk', versions: ['2'] },
      ],
    };
    const rows = collectAttributions(output, policy);
    expect(rows[0].license).toBe('Apache-2.0');
  });

  it('uses a waiver license over pnpm Unknown for excepted packages', () => {
    const waived: LicensePolicy = {
      allow: ['MIT'],
      exceptions: [
        {
          license: 'LicenseRef-PolyForm-Shield-1.0.0',
          notice: true,
          package: '@paper-design/shaders',
          reason: 'waived',
          scope: 'runtime',
        },
      ],
      resolvedUnknowns: {},
    };
    const output: PnpmLicensesOutput = {
      Unknown: [
        { license: 'Unknown', name: '@paper-design/shaders', versions: ['0'] },
      ],
    };
    const rows = collectAttributions(output, waived);
    expect(rows[0].license).toBe('LicenseRef-PolyForm-Shield-1.0.0');
  });
});

describe('normalizeAuthor', () => {
  it('passes through a string author', () => {
    expect(normalizeAuthor('Jane Dev')).toBe('Jane Dev');
  });

  it('extracts the name from an object author', () => {
    expect(normalizeAuthor({ email: 'j@x.dev', name: 'Jane Dev' })).toBe(
      'Jane Dev',
    );
  });

  it('returns undefined for empty or unusable authors', () => {
    expect(normalizeAuthor('')).toBeUndefined();
    expect(normalizeAuthor(undefined)).toBeUndefined();
    expect(normalizeAuthor({ email: 'j@x.dev' })).toBeUndefined();
  });
});

describe('renderThirdPartyNotices', () => {
  const rows: Attribution[] = [
    {
      author: 'Jane',
      homepage: 'https://example.com',
      license: 'MIT',
      name: 'axios',
      versions: ['1.7'],
    },
    { license: 'Apache-2.0', name: 'zod', versions: ['3'] },
  ];

  it('renders a deterministic document with summary and package table', () => {
    const doc = renderThirdPartyNotices(rows, []);
    expect(doc).toContain('# Third-party licenses');
    expect(doc).toContain('**2** third-party packages.');
    expect(doc).toContain(
      '| `axios` | 1.7 | MIT | [Jane](https://example.com) |',
    );
    expect(doc).toContain('| `zod` | 3 | Apache-2.0 |');
    // Same input → identical output (drift-guard stability).
    expect(renderThirdPartyNotices(rows, [])).toBe(doc);
    expect(doc.endsWith('\n')).toBe(true);
  });

  it('embeds full license text for notice-required dependencies', () => {
    const doc = renderThirdPartyNotices(rows, [
      {
        license: 'LicenseRef-PolyForm-Shield-1.0.0',
        package: '@paper-design/shaders',
        text: 'PolyForm Shield License 1.0.0\n\n...full text...',
      },
    ]);
    expect(doc).toContain(
      '## Full license texts (notice-required dependencies)',
    );
    expect(doc).toContain(
      '### @paper-design/shaders — LicenseRef-PolyForm-Shield-1.0.0',
    );
    expect(doc).toContain('PolyForm Shield License 1.0.0');
  });
});
