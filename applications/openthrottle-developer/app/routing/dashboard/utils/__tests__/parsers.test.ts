import { describe, expect, test } from 'vitest';
import { parseDashboardGithubParams } from '../parsers';

describe('parseDashboardGithubParams', () => {
  test('should default owner and repo when params are missing', () => {
    expect(parseDashboardGithubParams(new URLSearchParams())).toEqual({
      owner: 'openthrottle',
      repo: 'monorepo',
    });
  });

  test('should parse valid owner and repo', () => {
    const params = new URLSearchParams('owner=shiftsmartinc&repo=native-apps');
    expect(parseDashboardGithubParams(params)).toEqual({
      owner: 'shiftsmartinc',
      repo: 'native-apps',
    });
  });

  test('should fall back to default owner when owner is invalid', () => {
    const params = new URLSearchParams('owner=unknown&repo=monorepo');
    expect(parseDashboardGithubParams(params)).toEqual({
      owner: 'openthrottle',
      repo: 'monorepo',
    });
  });

  test('should fall back to default repo when repo is invalid for default owner', () => {
    const params = new URLSearchParams('owner=openthrottle&repo=unknown');
    expect(parseDashboardGithubParams(params)).toEqual({
      owner: 'openthrottle',
      repo: 'monorepo',
    });
  });

  test('should use first repo for org when repo is invalid for a non-default owner', () => {
    const params = new URLSearchParams('owner=visormatt&repo=unknown');
    expect(parseDashboardGithubParams(params)).toEqual({
      owner: 'visormatt',
      repo: 'monorepo',
    });
  });

  test('should preserve unrelated search params in the input object', () => {
    const params = new URLSearchParams(
      'modal=daily-stats&owner=visormatt&repo=monorepo',
    );
    expect(parseDashboardGithubParams(params)).toEqual({
      owner: 'visormatt',
      repo: 'monorepo',
    });
  });
});
