import { describe, expect, test } from 'vitest';
import { summarizeRuleAction } from '../formatters';

describe('summarizeRuleAction', () => {
  test('summarizes an inject-task payload as skill · placement', () => {
    expect(
      summarizeRuleAction(
        'inject-task',
        '{"placement":"last","skillSlug":"grilling"}',
      ),
    ).toBe('grilling · last');
  });

  test('defaults placement and flags a missing skill', () => {
    expect(summarizeRuleAction('inject-task', '{}')).toBe('(no skill) · first');
  });

  test('summarizes availability-exception as allow/deny counts', () => {
    expect(
      summarizeRuleAction(
        'availability-exception',
        '{"tagAllow":["a","b"],"tagDeny":["c"],"slugAllow":[],"slugDeny":["d","e"]}',
      ),
    ).toBe('allow 2 · deny 3');
  });

  test('degrades gracefully on unparseable JSON', () => {
    expect(summarizeRuleAction('inject-task', 'not json')).toBe(
      'unparseable payload',
    );
  });
});
