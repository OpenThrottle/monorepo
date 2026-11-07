import { buildServerEnv, withLocalOrigin } from './build-server-env.ts';

const base = {
  buildDir: '/apps/developer/build',
  inherited: { HOME: '/home/me', PATH: '/usr/bin', UNSET: undefined },
  serverUrl: 'http://localhost:6021',
  workspaceRoot: undefined,
};

describe('buildServerEnv', () => {
  it('injects the configured OT server and production mode', () => {
    const env = buildServerEnv(base);

    expect(env['API_URL_INTERNAL']).toBe('http://localhost:6021');
    expect(env['NODE_ENV']).toBe('production');
    expect(env['OPENTHROTTLE_DEVELOPER_BUILD_DIR']).toBe(
      '/apps/developer/build',
    );
  });

  it('keeps inherited variables and drops undefined ones', () => {
    const env = buildServerEnv(base);

    expect(env['PATH']).toBe('/usr/bin');
    expect(env).not.toHaveProperty('UNSET');
  });

  it('supplies every key getPublicEnv requires except the dynamic origin', () => {
    const env = buildServerEnv(base);
    const required = [
      'APP_ENV',
      'APP_NAME',
      'APP_NAME_SHORT',
      'APP_URL_ADMIN',
      'APP_URL_CMS',
      'APP_URL_SERVER',
      'APP_URL_WEBSITE',
      'APP_VERSION',
      'ROLLBAR_TOKEN',
    ];

    expect(required.filter((key) => !env[key])).toEqual([]);
  });

  it('overrides inherited values that would break the desktop wiring', () => {
    const env = buildServerEnv({
      ...base,
      inherited: {
        API_URL_INTERNAL: 'http://elsewhere',
        NODE_ENV: 'development',
      },
    });

    expect(env['API_URL_INTERNAL']).toBe('http://localhost:6021');
    expect(env['NODE_ENV']).toBe('production');
  });

  describe('WORKSPACE_ROOT', () => {
    it('is omitted when no checkout is known', () => {
      expect(buildServerEnv(base)).not.toHaveProperty('WORKSPACE_ROOT');
    });

    it('is set when a checkout is known', () => {
      const env = buildServerEnv({ ...base, workspaceRoot: '/code/repo' });

      expect(env['WORKSPACE_ROOT']).toBe('/code/repo');
    });
  });
});

describe('withLocalOrigin', () => {
  const env = withLocalOrigin(buildServerEnv(base), 'http://127.0.0.1:51234');

  it('points the app origin at the dynamic loopback origin', () => {
    expect(env['APP_URL']).toBe('http://127.0.0.1:51234');
    expect(env['APP_URL_DEVELOPER']).toBe('http://127.0.0.1:51234');
    expect(env['PORT']).toBe('51234');
  });

  it('makes API_URL_EXTERNAL the child own origin, not the OT server', () => {
    expect(env['API_URL_EXTERNAL']).toBe('http://127.0.0.1:51234');
    expect(env['API_URL_INTERNAL']).toBe('http://localhost:6021');
  });
});
