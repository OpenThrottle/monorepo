import { describe, expect, test } from 'vitest';
import { SITE_NAME, SITE_SUBDOMAIN, SITE_TITLE } from '../settings';

describe('global/config/settings', () => {
  test('builds site title from name and subdomain', () => {
    expect(SITE_NAME).toBe('OpenThrottle');
    expect(SITE_SUBDOMAIN).toBe('CMS');
    expect(SITE_TITLE).toBe('OpenThrottle | CMS');
  });
});
