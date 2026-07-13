import { describe, expect, it } from 'vitest';
import { ClsServiceManager } from 'nestjs-cls';
import { setupGlobalCls } from './global-cls.module';
import type { GlobalClsStore } from './global-cls.service';

/** @description Presents a blank structural store as {@link GlobalClsStore} without a cast. */
function asStore<T>(value: unknown): T;
function asStore(value: unknown): unknown {
  return value;
}

/**
 * @description Exercises the CLS middleware `setup` hook directly: it reads the
 * `x-app-name` / `x-app-version` request headers and seeds the `app` context,
 * falling back to a sentinel when a header is missing or empty.
 */
describe('setupGlobalCls', () => {
  const cls = ClsServiceManager.getClsService<GlobalClsStore>();

  const runSetup = (headers: Record<string, string | undefined>) =>
    cls.runWith(asStore<GlobalClsStore>({}), () => {
      setupGlobalCls(cls, { headers });

      return cls.get('app');
    });

  const runSetupSessionId = (headers: Record<string, string | undefined>) =>
    cls.runWith(asStore<GlobalClsStore>({}), () => {
      setupGlobalCls(cls, { headers });

      return cls.get('sessionId');
    });

  it('stores app name and version from present headers', () => {
    const app = runSetup({
      'x-app-name': 'openthrottle-server',
      'x-app-version': '1.2.3',
    });

    expect(app).toEqual({
      name: 'openthrottle-server',
      version: '1.2.3',
    });
  });

  it('falls back to sentinels when headers are absent', () => {
    const app = runSetup({});

    expect(app).toEqual({
      name: 'x-app-name - unknown',
      version: 'x-app-version - unknown',
    });
  });

  it('treats empty-string headers as missing', () => {
    const app = runSetup({
      'x-app-name': '',
      'x-app-version': '',
    });

    expect(app).toEqual({
      name: 'x-app-name - unknown',
      version: 'x-app-version - unknown',
    });
  });

  it('falls back per-header when only one header is present', () => {
    const app = runSetup({ 'x-app-name': 'openthrottle-admin' });

    expect(app).toEqual({
      name: 'openthrottle-admin',
      version: 'x-app-version - unknown',
    });
  });

  it('captures x-ot-session-id when present', () => {
    expect(runSetupSessionId({ 'x-ot-session-id': 'session-123' })).toBe(
      'session-123',
    );
  });

  it('leaves sessionId undefined when the header is absent or empty', () => {
    expect(runSetupSessionId({})).toBeUndefined();
    expect(runSetupSessionId({ 'x-ot-session-id': '' })).toBeUndefined();
  });
});
