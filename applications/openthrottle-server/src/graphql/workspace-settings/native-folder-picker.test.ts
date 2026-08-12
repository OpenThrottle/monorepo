import { realpathSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  canUseNativeFolderDialog,
  hasDisplay,
  isLoopbackAddress,
  NATIVE_PICKER_ENV,
  normalizeNativeDialogPath,
  pickNativeFolder,
  resolveNativeDialogCommand,
  resolveNativePickerOverride,
} from './native-folder-picker';

describe('native-folder-picker', () => {
  describe('isLoopbackAddress', () => {
    it('accepts IPv4, IPv6, and IPv4-mapped loopback', () => {
      expect(isLoopbackAddress('127.0.0.1')).toBe(true);
      expect(isLoopbackAddress('::1')).toBe(true);
      expect(isLoopbackAddress('::ffff:127.0.0.1')).toBe(true);
      expect(isLoopbackAddress('  127.0.0.1  ')).toBe(true);
    });

    it('rejects non-loopback, empty, and nullish addresses', () => {
      expect(isLoopbackAddress('10.0.0.4')).toBe(false);
      expect(isLoopbackAddress('192.168.1.9')).toBe(false);
      expect(isLoopbackAddress('')).toBe(false);
      expect(isLoopbackAddress(null)).toBe(false);
      expect(isLoopbackAddress(undefined)).toBe(false);
    });
  });

  describe('resolveNativePickerOverride', () => {
    it('maps truthy/falsy env values, else null', () => {
      expect(resolveNativePickerOverride({ [NATIVE_PICKER_ENV]: '1' })).toBe(
        true,
      );
      expect(resolveNativePickerOverride({ [NATIVE_PICKER_ENV]: 'true' })).toBe(
        true,
      );
      expect(resolveNativePickerOverride({ [NATIVE_PICKER_ENV]: 'ON' })).toBe(
        true,
      );
      expect(resolveNativePickerOverride({ [NATIVE_PICKER_ENV]: '0' })).toBe(
        false,
      );
      expect(resolveNativePickerOverride({ [NATIVE_PICKER_ENV]: 'off' })).toBe(
        false,
      );
      expect(resolveNativePickerOverride({})).toBeNull();
      expect(
        resolveNativePickerOverride({ [NATIVE_PICKER_ENV]: 'maybe' }),
      ).toBeNull();
    });
  });

  describe('hasDisplay', () => {
    it('assumes a display on macOS and Windows', () => {
      expect(hasDisplay('darwin', {})).toBe(true);
      expect(hasDisplay('win32', {})).toBe(true);
    });

    it('requires DISPLAY or WAYLAND_DISPLAY on Linux', () => {
      expect(hasDisplay('linux', {})).toBe(false);
      expect(hasDisplay('linux', { DISPLAY: ':0' })).toBe(true);
      expect(hasDisplay('linux', { WAYLAND_DISPLAY: 'wayland-0' })).toBe(true);
      expect(hasDisplay('linux', { DISPLAY: '' })).toBe(false);
    });

    it('has no picker wired for other platforms', () => {
      expect(hasDisplay('freebsd', { DISPLAY: ':0' })).toBe(false);
    });
  });

  describe('canUseNativeFolderDialog', () => {
    it('is true for a loopback request on a platform with a display', () => {
      expect(
        canUseNativeFolderDialog({
          env: {},
          platform: 'darwin',
          remoteAddress: '127.0.0.1',
        }),
      ).toBe(true);
    });

    it('is false for a non-loopback request even with a display', () => {
      expect(
        canUseNativeFolderDialog({
          env: {},
          platform: 'darwin',
          remoteAddress: '10.0.0.4',
        }),
      ).toBe(false);
    });

    it('is false when loopback but no display (headless Linux)', () => {
      expect(
        canUseNativeFolderDialog({
          env: {},
          platform: 'linux',
          remoteAddress: '127.0.0.1',
        }),
      ).toBe(false);
    });

    it('force-on override wins over a remote/headless request', () => {
      expect(
        canUseNativeFolderDialog({
          env: { [NATIVE_PICKER_ENV]: '1' },
          platform: 'linux',
          remoteAddress: '10.0.0.4',
        }),
      ).toBe(true);
    });

    it('force-off override wins over a local request with a display', () => {
      expect(
        canUseNativeFolderDialog({
          env: { [NATIVE_PICKER_ENV]: '0' },
          platform: 'darwin',
          remoteAddress: '127.0.0.1',
        }),
      ).toBe(false);
    });
  });

  describe('resolveNativeDialogCommand', () => {
    it('wires argv (no shell) per platform', () => {
      expect(resolveNativeDialogCommand('darwin')?.command).toBe('osascript');
      expect(resolveNativeDialogCommand('linux')?.command).toBe('zenity');
      expect(resolveNativeDialogCommand('win32')?.command).toBe('powershell');
    });

    it('returns null for a platform with no picker wired', () => {
      expect(resolveNativeDialogCommand('freebsd')).toBeNull();
    });
  });

  describe('normalizeNativeDialogPath', () => {
    it('trims and strips a trailing slash (except root)', () => {
      expect(normalizeNativeDialogPath('/Users/dev/repo/\n')).toBe(
        '/Users/dev/repo',
      );
      expect(normalizeNativeDialogPath('/')).toBe('/');
      expect(normalizeNativeDialogPath('   ')).toBeNull();
    });
  });

  describe('pickNativeFolder', () => {
    let realDir: string;

    beforeAll(async () => {
      realDir = await mkdtemp(join(tmpdir(), 'ot-pick-'));
    });

    afterAll(async () => {
      await rm(realDir, { force: true, recursive: true });
    });

    it('returns the canonicalized absolute path on success', async () => {
      const result = await pickNativeFolder({
        platform: 'darwin',
        run: async () => `${realDir}/`,
      });

      expect(result).toEqual({ kind: 'picked', path: realpathSync(realDir) });
    });

    it('maps a non-zero exit with empty stdout to cancelled', async () => {
      const result = await pickNativeFolder({
        platform: 'darwin',
        run: async () => {
          throw Object.assign(new Error('User canceled.'), {
            code: 1,
            stdout: '',
          });
        },
      });

      expect(result).toEqual({ kind: 'cancelled' });
    });

    it('maps a killed child (timeout) to timeout', async () => {
      const result = await pickNativeFolder({
        platform: 'darwin',
        run: async () => {
          throw Object.assign(new Error('timed out'), {
            killed: true,
            signal: 'SIGTERM',
          });
        },
      });

      expect(result).toEqual({ kind: 'timeout' });
    });

    it('maps a missing dialog binary (ENOENT) to an error, not cancel', async () => {
      const result = await pickNativeFolder({
        platform: 'linux',
        run: async () => {
          throw Object.assign(new Error('spawn zenity ENOENT'), {
            code: 'ENOENT',
          });
        },
      });

      expect(result.kind).toBe('error');
    });

    it('reports unavailable for a platform with no picker wired', async () => {
      const result = await pickNativeFolder({ platform: 'freebsd' });

      expect(result).toEqual({ kind: 'unavailable' });
    });

    it('rejects a non-existent or relative chosen path as an error', async () => {
      const result = await pickNativeFolder({
        platform: 'darwin',
        run: async () => 'relative/path',
      });

      expect(result.kind).toBe('error');
    });
  });
});
