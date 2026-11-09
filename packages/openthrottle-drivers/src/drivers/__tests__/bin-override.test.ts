/**
 * @description Asserts every registered driver invokes `config.bin` (shell-escaped) in place of its
 * bare binary name, and keeps the bare name when `bin` is omitted — so the engine's binEnv
 * resolution reaches the spawned command for every CLI, including the env-prefixed ones.
 */

import { describe, expect, it } from 'vitest';

import { escapeShellArg } from '../../utils/shell.ts';
import { ALL_DRIVERS } from '../index.ts';

const STUB_DIR = '/tmp/ot stub';

describe('driver bin override', () => {
  describe('when config.bin is set', () => {
    it.each(ALL_DRIVERS.map((driver) => [driver.id, driver] as const))(
      '%s invokes the escaped bin instead of the bare binary',
      (_id, driver) => {
        const bin = `${STUB_DIR}/${driver.binary}`;
        const command = driver.buildShellCommand({
          bin,
          iteration: 1,
          prompt: 'hi',
        });

        expect(command).toContain(`${escapeShellArg(bin)} `);
        expect(command.startsWith(`${driver.binary} `)).toBe(false);
      },
    );
  });

  describe('when config.bin is omitted', () => {
    it.each(ALL_DRIVERS.map((driver) => [driver.id, driver] as const))(
      '%s invokes the bare binary',
      (_id, driver) => {
        const command = driver.buildShellCommand({
          iteration: 1,
          prompt: 'hi',
        });

        expect(command.startsWith(`${driver.binary} `)).toBe(true);
      },
    );
  });
});
