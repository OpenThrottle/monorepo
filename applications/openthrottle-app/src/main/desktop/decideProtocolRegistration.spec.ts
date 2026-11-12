import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { decideProtocolRegistration } from './decideProtocolRegistration.ts';

const base = {
  argv: ['/e/electron', '.'],
  defaultApp: true,
  execPath: '/e/electron',
  isMac: false,
  isPackaged: false,
};

describe('decideProtocolRegistration', () => {
  it('registers a packaged app with no extra arguments', () => {
    expect(decideProtocolRegistration({ ...base, isPackaged: true })).toEqual({
      args: [],
      execPath: undefined,
      kind: 'register',
    });
  });

  it('registers an unpackaged dev run with execPath and the app path', () => {
    expect(decideProtocolRegistration(base)).toEqual({
      args: [resolve('.')],
      execPath: '/e/electron',
      kind: 'register',
    });
  });

  it('skips an unpackaged macOS run', () => {
    expect(decideProtocolRegistration({ ...base, isMac: true }).kind).toBe(
      'skip',
    );
  });

  it('skips when there is no app path argument', () => {
    expect(
      decideProtocolRegistration({ ...base, argv: ['/e/electron'] }).kind,
    ).toBe('skip');
  });
});
