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

  test('HTML-escapes markup in the site title', () => {
    const html = getOfflineModeTemplate('<script>alert(1)</script>');

    // The title is escaped so injected markup cannot break out of <title>.
    expect(html).toContain(
      '<title>&lt;script&gt;alert(1)&lt;/script&gt;</title>',
    );
    expect(html).not.toContain('<title><script>');
  });

  test('escapes ampersands and quotes', () => {
    const html = getOfflineModeTemplate(`A&B "C" 'D'`);

    expect(html).toContain('<title>A&amp;B &quot;C&quot; &#39;D&#39;</title>');
  });
});
