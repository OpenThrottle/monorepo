import { afterEach, describe, expect, test, vi } from 'vitest';
import { buildCsp, generateCspNonce } from '../csp';

const NONCE = 'test-nonce-value';

const getDirective = (value: string, name: string): string | undefined =>
  value
    .split('; ')
    .find(
      (directive) => directive.startsWith(`${name} `) || directive === name,
    );

describe('buildCsp', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test('forces Report-Only outside production even when reportOnly is false', () => {
    vi.stubEnv('NODE_ENV', 'development');

    const { headerName } = buildCsp(NONCE, { reportOnly: false });

    expect(headerName).toBe('Content-Security-Policy-Report-Only');
  });

  test('emits the enforcing header in production when reportOnly is false', () => {
    vi.stubEnv('NODE_ENV', 'production');

    const { headerName } = buildCsp(NONCE, { reportOnly: false });

    expect(headerName).toBe('Content-Security-Policy');
  });

  test('stays Report-Only in production when reportOnly is true', () => {
    vi.stubEnv('NODE_ENV', 'production');

    const { headerName } = buildCsp(NONCE, { reportOnly: true });

    expect(headerName).toBe('Content-Security-Policy-Report-Only');
  });

  test('script-src carries the nonce + strict-dynamic and never unsafe-inline or wildcards', () => {
    vi.stubEnv('NODE_ENV', 'production');

    const { value } = buildCsp(NONCE, { reportOnly: true });
    const scriptSrc = getDirective(value, 'script-src');

    expect(scriptSrc).toBe(
      `script-src 'self' 'nonce-${NONCE}' 'strict-dynamic'`,
    );
    expect(scriptSrc).not.toContain(`'unsafe-inline'`);
    expect(scriptSrc).not.toContain('https:');
  });

  test('derives connect-src origins (http + ws equivalent) from an http apiUrl', () => {
    vi.stubEnv('NODE_ENV', 'production');

    const { value } = buildCsp(NONCE, {
      apiUrl: 'http://localhost:6021',
      reportOnly: true,
    });

    expect(getDirective(value, 'connect-src')).toBe(
      `connect-src 'self' http://localhost:6021 ws://localhost:6021`,
    );
  });

  test('derives connect-src origins (https + wss equivalent) from an https apiUrl', () => {
    vi.stubEnv('NODE_ENV', 'production');

    const { value } = buildCsp(NONCE, {
      apiUrl: 'https://api.example.com/graphql',
      reportOnly: true,
    });

    expect(getDirective(value, 'connect-src')).toBe(
      `connect-src 'self' https://api.example.com wss://api.example.com`,
    );
  });

  test('degrades to connect-src self with no report directives when apiUrl is absent', () => {
    vi.stubEnv('NODE_ENV', 'production');

    const { reportingEndpoints, value } = buildCsp(NONCE, {
      reportOnly: true,
    });

    expect(getDirective(value, 'connect-src')).toBe(`connect-src 'self'`);
    expect(value).not.toContain('report-uri');
    expect(value).not.toContain('report-to');
    expect(reportingEndpoints).toBeUndefined();
  });

  test('degrades gracefully when apiUrl is unparseable', () => {
    vi.stubEnv('NODE_ENV', 'production');

    const { reportingEndpoints, value } = buildCsp(NONCE, {
      apiUrl: 'not a url',
      reportOnly: true,
    });

    expect(getDirective(value, 'connect-src')).toBe(`connect-src 'self'`);
    expect(reportingEndpoints).toBeUndefined();
  });

  test('emits report-uri, report-to, and Reporting-Endpoints when apiUrl is present', () => {
    vi.stubEnv('NODE_ENV', 'production');

    const { reportingEndpoints, value } = buildCsp(NONCE, {
      apiUrl: 'https://api.example.com',
      reportOnly: true,
    });

    expect(getDirective(value, 'report-uri')).toBe(
      'report-uri https://api.example.com/csp-reports',
    );
    expect(getDirective(value, 'report-to')).toBe('report-to csp-endpoint');
    expect(reportingEndpoints).toBe(
      'csp-endpoint="https://api.example.com/csp-reports"',
    );
  });

  test('appends the additional* extension sources to their directives', () => {
    vi.stubEnv('NODE_ENV', 'production');

    const { value } = buildCsp(NONCE, {
      additionalConnectSrc: ['https://rollbar.example.com'],
      additionalFontSrc: ['https://fonts.gstatic.com'],
      additionalImgSrc: ['https://images.example.com'],
      additionalScriptSrc: ['https://analytics.example.com'],
      apiUrl: 'https://api.example.com',
      reportOnly: true,
    });

    expect(getDirective(value, 'connect-src')).toContain(
      'https://rollbar.example.com',
    );
    expect(getDirective(value, 'font-src')).toContain(
      'https://fonts.gstatic.com',
    );
    expect(getDirective(value, 'img-src')).toContain(
      'https://images.example.com',
    );
    expect(getDirective(value, 'script-src')).toContain(
      'https://analytics.example.com',
    );
  });

  test('keeps the permanent style-src unsafe-inline exception and hardened defaults', () => {
    vi.stubEnv('NODE_ENV', 'production');

    const { value } = buildCsp(NONCE, { reportOnly: true });

    expect(getDirective(value, 'style-src')).toBe(
      `style-src 'self' 'unsafe-inline'`,
    );
    expect(getDirective(value, 'default-src')).toBe(`default-src 'self'`);
    expect(getDirective(value, 'frame-ancestors')).toBe(
      `frame-ancestors 'none'`,
    );
    expect(getDirective(value, 'object-src')).toBe(`object-src 'none'`);
  });
});

describe('generateCspNonce', () => {
  test('returns base64 of 16 random bytes, unique per call', () => {
    const first = generateCspNonce();
    const second = generateCspNonce();

    // 16 bytes → 24 base64 chars (22 + '==' padding).
    expect(first).toHaveLength(24);
    expect(first).toMatch(/^[A-Za-z0-9+/]+={0,2}$/);
    expect(first).not.toBe(second);
  });
});
