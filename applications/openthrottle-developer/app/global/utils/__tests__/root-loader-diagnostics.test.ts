import { GraphqlAuthError } from '@openthrottle/react-router-graphql';
import { describe, expect, it } from 'vitest';
import {
  classifyRootLoaderError,
  httpStatusFromRootLoaderError,
  parseHttpStatusFromRootLoaderMessage,
  rootLoaderErrorMessage,
  rootLoaderStepLabel,
  truncateForBanner,
} from '../root-loader-diagnostics';

describe('classifyRootLoaderError', () => {
  it('classifies GraphQL layer errors', () => {
    expect(classifyRootLoaderError(new Error('GraphQL errors: nope'))).toBe(
      'graphql',
    );
  });

  it('classifies HTTP errors from openthrottle-server', () => {
    expect(
      classifyRootLoaderError(
        new Error('openthrottle-server GraphQL error 502: bad'),
      ),
    ).toBe('transport');
  });

  it('classifies TypeError as transport', () => {
    expect(classifyRootLoaderError(new TypeError('fetch failed'))).toBe(
      'transport',
    );
  });

  it('classifies unknown errors', () => {
    expect(classifyRootLoaderError(new Error('weird'))).toBe('unknown');
  });

  it('classifies a typed GraphqlAuthError as transport', () => {
    expect(
      classifyRootLoaderError(new GraphqlAuthError('Unauthorized', 401)),
    ).toBe('transport');
  });
});

describe('httpStatusFromRootLoaderError', () => {
  it('reads httpStatus from a typed GraphqlAuthError', () => {
    expect(
      httpStatusFromRootLoaderError(new GraphqlAuthError('Forbidden', 403)),
    ).toBe(403);
  });

  it('falls back to message-scraping for non-auth transport errors', () => {
    expect(
      httpStatusFromRootLoaderError(
        new Error('openthrottle-server GraphQL error 502: bad gateway'),
      ),
    ).toBe(502);
  });

  it('returns undefined when no status is available', () => {
    expect(httpStatusFromRootLoaderError(new Error('weird'))).toBeUndefined();
  });
});

describe('rootLoaderErrorMessage', () => {
  it('returns Error message', () => {
    expect(rootLoaderErrorMessage(new Error('x'))).toBe('x');
  });
});

describe('parseHttpStatusFromRootLoaderMessage', () => {
  it('returns status from openthrottle-server GraphQL error lines', () => {
    expect(
      parseHttpStatusFromRootLoaderMessage(
        'openthrottle-server GraphQL error 502: bad gateway',
      ),
    ).toBe(502);
  });

  it('returns undefined when no status match', () => {
    expect(
      parseHttpStatusFromRootLoaderMessage('fetch failed'),
    ).toBeUndefined();
  });
});

describe('truncateForBanner', () => {
  it('leaves short strings intact', () => {
    expect(truncateForBanner('ok', 10)).toBe('ok');
  });

  it('truncates long strings', () => {
    expect(truncateForBanner('1234567890', 5)).toBe('12345…');
  });
});

describe('rootLoaderStepLabel', () => {
  it('labels health step', () => {
    expect(rootLoaderStepLabel('health')).toBe('Server health check');
  });

  it('labels user step', () => {
    expect(rootLoaderStepLabel('user')).toBe('Current user session');
  });
});
