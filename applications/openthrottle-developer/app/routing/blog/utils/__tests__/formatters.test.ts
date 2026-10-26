import { describe, expect, test } from 'vitest';

import { BlogPostState } from '~/__generated__/graphql';

import {
  formatBlogDateTime,
  formatBlogPublishedLabel,
  formatBlogScheduledFor,
  formatBlogTimeZoneName,
} from '../formatters';

const ISO = '2026-11-01T17:00:00.000Z';

describe('formatBlogDateTime', () => {
  test('shows the date, time and short zone name', () => {
    expect(formatBlogDateTime(ISO, 'UTC')).toBe('Nov 1, 2026, 5:00 PM UTC');
  });

  test('formats in the requested zone', () => {
    expect(formatBlogDateTime(ISO, 'America/Los_Angeles')).toBe(
      'Nov 1, 2026, 9:00 AM PST',
    );
  });

  test('renders an em dash for an unparseable value', () => {
    expect(formatBlogDateTime('not-a-date', 'UTC')).toBe('—');
  });
});

describe('formatBlogPublishedLabel', () => {
  test('is an em dash when there is no publish time', () => {
    expect(formatBlogPublishedLabel(BlogPostState.Draft, null, 'UTC')).toBe(
      '—',
    );
  });

  test('says when a scheduled post goes live, with the zone', () => {
    expect(formatBlogPublishedLabel(BlogPostState.Scheduled, ISO, 'UTC')).toBe(
      'goes live Nov 1, 2026, 5:00 PM UTC',
    );
  });

  test('shows only the date for a live post', () => {
    expect(formatBlogPublishedLabel(BlogPostState.Live, ISO, 'UTC')).toBe(
      'Nov 1, 2026, 5:00 PM UTC',
    );
  });
});

describe('formatBlogScheduledFor', () => {
  test('reads "Scheduled for <date time> (<zone>)"', () => {
    expect(formatBlogScheduledFor(ISO, 'UTC')).toBe(
      'Scheduled for Nov 1, 2026, 5:00 PM (UTC)',
    );
    expect(formatBlogScheduledFor(ISO, 'America/Los_Angeles')).toBe(
      'Scheduled for Nov 1, 2026, 9:00 AM (PST)',
    );
  });

  test('renders an em dash for an unparseable value', () => {
    expect(formatBlogScheduledFor('not-a-date', 'UTC')).toBe('—');
  });
});

describe('formatBlogTimeZoneName', () => {
  test('is the short zone name at that moment', () => {
    expect(formatBlogTimeZoneName(new Date(ISO), 'America/New_York')).toBe(
      'EST',
    );
  });
});
