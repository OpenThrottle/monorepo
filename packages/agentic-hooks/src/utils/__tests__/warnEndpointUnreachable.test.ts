import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { warnEndpointUnreachable } from '../warnEndpointUnreachable.ts';

describe('warnEndpointUnreachable', () => {
  let tmp: string;
  let foreignRoot: string;
  let homeRoot: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-warn-once-'));
    vi.stubEnv('OPENTHROTTLE_TELEMETRY_DIR', path.join(tmp, 'telemetry'));

    foreignRoot = path.join(tmp, 'foreign');
    fs.mkdirSync(foreignRoot, { recursive: true });

    homeRoot = path.join(tmp, 'home');
    fs.mkdirSync(path.join(homeRoot, 'applications', 'openthrottle-server'), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(
        homeRoot,
        'applications',
        'openthrottle-server',
        'package.json',
      ),
      JSON.stringify({ name: 'openthrottle-server' }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    fs.rmSync(tmp, { force: true, recursive: true });
  });

  const stderrLines = (): string => {
    return vi
      .mocked(process.stderr.write)
      .mock.calls.map(([line]) => String(line))
      .join('');
  };

  describe('in a foreign repo', () => {
    it('warns once per session and stays silent afterwards', () => {
      vi.spyOn(process.stderr, 'write').mockReturnValue(true);
      const args = { message: 'down', repoRoot: foreignRoot, sessionId: 's1' };

      warnEndpointUnreachable(args);
      warnEndpointUnreachable(args);

      expect(stderrLines().match(/down/g)).toHaveLength(1);
    });

    it('warns again for a different session', () => {
      vi.spyOn(process.stderr, 'write').mockReturnValue(true);

      warnEndpointUnreachable({
        message: 'down',
        repoRoot: foreignRoot,
        sessionId: 's1',
      });
      warnEndpointUnreachable({
        message: 'down',
        repoRoot: foreignRoot,
        sessionId: 's2',
      });

      expect(stderrLines().match(/down/g)).toHaveLength(2);
    });
  });

  describe('in an OpenThrottle checkout', () => {
    it('warns on every failure', () => {
      vi.spyOn(process.stderr, 'write').mockReturnValue(true);
      const args = { message: 'down', repoRoot: homeRoot, sessionId: 's1' };

      warnEndpointUnreachable(args);
      warnEndpointUnreachable(args);

      expect(stderrLines().match(/down/g)).toHaveLength(2);
    });
  });
});
