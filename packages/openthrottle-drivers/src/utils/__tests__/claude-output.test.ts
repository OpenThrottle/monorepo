/**
 * @description Unit tests for `parseClaudeStreamJsonOutput` with realistic stream-json NDJSON
 * fixtures: success, rejected + 429, 429 without a rate-limit event, allowed-only, no `result`
 * (crash/kill), noise lines, and multi-line result text.
 */

import { describe, expect, it } from 'vitest';

import {
  parseClaudeStreamJsonOutput,
  renderClaudeStreamJsonLine,
} from '../claude-output.ts';

const RESETS_AT = 1_793_594_400;
const RESETS_AT_ISO = new Date(RESETS_AT * 1000).toISOString();

const ndjson = (...events: readonly (object | string)[]): string => {
  return events
    .map((event) => (typeof event === 'string' ? event : JSON.stringify(event)))
    .join('\n');
};

const initEvent = {
  cwd: '/work',
  model: 'claude-haiku-4-5',
  session_id: 's-1',
  subtype: 'init',
  type: 'system',
  uuid: 'u-0',
};

const assistantEvent = {
  message: { content: [{ text: 'done', type: 'text' }], role: 'assistant' },
  session_id: 's-1',
  type: 'assistant',
  uuid: 'u-1',
};

const rateLimit = (status: string): object => {
  return {
    rate_limit_info: {
      overageStatus: 'allowed',
      rateLimitType: 'five_hour',
      resetsAt: RESETS_AT,
      status,
    },
    session_id: 's-1',
    type: 'rate_limit_event',
    uuid: 'u-2',
  };
};

describe('parseClaudeStreamJsonOutput', () => {
  it('takes result.result as the text on success, with no usage limit', () => {
    const stdout = ndjson(initEvent, assistantEvent, rateLimit('allowed'), {
      is_error: false,
      result: 'done\n<promise>COMPLETE</promise>',
      session_id: 's-1',
      type: 'result',
    });

    expect(parseClaudeStreamJsonOutput(stdout)).toEqual({
      text: 'done\n<promise>COMPLETE</promise>',
      usageLimit: null,
    });
  });

  it('returns the rejected event info when the run ends in a 429 error result', () => {
    const stdout = ndjson(initEvent, rateLimit('rejected'), {
      api_error_status: 429,
      is_error: true,
      result: "You've hit your limit",
      type: 'result',
    });

    expect(parseClaudeStreamJsonOutput(stdout)).toEqual({
      text: "You've hit your limit",
      usageLimit: { rateLimitType: 'five_hour', resetsAt: RESETS_AT_ISO },
    });
  });

  it('keeps the event info for a rejected event followed by any error result', () => {
    const stdout = ndjson(rateLimit('rejected'), {
      api_error_status: 500,
      is_error: true,
      result: 'boom',
      type: 'result',
    });

    expect(parseClaudeStreamJsonOutput(stdout).usageLimit).toEqual({
      rateLimitType: 'five_hour',
      resetsAt: RESETS_AT_ISO,
    });
  });

  it('reports limited-with-unknown-reset for a 429 result without a rejected event', () => {
    const stdout = ndjson(initEvent, rateLimit('allowed'), {
      api_error_status: 429,
      is_error: true,
      result: 'Server is busy',
      type: 'result',
    });

    expect(parseClaudeStreamJsonOutput(stdout)).toEqual({
      text: 'Server is busy',
      usageLimit: { rateLimitType: null, resetsAt: null },
    });
  });

  it('does not treat a non-429 error result without a rejected event as a limit', () => {
    const stdout = ndjson(initEvent, {
      api_error_status: 500,
      is_error: true,
      result: 'internal error',
      type: 'result',
    });

    expect(parseClaudeStreamJsonOutput(stdout)).toEqual({
      text: 'internal error',
      usageLimit: null,
    });
  });

  it('ignores allowed / allowed_warning events', () => {
    const stdout = ndjson(rateLimit('allowed'), rateLimit('allowed_warning'), {
      is_error: false,
      result: 'ok',
      type: 'result',
    });

    expect(parseClaudeStreamJsonOutput(stdout).usageLimit).toBeNull();
  });

  it('does not flag a limit when a rejected event is followed by a successful result', () => {
    const stdout = ndjson(rateLimit('rejected'), {
      is_error: false,
      result: 'finished anyway',
      type: 'result',
    });

    expect(parseClaudeStreamJsonOutput(stdout)).toEqual({
      text: 'finished anyway',
      usageLimit: null,
    });
  });

  it('uses the LAST rejected event and the LAST result event', () => {
    const stdout = ndjson(
      {
        rate_limit_info: { rateLimitType: 'seven_day', status: 'rejected' },
        type: 'rate_limit_event',
      },
      rateLimit('rejected'),
      { is_error: false, result: 'first', type: 'result' },
      {
        api_error_status: 429,
        is_error: true,
        result: 'second',
        type: 'result',
      },
    );

    expect(parseClaudeStreamJsonOutput(stdout)).toEqual({
      text: 'second',
      usageLimit: { rateLimitType: 'five_hour', resetsAt: RESETS_AT_ISO },
    });
  });

  it('falls back to the trimmed raw stdout when there is no result event', () => {
    const stdout = `\n${ndjson(initEvent, assistantEvent)}\n  \n`;

    expect(parseClaudeStreamJsonOutput(stdout)).toEqual({
      text: ndjson(initEvent, assistantEvent),
      usageLimit: null,
    });
  });

  it('keeps a rejected event as the limit when the run died before any result', () => {
    const stdout = ndjson(initEvent, rateLimit('rejected'));

    expect(parseClaudeStreamJsonOutput(stdout).usageLimit).toEqual({
      rateLimitType: 'five_hour',
      resetsAt: RESETS_AT_ISO,
    });
  });

  it('returns the raw text for non-stream-json output (e.g. a CLI error)', () => {
    expect(parseClaudeStreamJsonOutput('Error: Invalid API key\n')).toEqual({
      text: 'Error: Invalid API key',
      usageLimit: null,
    });
    expect(parseClaudeStreamJsonOutput('')).toEqual({
      text: '',
      usageLimit: null,
    });
  });

  it('skips noise lines from plugins and hooks, and malformed JSON', () => {
    const stdout = ndjson(
      'plugin loaded: openthrottle',
      initEvent,
      '{"type":"assistant","message":',
      '   ',
      '[1,2,3]',
      '{"type":"result","result":"clean","is_error":false}',
      'trailing hook chatter',
    );

    expect(parseClaudeStreamJsonOutput(stdout)).toEqual({
      text: 'clean',
      usageLimit: null,
    });
  });

  it('preserves multi-line result text and embedded JSON-looking content', () => {
    const text =
      'line one\n\nline three {"type":"result"}\n<promise>COMPLETE</promise>';
    const stdout = ndjson(initEvent, {
      is_error: false,
      result: text,
      type: 'result',
    });

    expect(parseClaudeStreamJsonOutput(stdout).text).toBe(text);
  });

  it('yields empty text when the result event carries no string result', () => {
    const stdout = ndjson({
      is_error: false,
      subtype: 'success',
      type: 'result',
    });

    expect(parseClaudeStreamJsonOutput(stdout)).toEqual({
      text: '',
      usageLimit: null,
    });
  });
});

describe('renderClaudeStreamJsonLine', () => {
  const line = (event: object): string => {
    return JSON.stringify(event);
  };

  it('renders the concatenated text blocks of an assistant event', () => {
    expect(
      renderClaudeStreamJsonLine(
        line({
          message: {
            content: [
              { text: 'Looking at the file.', type: 'text' },
              { text: 'Done.', type: 'text' },
            ],
          },
          type: 'assistant',
        }),
      ),
    ).toBe('Looking at the file.\nDone.');
  });

  it('renders a tool_use block as a short arrow line, after any text', () => {
    expect(
      renderClaudeStreamJsonLine(
        line({
          message: {
            content: [
              { text: 'Reading.', type: 'text' },
              {
                id: 't1',
                input: { path: '/x' },
                name: 'Read',
                type: 'tool_use',
              },
            ],
          },
          type: 'assistant',
        }),
      ),
    ).toBe('Reading.\n→ Read');
  });

  it('skips assistant events with no text or tool_use (e.g. thinking only)', () => {
    expect(
      renderClaudeStreamJsonLine(
        line({
          message: { content: [{ thinking: 'hmm', type: 'thinking' }] },
          type: 'assistant',
        }),
      ),
    ).toBeNull();
    expect(
      renderClaudeStreamJsonLine(line({ message: {}, type: 'assistant' })),
    ).toBeNull();
  });

  it('renders a rejected rate_limit_event with type and reset time', () => {
    expect(renderClaudeStreamJsonLine(line(rateLimit('rejected')))).toBe(
      `Usage limit reached (five_hour) — resets ${RESETS_AT_ISO}`,
    );
  });

  it('omits unknown parts of a rejected rate_limit_event', () => {
    expect(
      renderClaudeStreamJsonLine(
        line({
          rate_limit_info: { rateLimitType: 'seven_day', status: 'rejected' },
          type: 'rate_limit_event',
        }),
      ),
    ).toBe('Usage limit reached (seven_day)');
    expect(
      renderClaudeStreamJsonLine(
        line({
          rate_limit_info: { status: 'rejected' },
          type: 'rate_limit_event',
        }),
      ),
    ).toBe('Usage limit reached');
  });

  it('skips allowed rate_limit_events', () => {
    expect(renderClaudeStreamJsonLine(line(rateLimit('allowed')))).toBeNull();
  });

  it('renders an error result and skips a successful one', () => {
    expect(
      renderClaudeStreamJsonLine(
        line({
          api_error_status: 429,
          is_error: true,
          result: "You've hit your limit",
          type: 'result',
        }),
      ),
    ).toBe("Error: You've hit your limit");
    expect(
      renderClaudeStreamJsonLine(
        line({ is_error: false, result: 'done', type: 'result' }),
      ),
    ).toBeNull();
  });

  it('skips system, hook, user tool_result echoes and unknown events', () => {
    for (const event of [
      initEvent,
      { subtype: 'hook_started', type: 'system' },
      { message: { content: [{ type: 'tool_result' }] }, type: 'user' },
      { type: 'something_new' },
    ]) {
      expect(renderClaudeStreamJsonLine(line(event))).toBeNull();
    }
  });

  it('passes non-JSON lines through unchanged and skips blank lines', () => {
    expect(renderClaudeStreamJsonLine('plugin loaded: openthrottle')).toBe(
      'plugin loaded: openthrottle',
    );
    expect(renderClaudeStreamJsonLine('{"type":"assistant","message":')).toBe(
      '{"type":"assistant","message":',
    );
    expect(renderClaudeStreamJsonLine('   ')).toBeNull();
    expect(renderClaudeStreamJsonLine('')).toBeNull();
  });
});
