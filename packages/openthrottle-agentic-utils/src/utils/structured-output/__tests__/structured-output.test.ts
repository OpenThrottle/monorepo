import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  antigravityDriver,
  claudeDriver,
  codexDriver,
  cursorDriver,
  DRIVER_OUTPUT_FORMATS,
} from '@openthrottle/openthrottle-drivers';
import { describe, expect, it } from 'vitest';

import { CONVERSATION_STREAM_CHUNK_KINDS } from '../../conversation-backend/types.ts';
import {
  createStructuredChunkReader,
  readStructuredOutput,
} from '../chunk-reader.ts';
import {
  createStructuredLineRenderer,
  recoverStructuredText,
  withStructuredOutput,
} from '../with-structured-output.ts';

const FIXTURES = join(import.meta.dirname, 'fixtures');

const fixture = (name: string): string => {
  return readFileSync(join(FIXTURES, `${name}.ndjson`), 'utf8');
};

const kindsOf = (driverId: string, name: string): readonly string[] => {
  return readStructuredOutput(driverId, fixture(name)).map((chunk) => {
    return chunk.kind;
  });
};

const render = (driverId: string, name: string): readonly string[] => {
  const renderLine = createStructuredLineRenderer(driverId);

  return fixture(name)
    .split('\n')
    .map(renderLine)
    .filter((line): line is string => {
      return line !== null;
    });
};

/** Recorded (or, for codex, synthetic) runs of the same one-tool prompt. */
const SUCCESSFUL_RUNS = [
  {
    driverId: 'antigravity',
    line: '→ write_file fixture/hello.txt',
    name: 'antigravity',
  },
  { driverId: 'claude', line: '→ Write fixture/hello.txt', name: 'claude' },
  {
    driverId: 'codex',
    line: "→ command_execution bash -lc 'echo hi > hello.txt'",
    name: 'codex.synthetic',
  },
  { driverId: 'cursor', line: '→ edit fixture/hello.txt', name: 'cursor' },
];

describe('createStructuredChunkReader', () => {
  it('has a reader for every plan-run driver', () => {
    const ids = [
      'antigravity',
      'claude',
      'codex',
      'cursor',
      'grok',
      'opencode',
    ];

    expect(
      ids.filter((id) => {
        return createStructuredChunkReader(id) === undefined;
      }),
    ).toEqual([]);
  });

  it('has no reader for an unknown driver', () => {
    expect(createStructuredChunkReader('nope')).toBeUndefined();
  });
});

describe('readStructuredOutput', () => {
  describe.each(SUCCESSFUL_RUNS)('$driverId', ({ driverId, name }) => {
    it('surfaces the tool the agent used and its final text', () => {
      const kinds = kindsOf(driverId, name);

      expect(kinds).toContain(CONVERSATION_STREAM_CHUNK_KINDS.toolResult);
      expect(kinds).toContain(CONVERSATION_STREAM_CHUNK_KINDS.text);
      expect(kinds).toContain(CONVERSATION_STREAM_CHUNK_KINDS.usage);
    });
  });

  describe('claude and cursor in plan-run mode', () => {
    it('recover the consolidated assistant text the chat mapper skips', () => {
      const text = ['claude', 'cursor'].map((driverId) => {
        return readStructuredOutput(driverId, fixture(driverId))
          .filter((chunk) => {
            return chunk.kind === CONVERSATION_STREAM_CHUNK_KINDS.text;
          })
          .map((chunk) => {
            return chunk.delta;
          })
          .join('');
      });

      expect(text).toEqual(['DONE', 'DONE']);
    });
  });

  describe('opencode 1.18 `tool_use` events', () => {
    it('map to a tool result instead of being dropped', () => {
      expect(kindsOf('opencode', 'opencode')).toContain(
        CONVERSATION_STREAM_CHUNK_KINDS.toolResult,
      );
    });
  });

  describe('non-JSON noise', () => {
    it('is skipped without throwing', () => {
      const raw = `banner line\n\n{not json\n${fixture('codex.synthetic')}`;

      expect(readStructuredOutput('codex', raw)).toEqual(
        readStructuredOutput('codex', fixture('codex.synthetic')),
      );
    });
  });

  describe('an unknown driver', () => {
    it('reads nothing', () => {
      expect(readStructuredOutput('nope', fixture('claude'))).toEqual([]);
    });
  });
});

describe('recoverStructuredText', () => {
  describe.each(SUCCESSFUL_RUNS)('$driverId', ({ driverId, name }) => {
    it('returns what a text-mode run would have printed', () => {
      expect(recoverStructuredText(driverId, fixture(name))).toEqual({
        text: 'DONE',
        usageLimit: null,
      });
    });
  });

  describe('a stream that ends in an error', () => {
    it('keeps the error visible', () => {
      const { text } = recoverStructuredText('opencode', fixture('opencode'));

      expect(text).toMatch(/^Error: .*use case details/);
    });
  });

  describe('stdout with no JSON at all', () => {
    it('falls back to the raw output', () => {
      expect(recoverStructuredText('codex', '  Not logged in\n')).toEqual({
        text: 'Not logged in',
        usageLimit: null,
      });
    });
  });

  describe('Ralph markers', () => {
    it('survive inside the recovered text', () => {
      const raw = fixture('codex.synthetic').replace(
        '"text":"DONE"',
        '"text":"All good. <promise>COMPLETE</promise>"',
      );

      expect(recoverStructuredText('codex', raw).text).toContain(
        '<promise>COMPLETE</promise>',
      );
    });
  });
});

describe('createStructuredLineRenderer', () => {
  describe.each(SUCCESSFUL_RUNS)('$driverId', ({ driverId, line, name }) => {
    it('renders one line per tool, with its argument, and the final text, nothing raw', () => {
      expect(render(driverId, name)).toEqual([line, 'DONE']);
    });
  });

  describe('codex, which reports a tool only once it finishes', () => {
    it('renders the result as the tool line', () => {
      expect(render('codex', 'codex.synthetic')[0]).toBe(
        `→ command_execution bash -lc 'echo hi > hello.txt'`,
      );
    });
  });

  describe('a line that is not JSON', () => {
    it('passes through unchanged', () => {
      expect(createStructuredLineRenderer('codex')('hook: ok')).toBe(
        'hook: ok',
      );
    });
  });

  describe('a blank line', () => {
    it('renders nothing', () => {
      expect(createStructuredLineRenderer('codex')('   ')).toBeNull();
    });
  });
});

describe('withStructuredOutput', () => {
  const config = { iteration: 1, prompt: 'go' };

  describe('a text-mode driver', () => {
    it('switches the command to structured output', () => {
      const wrapped = withStructuredOutput(codexDriver);

      expect(wrapped.buildShellCommand(config)).toBe(
        codexDriver.buildShellCommand({
          ...config,
          outputFormat: DRIVER_OUTPUT_FORMATS.structured,
        }),
      );
    });

    it('installs a parser that recovers the text', () => {
      const wrapped = withStructuredOutput(antigravityDriver);

      expect(wrapped.parseOutput?.(fixture('antigravity')).text).toBe('DONE');
    });

    it('installs a line renderer', () => {
      expect(withStructuredOutput(cursorDriver).renderOutputLine).toBeTypeOf(
        'function',
      );
    });

    it('leaves the original driver untouched', () => {
      withStructuredOutput(codexDriver);

      expect(codexDriver.parseOutput).toBeUndefined();
    });
  });

  describe('claude', () => {
    it('is returned as is, since it is always structured', () => {
      expect(withStructuredOutput(claudeDriver)).toBe(claudeDriver);
    });
  });
});
