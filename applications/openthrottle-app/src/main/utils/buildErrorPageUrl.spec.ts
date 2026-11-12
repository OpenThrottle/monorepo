import { buildErrorPageUrl } from './buildErrorPageUrl.ts';

const decode = (url: string): string => {
  return decodeURIComponent(url.slice(url.indexOf(',') + 1));
};

describe('buildErrorPageUrl', () => {
  it('is a data URL carrying the reason', () => {
    const url = buildErrorPageUrl('exited with code 1');

    expect(url.startsWith('data:text/html;charset=utf-8,')).toBe(true);
    expect(decode(url)).toContain('exited with code 1');
  });

  it('escapes markup in the reason', () => {
    const html = decode(buildErrorPageUrl('<script>alert(1)</script>'));

    expect(html).not.toContain('<script>alert');
    expect(html).toContain('&lt;script&gt;');
  });
});
