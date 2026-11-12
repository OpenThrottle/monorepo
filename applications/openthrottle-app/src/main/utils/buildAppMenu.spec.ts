import { describe, expect, it } from 'vitest';

import { buildAppMenu } from './buildAppMenu.ts';

const labels = (template: ReturnType<typeof buildAppMenu>): string[] => {
  return template.flatMap((item) => {
    const submenu = Array.isArray(item.submenu) ? item.submenu : [];

    return submenu.map((entry) => entry.label ?? entry.role ?? '');
  });
};

describe('buildAppMenu', () => {
  it('offers Change Server… wired to the handler', () => {
    const handler = (): void => {};
    const template = buildAppMenu({
      appName: 'OpenThrottle',
      changeServer: handler,
      isDev: false,
      isMac: false,
    });
    const file = template.find((item) => item.label === 'File');
    const entries = Array.isArray(file?.submenu) ? file.submenu : [];
    const change = entries.find((entry) => entry.label === 'Change Server…');

    expect(change?.click).toBe(handler);
  });

  it('omits Change Server… when there is no handler (dev mode)', () => {
    const template = buildAppMenu({
      appName: 'OpenThrottle',
      changeServer: undefined,
      isDev: false,
      isMac: false,
    });

    expect(labels(template)).not.toContain('Change Server…');
  });

  it('keeps the Edit roles so paste works in the connection screen', () => {
    const template = buildAppMenu({
      appName: 'OpenThrottle',
      changeServer: undefined,
      isDev: false,
      isMac: true,
    });

    expect(labels(template)).toEqual(expect.arrayContaining(['copy', 'paste']));
    expect(template[0]?.label).toBe('OpenThrottle');
  });

  it('adds the standard macOS app menu roles', () => {
    const template = buildAppMenu({
      appName: 'OpenThrottle',
      changeServer: undefined,
      isDev: false,
      isMac: true,
    });

    expect(template[0]?.submenu).toEqual(
      expect.arrayContaining([
        { role: 'about' },
        { role: 'hide' },
        { role: 'quit' },
      ]),
    );
  });

  it('offers Reload and DevTools only in dev', () => {
    const dev = labels(
      buildAppMenu({
        appName: 'OpenThrottle',
        changeServer: undefined,
        isDev: true,
        isMac: false,
      }),
    );
    const packaged = labels(
      buildAppMenu({
        appName: 'OpenThrottle',
        changeServer: undefined,
        isDev: false,
        isMac: false,
      }),
    );

    expect(dev).toEqual(
      expect.arrayContaining(['reload', 'forceReload', 'toggleDevTools']),
    );
    expect(packaged).not.toContain('toggleDevTools');
    expect(packaged).not.toContain('reload');
  });

  it('includes View and Window menus', () => {
    const template = buildAppMenu({
      appName: 'OpenThrottle',
      changeServer: undefined,
      isDev: false,
      isMac: false,
    });

    expect(template.map((item) => item.label)).toEqual(
      expect.arrayContaining(['View', 'Window']),
    );
  });
});
