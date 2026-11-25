import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  isTelemetryDisabled,
  TELEMETRY_DISABLED_ENV_KEY,
} from '../isTelemetryDisabled.ts';

describe('isTelemetryDisabled', () => {
  let home: string;

  beforeEach(() => {
    home = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-disabled-'));
    vi.stubEnv('HOME', home);
    vi.stubEnv(TELEMETRY_DISABLED_ENV_KEY, '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    fs.rmSync(home, { force: true, recursive: true });
  });

  const writeUserEnv = (line: string): void => {
    fs.mkdirSync(path.join(home, '.openthrottle'), { recursive: true });
    fs.writeFileSync(path.join(home, '.openthrottle', '.env'), `${line}\n`);
  };

  it('is off by default', () => {
    expect(isTelemetryDisabled()).toBe(false);
  });

  it.each(['1', 'true', 'TRUE'])('honours %s in process.env', (value) => {
    vi.stubEnv(TELEMETRY_DISABLED_ENV_KEY, value);
    expect(isTelemetryDisabled()).toBe(true);
  });

  it('honours the user-global env file', () => {
    writeUserEnv(`${TELEMETRY_DISABLED_ENV_KEY}=1`);
    expect(isTelemetryDisabled()).toBe(true);
  });

  it.each(['0', 'false', 'yes'])('ignores %s', (value) => {
    vi.stubEnv(TELEMETRY_DISABLED_ENV_KEY, value);
    writeUserEnv(`${TELEMETRY_DISABLED_ENV_KEY}=${value}`);
    expect(isTelemetryDisabled()).toBe(false);
  });
});
