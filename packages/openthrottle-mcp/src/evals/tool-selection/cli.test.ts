import { afterEach, describe, expect, it, vi } from 'vitest';

import { main } from './cli.ts';

describe('main', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  describe('when ANTHROPIC_API_KEY is unset', () => {
    it('exits 2 before touching the network', async () => {
      vi.stubEnv('ANTHROPIC_API_KEY', '');
      const stderr = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
      const fetchSpy = vi.spyOn(globalThis, 'fetch');

      expect(await main([])).toBe(2);
      expect(String(stderr.mock.calls[0]?.[0])).toContain('ANTHROPIC_API_KEY');
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe('when a CLI driver is requested', () => {
    it.each(['claude', 'codex', 'claude,codex,cursor'])(
      'exits 2 for --driver %s before touching the network',
      async (driver) => {
        vi.stubEnv('ANTHROPIC_API_KEY', 'k');
        const stderr = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
        const fetchSpy = vi.spyOn(globalThis, 'fetch');

        expect(await main(['--driver', driver])).toBe(2);
        expect(String(stderr.mock.calls[0]?.[0])).toContain('sandboxed MCP');
        expect(fetchSpy).not.toHaveBeenCalled();
      },
    );
  });

  describe('when --write-baseline is combined with --case', () => {
    it('exits 2, since a baseline must cover the full suite', async () => {
      vi.stubEnv('ANTHROPIC_API_KEY', 'k');
      vi.spyOn(process.stderr, 'write').mockReturnValue(true);

      expect(await main(['--write-baseline', '--case', 'control'])).toBe(2);
    });
  });

  describe('when --case matches nothing', () => {
    it('exits 2', async () => {
      vi.stubEnv('ANTHROPIC_API_KEY', 'k');
      vi.spyOn(process.stderr, 'write').mockReturnValue(true);

      expect(await main(['--case', 'no-such-case'])).toBe(2);
    });
  });
});
