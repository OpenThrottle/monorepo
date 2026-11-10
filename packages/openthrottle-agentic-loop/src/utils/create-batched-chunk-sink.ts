import type {
  BatchedChunkSink,
  BatchedChunkSinkOptions,
  ScheduleClock,
} from '../contract/index.ts';

/**
 * @description Batches output text: flushes when the buffer reaches `maxBytes`, or `maxMs` after
 * the first buffered text, whichever comes first (§ 10). Call `flush()` at the end of the stream.
 * @public
 */
export const createBatchedChunkSink = (
  onChunk: (text: string) => void,
  options: BatchedChunkSinkOptions,
  clock: ScheduleClock,
): BatchedChunkSink => {
  let buffer = '';
  let bufferedBytes = 0;
  let cancelTimer: (() => void) | undefined;

  const flush = (): void => {
    cancelTimer?.();
    cancelTimer = undefined;

    if (buffer === '') {
      return;
    }

    const text = buffer;

    buffer = '';
    bufferedBytes = 0;
    onChunk(text);
  };

  const push = (text: string): void => {
    if (text === '') {
      return;
    }

    buffer += text;
    bufferedBytes += Buffer.byteLength(text, 'utf8');

    if (bufferedBytes >= options.maxBytes) {
      flush();

      return;
    }

    if (cancelTimer === undefined) {
      cancelTimer = clock.schedule(flush, options.maxMs);
    }
  };

  return { flush, push };
};
