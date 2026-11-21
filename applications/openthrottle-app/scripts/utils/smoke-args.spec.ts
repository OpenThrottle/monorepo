import { buildSmokeLaunchCommand, parseSmokeArgs } from './smoke-args.ts';

const DEFAULT_PATH = 'dist/release/mac-arm64/OpenThrottle.app';

describe('parseSmokeArgs', () => {
  it('defaults to the arm64 bundle, run natively', () => {
    expect(parseSmokeArgs([], DEFAULT_PATH)).toEqual({
      appPath: DEFAULT_PATH,
      arch: 'native',
      ok: true,
    });
  });

  it('takes a bundle path and --arch x64 in either order', () => {
    const expected = {
      appPath: 'dist/release/mac-universal/OpenThrottle.app',
      arch: 'x64',
      ok: true,
    };

    expect(
      parseSmokeArgs(
        ['dist/release/mac-universal/OpenThrottle.app', '--arch', 'x64'],
        DEFAULT_PATH,
      ),
    ).toEqual(expected);
    expect(
      parseSmokeArgs(
        ['--arch', 'x64', 'dist/release/mac-universal/OpenThrottle.app'],
        DEFAULT_PATH,
      ),
    ).toEqual(expected);
  });

  it('rejects an arch other than x64', () => {
    expect(parseSmokeArgs(['--arch', 'arm64'], DEFAULT_PATH).ok).toBe(false);
  });

  it('rejects --arch with no value', () => {
    expect(parseSmokeArgs(['--arch'], DEFAULT_PATH).ok).toBe(false);
  });

  it('rejects two bundle paths', () => {
    expect(parseSmokeArgs(['a.app', 'b.app'], DEFAULT_PATH).ok).toBe(false);
  });
});

describe('buildSmokeLaunchCommand', () => {
  it('spawns the executable directly when native', () => {
    expect(buildSmokeLaunchCommand('/app/OT', ['--x'], 'native')).toEqual({
      args: ['--x'],
      command: '/app/OT',
    });
  });

  it('wraps the executable in arch -x86_64 for x64', () => {
    expect(buildSmokeLaunchCommand('/app/OT', ['--x'], 'x64')).toEqual({
      args: ['-x86_64', '/app/OT', '--x'],
      command: '/usr/bin/arch',
    });
  });
});
