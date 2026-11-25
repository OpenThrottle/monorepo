import { describe, expect, test } from 'vitest';

import { GLOBAL_RELEASES_URL } from '../../data/releases';
import { buildAppReleaseHref } from '../buildAppReleaseHref';

describe('buildAppReleaseHref', () => {
  test('searches the releases index for the {projectName}@{version} tag', () => {
    const url = new URL(buildAppReleaseHref('openthrottle-developer', '1.0.0'));

    expect(`${url.origin}${url.pathname}`).toBe(GLOBAL_RELEASES_URL);
    expect(url.searchParams.get('q')).toBe('openthrottle-developer@1.0.0');
    expect(url.searchParams.get('expanded')).toBe('true');
  });

  test('encodes the tag so prerelease versions survive the query string', () => {
    const url = new URL(
      buildAppReleaseHref('openthrottle-cms', '2.0.0-rc.1+b5'),
    );

    expect(url.searchParams.get('q')).toBe('openthrottle-cms@2.0.0-rc.1+b5');
  });
});
