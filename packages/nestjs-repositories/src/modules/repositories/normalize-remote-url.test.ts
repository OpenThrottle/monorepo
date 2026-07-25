import { describe, expect, it } from 'vitest';
import { normalizeRemoteUrl } from './normalize-remote-url';

describe('normalizeRemoteUrl', () => {
  it('converts ssh shorthand to canonical https', () => {
    expect(normalizeRemoteUrl('git@github.com:OpenThrottle/monorepo.git')).toBe(
      'https://github.com/OpenThrottle/monorepo',
    );
  });

  it('converts ssh:// urls, dropping userinfo', () => {
    expect(
      normalizeRemoteUrl('ssh://git@github.com/OpenThrottle/monorepo.git'),
    ).toBe('https://github.com/OpenThrottle/monorepo');
  });

  it('upgrades http to https', () => {
    expect(normalizeRemoteUrl('http://github.com/org/repo')).toBe(
      'https://github.com/org/repo',
    );
  });

  it('drops userinfo from https urls', () => {
    expect(normalizeRemoteUrl('https://token@github.com/org/repo.git')).toBe(
      'https://github.com/org/repo',
    );
  });

  it('lowercases the host but preserves path case', () => {
    expect(normalizeRemoteUrl('https://GitHub.COM/OpenThrottle/Monorepo')).toBe(
      'https://github.com/OpenThrottle/Monorepo',
    );
  });

  it('strips trailing .git and trailing slashes', () => {
    expect(normalizeRemoteUrl('https://github.com/org/repo.git/')).toBe(
      'https://github.com/org/repo.git',
    );
    expect(normalizeRemoteUrl('https://github.com/org/repo.git')).toBe(
      'https://github.com/org/repo',
    );
    expect(normalizeRemoteUrl('https://github.com/org/repo///')).toBe(
      'https://github.com/org/repo',
    );
  });

  it('normalizes equivalent ssh and https forms to the same identity', () => {
    const viaSsh = normalizeRemoteUrl('git@github.com:org/repo.git');
    const viaHttps = normalizeRemoteUrl('https://github.com/org/repo');
    expect(viaSsh).toBe(viaHttps);
  });

  it('returns null for empty or whitespace input', () => {
    expect(normalizeRemoteUrl('')).toBeNull();
    expect(normalizeRemoteUrl('   ')).toBeNull();
  });

  it('returns null for unrecognizable forms', () => {
    expect(normalizeRemoteUrl('/local/path/only')).toBeNull();
    expect(normalizeRemoteUrl('file:///tmp/repo')).toBeNull();
    expect(normalizeRemoteUrl('https://hostonly')).toBeNull();
  });
});
