import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { CspReportsController } from './csp-reports.controller';

describe('CspReportsController', () => {
  let controller: CspReportsController;

  const mockLogger = createMock<LoggerService>({
    warn: vi.fn(),
  });

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      controllers: [CspReportsController],
      providers: [{ provide: LoggerService, useValue: mockLogger }],
    }).compile();

    controller = app.get<CspReportsController>(CspReportsController);
  });

  beforeEach(() => {
    vi.mocked(mockLogger.warn).mockClear();
  });

  test('logs one structured line for a legacy application/csp-report payload', () => {
    controller.report({
      'csp-report': {
        'blocked-uri': 'https://evil.example.com/script.js',
        disposition: 'report',
        'document-uri': 'https://developer.example.com/dashboard',
        'effective-directive': 'script-src',
        'line-number': 42,
        'original-policy': "default-src 'self'",
        'script-sample': 'alert(1)',
        'source-file': 'https://developer.example.com/dashboard',
        'violated-directive': 'script-src',
      },
    });

    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    expect(mockLogger.warn).toHaveBeenCalledWith('CSP violation', {
      blockedUri: 'https://evil.example.com/script.js',
      disposition: 'report',
      documentUri: 'https://developer.example.com/dashboard',
      effectiveDirective: 'script-src',
      lineNumber: 42,
      originalPolicy: "default-src 'self'",
      referrer: undefined,
      sample: 'alert(1)',
      sourceFile: 'https://developer.example.com/dashboard',
      statusCode: undefined,
      violatedDirective: 'script-src',
    });
  });

  test('logs one line per csp-violation in an application/reports+json batch, ignoring other types', () => {
    controller.report([
      {
        body: {
          blockedURL: 'https://evil.example.com/a.js',
          disposition: 'report',
          documentURL: 'https://admin.example.com/',
          effectiveDirective: 'script-src',
        },
        type: 'csp-violation',
        url: 'https://admin.example.com/',
        user_agent: 'TestBrowser/1.0',
      },
      {
        body: { id: 'SomethingDeprecated' },
        type: 'deprecation',
        url: 'https://admin.example.com/',
      },
      {
        body: {
          blockedURL: 'https://evil.example.com/b.js',
          effectiveDirective: 'connect-src',
        },
        type: 'csp-violation',
        url: 'https://admin.example.com/settings',
      },
    ]);

    expect(mockLogger.warn).toHaveBeenCalledTimes(2);
    expect(mockLogger.warn).toHaveBeenNthCalledWith(
      1,
      'CSP violation',
      expect.objectContaining({
        blockedUri: 'https://evil.example.com/a.js',
        documentUri: 'https://admin.example.com/',
        effectiveDirective: 'script-src',
        userAgent: 'TestBrowser/1.0',
      }),
    );
    expect(mockLogger.warn).toHaveBeenNthCalledWith(
      2,
      'CSP violation',
      expect.objectContaining({
        blockedUri: 'https://evil.example.com/b.js',
        effectiveDirective: 'connect-src',
      }),
    );
  });

  test.each([
    ['null', null],
    ['a string', 'not json shaped'],
    ['an empty object', {}],
    ['an object without csp-report', { hello: 'world' }],
    ['an array of junk', [1, 'two', null]],
  ])('tolerates %s without throwing (logs unrecognized)', (_label, payload) => {
    expect(() => controller.report(payload)).not.toThrow();

    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'CSP report payload not recognized',
      expect.objectContaining({ payload: expect.anything() }),
    );
  });
});
