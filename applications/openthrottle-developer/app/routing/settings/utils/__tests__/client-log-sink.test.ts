import { afterEach, describe, expect, test, vi } from 'vitest';
import {
  clearClientLogSink,
  formatLogArgs,
  getClientLogEntries,
  installClientLogSink,
  redactSensitiveLogText,
  resetClientLogSinkForTesting,
} from '~/routing/settings/client-log-sink';

afterEach(() => {
  resetClientLogSinkForTesting();
  vi.restoreAllMocks();
});

describe('client-log-sink', () => {
  test('redactSensitiveLogText masks Bearer and token-like fragments', () => {
    expect(redactSensitiveLogText('Authorization: Bearer eyJhb')).toBe(
      'authorization: [REDACTED]',
    );
    expect(
      redactSensitiveLogText('prefix Bearer loose-token suffix'),
    ).toContain('Bearer [REDACTED]');
    expect(redactSensitiveLogText('x access_token=secret-token-here y')).toBe(
      'x access_token=[REDACTED] y',
    );
    expect(redactSensitiveLogText('api_key=abc123')).toBe('api_key=[REDACTED]');
  });

  test('formatLogArgs stringifies objects and errors', () => {
    const err = new Error('x');
    const line = formatLogArgs(['a', 1, { b: 2 }, err]);
    expect(line).toContain('a');
    expect(line).toContain('1');
    expect(line).toContain('"b":2');
    expect(line).toMatch(/x/);
  });

  test('installClientLogSink records console and caps buffer', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    installClientLogSink();
    for (let i = 0; i < 1000; i += 1) {
      console.log(String(i));
    }
    console.log('tail');

    const entries = getClientLogEntries();
    expect(entries.length).toBe(1000);
    expect(entries[0]?.message).toBe('1');
    expect(entries.at(-1)?.message).toBe('tail');
  });

  test('detached console method still forwards to native via Reflect.apply', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    installClientLogSink();
    const detached = console.log;
    detached.call(console, 'via-detached');
    expect(spy).toHaveBeenCalledWith('via-detached');
  });

  test('stores redacted Bearer text from console', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    installClientLogSink();
    console.log('tok Bearer secret-value-not-stored end');
    const last = getClientLogEntries().at(-1);
    expect(last?.message).toContain('Bearer [REDACTED]');
    expect(last?.message).not.toContain('secret-value-not-stored');
  });

  test('clearClientLogSink empties buffer', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    installClientLogSink();
    console.warn('hello');
    clearClientLogSink();
    expect(getClientLogEntries().length).toBe(0);
  });

  test('records window error when dispatched', () => {
    installClientLogSink();
    const evt = new ErrorEvent('error', {
      colno: 1,
      filename: 'f.ts',
      lineno: 2,
      message: 'boom',
    });
    window.dispatchEvent(evt);

    const entries = getClientLogEntries();
    const last = entries.at(-1);
    expect(last?.level).toBe('error');
    expect(last?.message).toContain('boom');
    expect(last?.message).toContain('f.ts');
  });

  test('records unhandled rejection', async () => {
    installClientLogSink();
    const p = Promise.reject(new Error('rej'));
    // silence Node/jsdom unhandled rejection noise for this fixture
    void p.catch(() => {});
    window.dispatchEvent(
      new PromiseRejectionEvent('unhandledrejection', {
        promise: p,
        reason: new Error('rej'),
      }),
    );

    await vi.waitFor(() => {
      const last = getClientLogEntries().at(-1);
      expect(last?.message).toContain('unhandledrejection');
    });
  });
});
