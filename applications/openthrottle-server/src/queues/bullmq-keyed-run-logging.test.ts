import type { KeyedJsonlWriter } from '@openthrottle/nestjs-logging';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import { createMock } from '@golevelup/ts-vitest';
import type { ChildJobStreamChunk } from '@tools/workflows';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  appendChildJobChunkToRunOutput,
  classifyRunOutputSource,
  createSpawnRunOutputHandlers,
  RUN_OUTPUT_SOURCE,
  runOutputLogContext,
} from './bullmq-keyed-run-logging';

const QUEUE = 'plans';
const JOB_ID = '42';
const CONTEXT = 'PlansProcessor';

describe('classifyRunOutputSource', () => {
  describe('when the chunk is a process/package-manager failure', () => {
    it('tags pnpm recursive exec failures as spawn', () => {
      expect(
        classifyRunOutputSource({
          data: 'ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL Command "workflow-ralph" not found',
          stream: 'stderr',
        }),
      ).toBe(RUN_OUTPUT_SOURCE.spawn);
    });

    it('tags /bin/sh token errors as spawn', () => {
      expect(
        classifyRunOutputSource({
          data: '/bin/sh: 1: some-token: not found',
          stream: 'stderr',
        }),
      ).toBe(RUN_OUTPUT_SOURCE.spawn);
    });
  });

  describe('when the chunk is a workflow-ralph CLI/debug line', () => {
    it('tags the debug logger prefix as workflow-ralph', () => {
      expect(
        classifyRunOutputSource({
          data: '[workflow-ralph:debug] main: iteration start',
          stream: 'stderr',
        }),
      ).toBe(RUN_OUTPUT_SOURCE.workflowRalph);
    });

    it('tags emoji-bulleted orchestration lines as workflow-ralph', () => {
      expect(
        classifyRunOutputSource({
          data: ' - 📌 Set task abc to IN_PROGRESS for this iteration.',
          stream: 'stdout',
        }),
      ).toBe(RUN_OUTPUT_SOURCE.workflowRalph);
    });
  });

  describe('when the chunk is anything else', () => {
    it('defaults to cursor-agent for the echoed agent dump', () => {
      expect(
        classifyRunOutputSource({
          data: 'I have completed the task and updated the files.',
          stream: 'stdout',
        }),
      ).toBe(RUN_OUTPUT_SOURCE.cursorAgent);
    });
  });
});

describe('runOutputLogContext', () => {
  it('appends the source layer to the log context', () => {
    expect(runOutputLogContext(CONTEXT, RUN_OUTPUT_SOURCE.cursorAgent)).toBe(
      'PlansProcessor [cursor-agent]',
    );
  });
});

describe('appendChildJobChunkToRunOutput', () => {
  let writer: KeyedJsonlWriter;

  beforeEach(() => {
    writer = createMock<KeyedJsonlWriter>();
  });

  it('writes a JSONL chunk tagged with the classified source', () => {
    const chunk: ChildJobStreamChunk = {
      data: '[workflow-ralph:debug] hello',
      stream: 'stderr',
    };

    appendChildJobChunkToRunOutput(writer, QUEUE, JOB_ID, chunk);

    expect(writer.appendRunChunk).toHaveBeenCalledWith(QUEUE, JOB_ID, {
      data: '[workflow-ralph:debug] hello',
      source: RUN_OUTPUT_SOURCE.workflowRalph,
      type: 'stderr',
    });
  });

  it('does not log when observability is omitted (current worktree default)', () => {
    const logger = createMock<LoggerService>();

    appendChildJobChunkToRunOutput(writer, QUEUE, JOB_ID, {
      data: 'agent output',
      stream: 'stdout',
    });

    expect(logger.info).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('mirrors stdout chunks to LoggerService.info tagged by source when observability is provided', () => {
    const logger = createMock<LoggerService>();

    appendChildJobChunkToRunOutput(
      writer,
      QUEUE,
      JOB_ID,
      { data: 'agent output\n', stream: 'stdout' },
      { logContext: CONTEXT, logger },
    );

    expect(logger.info).toHaveBeenCalledWith(
      'agent output',
      'PlansProcessor [cursor-agent]',
    );
  });

  it('mirrors stderr chunks to LoggerService.warn tagged by source when observability is provided', () => {
    const logger = createMock<LoggerService>();

    appendChildJobChunkToRunOutput(
      writer,
      QUEUE,
      JOB_ID,
      { data: 'ERR_PNPM boom\n', stream: 'stderr' },
      { logContext: CONTEXT, logger },
    );

    expect(logger.warn).toHaveBeenCalledWith(
      'ERR_PNPM boom',
      'PlansProcessor [spawn]',
    );
  });

  it('tolerates an undefined writer', () => {
    const logger = createMock<LoggerService>();

    expect(() =>
      appendChildJobChunkToRunOutput(
        undefined,
        QUEUE,
        JOB_ID,
        { data: 'x', stream: 'stdout' },
        { logContext: CONTEXT, logger },
      ),
    ).not.toThrow();
    expect(logger.info).toHaveBeenCalledWith(
      'x',
      'PlansProcessor [cursor-agent]',
    );
  });
});

describe('createSpawnRunOutputHandlers', () => {
  it('tags stdout JSONL + LoggerService lines by classified source', () => {
    const writer = createMock<KeyedJsonlWriter>();
    const logger = createMock<LoggerService>();

    const { onStdout } = createSpawnRunOutputHandlers({
      jobId: JOB_ID,
      logContext: CONTEXT,
      logger,
      queueName: QUEUE,
      writer,
    });

    onStdout(' - ✅ Marked task abc completed.\n');

    expect(writer.appendRunChunk).toHaveBeenCalledWith(QUEUE, JOB_ID, {
      data: ' - ✅ Marked task abc completed.\n',
      source: RUN_OUTPUT_SOURCE.workflowRalph,
      type: 'stdout',
    });
    expect(logger.info).toHaveBeenCalledWith(
      ' - ✅ Marked task abc completed.',
      'PlansProcessor [workflow-ralph]',
    );
  });

  it('tags stderr JSONL + LoggerService lines by classified source', () => {
    const writer = createMock<KeyedJsonlWriter>();
    const logger = createMock<LoggerService>();

    const { onStderr } = createSpawnRunOutputHandlers({
      jobId: JOB_ID,
      logContext: CONTEXT,
      logger,
      queueName: QUEUE,
      writer,
    });

    onStderr('plain agent stderr line\n');

    expect(writer.appendRunChunk).toHaveBeenCalledWith(QUEUE, JOB_ID, {
      data: 'plain agent stderr line\n',
      source: RUN_OUTPUT_SOURCE.cursorAgent,
      type: 'stderr',
    });
    expect(logger.warn).toHaveBeenCalledWith(
      'plain agent stderr line',
      'PlansProcessor [cursor-agent]',
    );
  });
});
