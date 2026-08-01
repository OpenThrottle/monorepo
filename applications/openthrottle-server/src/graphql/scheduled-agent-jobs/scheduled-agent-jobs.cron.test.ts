import { describe, it, expect } from 'vitest';
import { validateScheduledAgentJobCron } from './scheduled-agent-jobs.cron';

describe('validateScheduledAgentJobCron', () => {
  it.each([
    ['0 9 * * *', 'daily at 09:00'],
    ['*/15 * * * *', 'every 15 minutes'],
    ['0,30 * * * *', 'twice hourly (list)'],
    ['0 0 9 * * *', '6-field fixed seconds'],
  ])('accepts %s (%s)', (pattern) => {
    expect(validateScheduledAgentJobCron(pattern).ok).toBe(true);
  });

  it.each([
    ['* * * * *', 'every minute'],
    ['0', 'bare number / wrong field count'],
    ['*/10 * * * * *', 'sub-minute (stepped seconds)'],
    ['0 9 * *', 'too few fields'],
    ['0 9 * * MON extra junk!', 'illegal characters'],
  ])('rejects %s (%s)', (pattern) => {
    const result = validateScheduledAgentJobCron(pattern);
    expect(result.ok).toBe(false);
    expect(result.reason).toBeTruthy();
  });
});
