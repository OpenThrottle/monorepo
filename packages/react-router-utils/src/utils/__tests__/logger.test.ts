import { afterEach, describe, expect, it, vi } from 'vitest';
import type { logger as LoggerType } from '../logger';

// `logger` binds each console method (`console.error.bind(console)`) at
// module-evaluation time, so a spy installed AFTER import still points the
// bound function at the original, unspied console method. Spies must be in
// place before the module is (re-)imported.
const loadLogger = async (nodeEnv: string): Promise<typeof LoggerType> => {
  vi.resetModules();
  vi.stubGlobal('window', { env: { NODE_ENV: nodeEnv } });
  const mod = await import('../logger');
  return mod.logger;
};

describe('logger', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
    vi.restoreAllMocks();
  });

  describe('in a non-production environment', () => {
    it('emits debug, info, and log through the matching console method', async () => {
      const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
      const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const logger = await loadLogger('development');

      logger.debug('debug message', { detail: 1 });
      logger.info('info message');
      logger.log('log message');

      expect(debugSpy).toHaveBeenCalledWith('debug message', { detail: 1 });
      expect(infoSpy).toHaveBeenCalledWith('info message');
      expect(logSpy).toHaveBeenCalledWith('log message');
    });

    it('always emits warn and error', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const logger = await loadLogger('development');

      logger.warn('warn message');
      logger.error('error message');

      expect(warnSpy).toHaveBeenCalledWith('warn message');
      expect(errorSpy).toHaveBeenCalledWith('error message');
    });
  });

  describe('in a production environment', () => {
    it('suppresses debug, info, and log', async () => {
      const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
      const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const logger = await loadLogger('production');

      logger.debug('debug message');
      logger.info('info message');
      logger.log('log message');

      expect(debugSpy).not.toHaveBeenCalled();
      expect(infoSpy).not.toHaveBeenCalled();
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('still emits warn and error', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const logger = await loadLogger('production');

      logger.warn('warn message');
      logger.error('error message');

      expect(warnSpy).toHaveBeenCalledWith('warn message');
      expect(errorSpy).toHaveBeenCalledWith('error message');
    });

    it('never throws even though the suppressed methods are no-ops', async () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const logger = await loadLogger('production');

      expect(() => {
        logger.debug('debug message');
        logger.info('info message');
        logger.log('log message');
        logger.warn('warn message');
        logger.error('error message');
      }).not.toThrow();
    });
  });
});
