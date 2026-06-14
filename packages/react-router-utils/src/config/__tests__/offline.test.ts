import { describe, expect, test } from 'vitest';
import { getOfflineModeTemplate } from '../offline';

describe('getOfflineModeTemplate', () => {
  test('interpolates the site title into the <title> tag', () => {
    expect(getOfflineModeTemplate('OpenThrottle')).toContain(
      '<title>OpenThrottle</title>',
    );
  });

  test('returns a full HTML document with the expected markers', () => {
    const html = getOfflineModeTemplate('Acme');

    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('fonts.googleapis.com/css2?family=Inter');
    expect(html).toContain('🔌 Offline mode');
  });

  test('interpolates the title raw, without HTML escaping', () => {
    const html = getOfflineModeTemplate('<script>alert(1)</script>');

    // Documents current behavior: the title is interpolated verbatim, so any
    // markup in siteTitle lands in the output unescaped.
    expect(html).toContain('<title><script>alert(1)</script></title>');
  });
});
