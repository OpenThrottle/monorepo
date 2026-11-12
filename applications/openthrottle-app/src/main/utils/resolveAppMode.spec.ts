import { resolveAppMode } from './resolveAppMode.ts';

describe('resolveAppMode', () => {
  describe('when packaged', () => {
    it('is always embedded, even with a dev override', () => {
      const mode = resolveAppMode({
        env: { OPENTHROTTLE_APP_MODE: 'dev' },
        isPackaged: true,
      });

      expect(mode).toEqual({ kind: 'embedded' });
    });
  });

  describe('when running under electron-vite dev', () => {
    it('points at the developer Vite server on 6020', () => {
      const mode = resolveAppMode({
        env: { NODE_ENV_ELECTRON_VITE: 'development' },
        isPackaged: false,
      });

      expect(mode).toEqual({ kind: 'dev', url: 'http://localhost:6020' });
    });

    it('honors OPENTHROTTLE_APP_DEV_URL', () => {
      const mode = resolveAppMode({
        env: {
          NODE_ENV_ELECTRON_VITE: 'development',
          OPENTHROTTLE_APP_DEV_URL: 'http://localhost:7000',
        },
        isPackaged: false,
      });

      expect(mode).toEqual({ kind: 'dev', url: 'http://localhost:7000' });
    });

    it('lets OPENTHROTTLE_APP_MODE=embedded force the embedded server', () => {
      const mode = resolveAppMode({
        env: {
          NODE_ENV_ELECTRON_VITE: 'development',
          OPENTHROTTLE_APP_MODE: 'embedded',
        },
        isPackaged: false,
      });

      expect(mode).toEqual({ kind: 'embedded' });
    });
  });

  describe('when unpackaged outside electron-vite dev', () => {
    it('is embedded by default', () => {
      expect(resolveAppMode({ env: {}, isPackaged: false })).toEqual({
        kind: 'embedded',
      });
    });

    it('is dev when forced', () => {
      const mode = resolveAppMode({
        env: { OPENTHROTTLE_APP_MODE: 'dev' },
        isPackaged: false,
      });

      expect(mode.kind).toBe('dev');
    });
  });
});
