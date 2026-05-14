import { describe, expect, test } from 'vitest';
import {
  buildPullRequestListSearchWithPreview,
  parsePullRequestListPreviewNumber,
  PULL_REQUEST_LIST_PREVIEW_SEARCH_PARAM,
} from '../pull-request-list-url';

describe('pull-request-list-url', () => {
  test('parsePullRequestListPreviewNumber returns null for empty or invalid', () => {
    expect(parsePullRequestListPreviewNumber(null)).toBeNull();
    expect(parsePullRequestListPreviewNumber('')).toBeNull();
    expect(parsePullRequestListPreviewNumber('   ')).toBeNull();
    expect(parsePullRequestListPreviewNumber('abc')).toBeNull();
    expect(parsePullRequestListPreviewNumber('0')).toBeNull();
    expect(parsePullRequestListPreviewNumber('-3')).toBeNull();
  });

  test('parsePullRequestListPreviewNumber parses positive integers', () => {
    expect(parsePullRequestListPreviewNumber('42')).toBe(42);
    expect(parsePullRequestListPreviewNumber('1')).toBe(1);
  });

  test('buildPullRequestListSearchWithPreview preserves filters and sets pr', () => {
    const merged = buildPullRequestListSearchWithPreview(
      'state=open&owner=o',
      7,
    );
    const params = new URLSearchParams(merged);

    expect(params.get('state')).toBe('open');
    expect(params.get('owner')).toBe('o');
    expect(params.get(PULL_REQUEST_LIST_PREVIEW_SEARCH_PARAM)).toBe('7');

    const onlyPr = buildPullRequestListSearchWithPreview('', 99);
    const paramsPr = new URLSearchParams(onlyPr);

    expect(paramsPr.get(PULL_REQUEST_LIST_PREVIEW_SEARCH_PARAM)).toBe('99');
  });
});
