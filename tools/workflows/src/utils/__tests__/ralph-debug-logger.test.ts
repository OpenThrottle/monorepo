/**
 * @description Tests for Ralph workflow debug shim (env parsing, stderr prefix, no-op when off).
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createRalphDebugLogger,
  disableRalphDebug,
  noop,
  RALPH_DEBUG_ENV,
  RALPH_DEBUG_ENV_LEGACY,
  RALPH_DEBUG_LOG_PREFIX,
  RALPH_VERBOSE_ENV,
  ralphDebugLogger,
  readRalphDebugConfigFromEnv,
  setRalphDebugLevel,
  syncRalphDebugFromEnv,
} from '../ralph-debug-logger';

describe('readRalphDebugConfigFromEnv', () => {
  it('returns off when unset and legacy unset', () => {
    expect(
      readRalphDebugConfigFromEnv({
        [RALPH_DEBUG_ENV]: undefined,
        [RALPH_DEBUG_ENV_LEGACY]: undefined,
        [RALPH_VERBOSE_ENV]: undefined,
      }),
    ).toBe('off');
  });

  it('maps truthy WORKFLOW_RALPH_DEBUG to debug', () => {
    expect(readRalphDebugConfigFromEnv({ [RALPH_DEBUG_ENV]: '1' })).toBe(
      'debug',
    );
    expect(readRalphDebugConfigFromEnv({ [RALPH_DEBUG_ENV]: 'true' })).toBe(
      'debug',
    );
  });

  it('maps RALPH_DEBUG legacy when primary unset', () => {
    expect(
      readRalphDebugConfigFromEnv({
        [RALPH_DEBUG_ENV]: undefined,
        [RALPH_DEBUG_ENV_LEGACY]: 'yes',
      }),
    ).toBe('debug');
  });

  it('maps verbose level from WORKFLOW_RALPH_DEBUG', () => {
    expect(readRalphDebugConfigFromEnv({ [RALPH_DEBUG_ENV]: 'verbose' })).toBe(
      'verbose',
    );
    expect(readRalphDebugConfigFromEnv({ [RALPH_DEBUG_ENV]: '2' })).toBe(
      'verbose',
    );
  });

  it('maps WORKFLOW_RALPH_VERBOSE to verbose', () => {
    expect(readRalphDebugConfigFromEnv({ [RALPH_VERBOSE_ENV]: '1' })).toBe(
      'verbose',
    );
  });

  it('returns off for explicit falsy strings', () => {
    expect(readRalphDebugConfigFromEnv({ [RALPH_DEBUG_ENV]: '0' })).toBe('off');
    expect(readRalphDebugConfigFromEnv({ [RALPH_DEBUG_ENV]: 'false' })).toBe(
      'off',
    );
  });
});

describe('createRalphDebugLogger', () => {
  it('does not write when level is off', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const log = createRalphDebugLogger('off');
    log.debug('x');
    log.verbose('y');
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('writes debug lines with prefix for debug level', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const log = createRalphDebugLogger('debug');
    log.debug('phase', 1);
    expect(spy).toHaveBeenCalledWith(RALPH_DEBUG_LOG_PREFIX, 'phase', 1);
    log.verbose('should not');
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it('writes verbose lines for verbose level', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const log = createRalphDebugLogger('verbose');
    log.verbose('detail');
    expect(spy).toHaveBeenCalledWith(
      RALPH_DEBUG_LOG_PREFIX,
      '[verbose]',
      'detail',
    );
    spy.mockRestore();
  });
});

describe('noop', () => {
  it('is callable without throwing', () => {
    expect(() => noop()).not.toThrow();
  });
});

describe('setRalphDebugLevel', () => {
  afterEach(() => {
    setRalphDebugLevel('off');
  });

  it('toggles global logger', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    setRalphDebugLevel('debug');
    ralphDebugLogger.debug('ping');
    expect(spy).toHaveBeenCalledWith(RALPH_DEBUG_LOG_PREFIX, 'ping');
    spy.mockRestore();
  });
});

describe('disableRalphDebug and syncRalphDebugFromEnv', () => {
  afterEach(() => {
    disableRalphDebug();
  });

  it('disableRalphDebug turns logging off', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    setRalphDebugLevel('debug');
    disableRalphDebug();
    ralphDebugLogger.debug('silent');
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('syncRalphDebugFromEnv applies env to global logger', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    syncRalphDebugFromEnv({ [RALPH_DEBUG_ENV]: '1' });
    ralphDebugLogger.debug('from env');
    expect(spy).toHaveBeenCalledWith(RALPH_DEBUG_LOG_PREFIX, 'from env');
    spy.mockRestore();
  });
});
