import { describe, expect, it } from 'vitest';

import type { DriverInvocationConfig } from '../../types/index.ts';
import { DRIVER_OUTPUT_FORMATS } from '../../utils/output-format.ts';
import {
  antigravityDriver,
  claudeDriver,
  codexDriver,
  cursorDriver,
  geminiDriver,
  grokDriver,
  opencodeDriver,
} from '../index.ts';

const config = (
  overrides: Partial<DriverInvocationConfig> = {},
): DriverInvocationConfig => {
  return { iteration: 1, prompt: 'do the task', ...overrides };
};

const structured = config({ outputFormat: DRIVER_OUTPUT_FORMATS.structured });

const STRUCTURED_DRIVERS = [
  { driver: codexDriver, flag: ' --json ' },
  { driver: cursorDriver, flag: ' --output-format stream-json' },
  { driver: geminiDriver, flag: ' --output-format stream-json' },
  { driver: antigravityDriver, flag: ' --output-format stream-json' },
  { driver: grokDriver, flag: ' --output-format streaming-json' },
  { driver: opencodeDriver, flag: ' --format json' },
];

describe('structured output', () => {
  describe.each(STRUCTURED_DRIVERS)('$driver.id', ({ driver, flag }) => {
    it('emits the structured flag when asked', () => {
      expect(driver.buildShellCommand(structured)).toContain(flag);
    });

    it('keeps the historical text command by default', () => {
      expect(driver.buildShellCommand(config())).not.toContain(flag.trim());
    });

    it('keeps the historical text command when text is asked for', () => {
      const text = config({ outputFormat: DRIVER_OUTPUT_FORMATS.text });

      expect(driver.buildShellCommand(text)).toBe(
        driver.buildShellCommand(config()),
      );
    });
  });

  describe('flag placement', () => {
    it('puts --json right after `codex exec`', () => {
      expect(codexDriver.buildShellCommand(structured)).toMatch(
        /^codex exec --json --sandbox workspace-write --skip-git-repo-check /,
      );
    });

    it('never separates agy `-p` from its prompt value', () => {
      expect(antigravityDriver.buildShellCommand(structured)).toMatch(
        /^agy -p "do the task" --output-format stream-json /,
      );
    });

    it('keeps the gemini stdin redirect last', () => {
      expect(geminiDriver.buildShellCommand(structured)).toMatch(
        /--output-format stream-json < \/dev\/null$/,
      );
    });
  });

  describe('claude', () => {
    it('is always structured and ignores the requested format', () => {
      const text = config({ outputFormat: DRIVER_OUTPUT_FORMATS.text });

      expect(claudeDriver.buildShellCommand(text)).toBe(
        claudeDriver.buildShellCommand(structured),
      );
    });
  });

  describe('reportsToolCalls', () => {
    it('is false only for grok, whose headless stream has no tool events', () => {
      const silent = [
        antigravityDriver,
        claudeDriver,
        codexDriver,
        cursorDriver,
        geminiDriver,
        grokDriver,
        opencodeDriver,
      ]
        .filter((driver) => !driver.capabilities.reportsToolCalls)
        .map((driver) => driver.id);

      expect(silent).toEqual(['grok']);
    });
  });
});
