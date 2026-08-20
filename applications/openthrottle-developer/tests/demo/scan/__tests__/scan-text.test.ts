import { describe, expect, test } from 'vitest';

import { scanText } from '../scan-text';

/**
 * These tests are the negative proof for the publish gate. The gate's whole value is
 * that it fails on a real leak, so each case here is a leak that has actually been
 * seen (or nearly shipped) in this project.
 */
describe('scanText', () => {
  test('fails on the hard-coded home directory that renders on the plan-create page', () => {
    const findings = scanText(
      'hook.txt',
      'Cursor Claude VSCode /Users/matt/Development/openthrottle',
      'frame',
    );

    expect(
      findings.some(
        (finding) =>
          finding.rule === 'home-path' && finding.severity === 'error',
      ),
    ).toBe(true);
  });

  test('fails on a real email address but allows the fictional demo domain', () => {
    const real = scanText(
      'hook.txt',
      'signed in as someone@example-company.com',
      'frame',
    );
    const demo = scanText(
      'hook.txt',
      'signed in as ada@atlasworks.example',
      'frame',
    );

    expect(real.some((finding) => finding.rule === 'email-address')).toBe(true);
    expect(demo.some((finding) => finding.rule === 'email-address')).toBe(
      false,
    );
  });

  test('fails on provider token prefixes and on a JWT', () => {
    const token = scanText(
      'hook.txt',
      'GITHUB_TOKEN=ghp_abcdefghijklmnopqrstuvwxyz01',
      'frame',
    );
    const jwt = scanText(
      'hook.txt',
      'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhZGEtdGVzdCJ9.c2lnbmF0dXJlLXZhbHVl',
      'frame',
    );

    expect(
      token.some(
        (finding) =>
          finding.rule === 'token-prefix' && finding.severity === 'error',
      ),
    ).toBe(true);
    expect(
      jwt.some(
        (finding) => finding.rule === 'jwt' && finding.severity === 'error',
      ),
    ).toBe(true);
  });

  test('fails a denylisted real name in a FRAME — it means the wrong database was recorded', () => {
    const findings = scanText(
      'hook.txt',
      'Plan: migrate OpenThrottle/monorepo to Nx 22',
      'frame',
    );

    expect(
      findings.some(
        (finding) =>
          finding.rule === 'denylist' && finding.severity === 'error',
      ),
    ).toBe(true);
  });

  test('allows the same denylisted name in SHIPPED text, where the description block needs it', () => {
    const findings = scanText(
      'metadata.json',
      'Repo: https://github.com/OpenThrottle/monorepo',
      'shipped',
    );

    expect(findings.some((finding) => finding.rule === 'denylist')).toBe(false);
    expect(
      findings.filter((finding) => finding.severity === 'error'),
    ).toHaveLength(0);
  });

  test('does not report a URL as high entropy, and allows an expected host', () => {
    const findings = scanText(
      'hook.txt',
      'open http://localhost:6020/plans to continue',
      'frame',
    );

    expect(findings).toHaveLength(0);
  });

  test('warns rather than fails on a long opaque string, which is often just a hash', () => {
    const findings = scanText(
      'hook.txt',
      `sha ${'a1b2c3d4'.repeat(5)}`,
      'frame',
    );

    expect(findings.every((finding) => finding.severity === 'warn')).toBe(true);
    expect(findings.some((finding) => finding.rule === 'high-entropy')).toBe(
      true,
    );
  });

  test('a clean demo frame produces nothing at all', () => {
    const findings = scanText(
      'payoff.txt',
      'Plans  Add rate limiting to the public API  3 tasks atlas-api atlas-ada Pending',
      'frame',
    );

    expect(findings).toHaveLength(0);
  });
});
