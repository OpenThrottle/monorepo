import { ENV_SOURCE } from '@openthrottle/react-router-utils';
import { describe, expect, test } from 'vitest';
import { getCspOptions } from './csp';

describe('getCspOptions', () => {
  test('returns production-first options with no per-app additions', () => {
    const options = getCspOptions();

    expect(options.reportOnly).toBe(false);
    expect(options.additionalConnectSrc).toEqual([]);
    expect(options.additionalFontSrc).toEqual([]);
    expect(options.additionalImgSrc).toEqual([]);
    expect(options.additionalScriptSrc).toEqual([]);
  });

  test('sources the API url from the shared env source', () => {
    expect(getCspOptions().apiUrl).toBe(ENV_SOURCE.API_URL_EXTERNAL);
  });
});
