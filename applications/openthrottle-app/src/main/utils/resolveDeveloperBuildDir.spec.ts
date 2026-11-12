import { resolveDeveloperBuildDir } from './resolveDeveloperBuildDir.ts';

describe('resolveDeveloperBuildDir', () => {
  describe('when packaged', () => {
    it('resolves inside the app, next to out/', () => {
      const dir = resolveDeveloperBuildDir({
        env: {},
        isPackaged: true,
        mainDir: `/Applications/OpenThrottle.app/Contents/Resources/app.asar/out/main`,
      });

      expect(dir).toBe(
        '/Applications/OpenThrottle.app/Contents/Resources/app.asar/developer',
      );
    });

    it('ignores OPENTHROTTLE_DEVELOPER_BUILD_DIR', () => {
      const dir = resolveDeveloperBuildDir({
        env: { OPENTHROTTLE_DEVELOPER_BUILD_DIR: '/tmp/evil' },
        isPackaged: true,
        mainDir: '/app.asar/out/main',
      });

      expect(dir).toBe('/app.asar/developer');
    });
  });

  describe('when unpackaged', () => {
    it('points at the sibling developer build in the monorepo', () => {
      const dir = resolveDeveloperBuildDir({
        env: {},
        isPackaged: false,
        mainDir: '/repo/applications/openthrottle-app/out/main',
      });

      expect(dir).toBe('/repo/applications/openthrottle-developer/build');
    });

    it('honors OPENTHROTTLE_DEVELOPER_BUILD_DIR', () => {
      const dir = resolveDeveloperBuildDir({
        env: { OPENTHROTTLE_DEVELOPER_BUILD_DIR: '/custom/build' },
        isPackaged: false,
        mainDir: '/repo/applications/openthrottle-app/out/main',
      });

      expect(dir).toBe('/custom/build');
    });

    it('treats an empty override as unset', () => {
      const dir = resolveDeveloperBuildDir({
        env: { OPENTHROTTLE_DEVELOPER_BUILD_DIR: '' },
        isPackaged: false,
        mainDir: '/repo/applications/openthrottle-app/out/main',
      });

      expect(dir).toBe('/repo/applications/openthrottle-developer/build');
    });
  });
});
