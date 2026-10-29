import { ENV_SOURCE } from '@openthrottle/react-router-utils';
import { describe, expect, test } from 'vitest';

import { getCspOptions } from '../csp';

const request = new Request('http://localhost:6020/');

describe('getCspOptions', () => {
  test('returns production-first options with no per-app additions', () => {
    const options = getCspOptions(request);

    expect(options.reportOnly).toBe(false);
    expect(options.additionalConnectSrc).toEqual([]);
    expect(options.additionalFontSrc).toEqual([]);
    expect(options.additionalImgSrc).toEqual([]);
    expect(options.additionalScriptSrc).toEqual([]);
  });

  test('sources the API url from the shared env source', () => {
    expect(getCspOptions(request).apiUrl).toBe(ENV_SOURCE.API_URL_EXTERNAL);
  });

  test('passes the origin the browser used, honouring a TLS-terminating proxy', () => {
    const proxied = new Request('http://localhost:6020/plans', {
      headers: {
        'x-forwarded-host': 'mac.tail1234.ts.net',
        'x-forwarded-proto': 'https',
      },
    });

    expect(getCspOptions(proxied).requestOrigin).toBe(
      'https://mac.tail1234.ts.net',
    );
  });
});
