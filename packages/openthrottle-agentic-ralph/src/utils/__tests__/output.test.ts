import { describe, expect, it } from 'vitest';
import {
  agentOutputHasPromiseComplete,
  getRalphOutputMarkerFlags,
  parseAgentCompleteTaskSignals,
  parseAgentOutput,
} from '../output.js';

const UPPER = 'A64424D1-4BB0-4B08-ADE3-B9822411D05C';
const LOWER = 'a64424d1-4bb0-4b08-ade3-b9822411d05c';

describe('parseAgentCompleteTaskSignals', () => {
  it('preserves the original casing of the parsed UUID', () => {
    const ids = parseAgentCompleteTaskSignals(
      `<ralph:task-complete>${UPPER}</ralph:task-complete>`,
    );

    expect(ids).toEqual([UPPER]);
  });

  it('dedupes case-insensitively, keeping the first-seen casing', () => {
    const ids = parseAgentCompleteTaskSignals(
      `<ralph:task-complete>${UPPER}</ralph:task-complete>` +
        `<ralph:task-complete>${LOWER}</ralph:task-complete>`,
    );

    expect(ids).toEqual([UPPER]);
  });

  it('returns an empty list when no markers are present', () => {
    expect(parseAgentCompleteTaskSignals('no markers here')).toEqual([]);
  });
});

describe('parseAgentOutput control precedence (ERROR > INPUT_REQUIRED > COMPLETE)', () => {
  it('returns NONE when no promise marker is present', () => {
    expect(parseAgentOutput('plain agent output')).toBe('NONE');
  });

  it('returns ERROR for a lone error marker', () => {
    expect(parseAgentOutput('<promise>ERROR</promise>')).toBe('ERROR');
  });

  it('returns INPUT_REQUIRED for a lone input-required marker', () => {
    expect(parseAgentOutput('<promise>INPUT_REQUIRED</promise>')).toBe(
      'INPUT_REQUIRED',
    );
  });

  it('returns COMPLETE for a lone complete marker', () => {
    expect(parseAgentOutput('<promise>COMPLETE</promise>')).toBe('COMPLETE');
  });

  it('prefers ERROR over INPUT_REQUIRED and COMPLETE when all are present', () => {
    expect(
      parseAgentOutput(
        '<promise>COMPLETE</promise><promise>INPUT_REQUIRED</promise><promise>ERROR</promise>',
      ),
    ).toBe('ERROR');
  });

  it('prefers INPUT_REQUIRED over COMPLETE when both are present', () => {
    expect(
      parseAgentOutput(
        '<promise>COMPLETE</promise><promise>INPUT_REQUIRED</promise>',
      ),
    ).toBe('INPUT_REQUIRED');
  });
});

describe('getRalphOutputMarkerFlags', () => {
  it('snapshots each marker independently', () => {
    expect(
      getRalphOutputMarkerFlags(
        '<promise>ERROR</promise><promise>COMPLETE</promise>',
      ),
    ).toEqual({
      hasComplete: true,
      hasError: true,
      hasInputRequired: false,
    });
  });

  it('reports all-false when no markers are present', () => {
    expect(getRalphOutputMarkerFlags('nothing here')).toEqual({
      hasComplete: false,
      hasError: false,
      hasInputRequired: false,
    });
  });
});

describe('agentOutputHasPromiseComplete', () => {
  it('is true only when the complete marker is present', () => {
    expect(agentOutputHasPromiseComplete('<promise>COMPLETE</promise>')).toBe(
      true,
    );
    expect(agentOutputHasPromiseComplete('<promise>ERROR</promise>')).toBe(
      false,
    );
  });
});
