import { describe, expect, test } from 'vitest';

import { sanitizeAgentSetupLog, stripAnsi } from '../agent-setup-log';

const ESC = '\u001b';
const BEL = '\u0007';

describe('agent-setup-log', () => {
  describe('stripAnsi', () => {
    test('removes SGR color codes', () => {
      expect(stripAnsi(`${ESC}[34m●${ESC}[39m done${ESC}[0m`)).toBe('● done');
    });

    test('removes multi-parameter SGR and cursor CSI sequences', () => {
      expect(stripAnsi(`${ESC}[1;32mok${ESC}[0m${ESC}[2K${ESC}[1G`)).toBe('ok');
    });

    test('removes OSC 8 hyperlinks terminated by BEL', () => {
      const link = `${ESC}]8;;https://opencode.ai${BEL}opencode.ai${ESC}]8;;${BEL}`;
      expect(stripAnsi(`see ${link}`)).toBe('see opencode.ai');
    });

    test('removes OSC 8 hyperlinks terminated by ST', () => {
      const link = `${ESC}]8;;https://brew.sh${ESC}\\brew${ESC}]8;;${ESC}\\`;
      expect(stripAnsi(link)).toBe('brew');
    });

    test('leaves bare SGR-looking text without an ESC byte untouched', () => {
      expect(stripAnsi('literal [0m and [90m┌')).toBe('literal [0m and [90m┌');
    });
  });

  describe('sanitizeAgentSetupLog', () => {
    describe('line endings', () => {
      test('normalizes CRLF to LF', () => {
        expect(sanitizeAgentSetupLog('one\r\ntwo\r\nthree')).toBe(
          'one\ntwo\nthree',
        );
      });
    });

    describe('carriage-return redraws', () => {
      test('collapses progress redraws to the last write on the line', () => {
        const raw = 'Downloading  10%\rDownloading  55%\rDownloading 100%\nok';
        expect(sanitizeAgentSetupLog(raw)).toBe('Downloading 100%\nok');
      });

      test('keeps the last non-empty write when the line ends in \\r', () => {
        expect(sanitizeAgentSetupLog('##   50%\r### 100%\r\ndone')).toBe(
          '### 100%\ndone',
        );
      });

      test('collapses redraws that are wrapped in color codes', () => {
        const raw = `${ESC}[32m 1/3${ESC}[0m\r${ESC}[32m 3/3${ESC}[0m\n`;
        expect(sanitizeAgentSetupLog(raw)).toBe(' 3/3');
      });
    });

    describe('trailing blank lines', () => {
      test('trims trailing blank and whitespace-only lines', () => {
        expect(sanitizeAgentSetupLog('done\n\n  \n\r\n')).toBe('done');
      });

      test('keeps interior blank lines', () => {
        expect(sanitizeAgentSetupLog('a\n\nb\n')).toBe('a\n\nb');
      });

      test('returns an empty string for empty or blank input', () => {
        expect(sanitizeAgentSetupLog('')).toBe('');
        expect(sanitizeAgentSetupLog('\n\r\n  \n')).toBe('');
      });
    });

    describe('opencode upgrade (brew) sample', () => {
      const raw = [
        `${ESC}[0m`,
        `${ESC}[90m┌${ESC}[39m  ${ESC}[1mUpgrade${ESC}[22m`,
        `${ESC}[90m│${ESC}[39m`,
        `${ESC}[34m●${ESC}[39m  Using method: brew`,
        `${ESC}[90m│${ESC}[39m`,
        `${ESC}[34m◇${ESC}[39m  From 1.0.10 → 1.0.12`,
        `==> ${ESC}[1mFetching ${ESC}]8;;https://formulae.brew.sh/formula/opencode${BEL}opencode${ESC}]8;;${BEL}${ESC}[0m`,
        `######                       20.1%\r############################ 100.0%`,
        `${ESC}[34m==>${ESC}[0m ${ESC}[1mPouring opencode--1.0.12.arm64_sequoia.bottle.tar.gz${ESC}[0m`,
        `${ESC}[90m└${ESC}[39m  ${ESC}[32mUpgrade complete${ESC}[39m`,
        '',
        '',
      ].join('\r\n');

      test('keeps box-drawing art and drops every color code', () => {
        expect(sanitizeAgentSetupLog(raw)).toBe(
          [
            '',
            '┌  Upgrade',
            '│',
            '●  Using method: brew',
            '│',
            '◇  From 1.0.10 → 1.0.12',
            '==> Fetching opencode',
            '############################ 100.0%',
            '==> Pouring opencode--1.0.12.arm64_sequoia.bottle.tar.gz',
            '└  Upgrade complete',
          ].join('\n'),
        );
      });

      test('leaves no ESC byte or SGR remnant behind', () => {
        const out = sanitizeAgentSetupLog(raw);
        expect(out).not.toContain(ESC);
        expect(out).not.toMatch(/\[\d+m/);
      });
    });
  });
});
