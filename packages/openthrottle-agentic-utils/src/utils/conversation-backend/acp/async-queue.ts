/**
 * A minimal push-to-pull bridge: callbacks (`session/update` notifications, the
 * `session/prompt` settlement) push items, and the backend's async generator
 * pulls them with `for await`. Items pushed after {@link AsyncQueue.end} are
 * dropped, so a late notification can never resurrect a finished turn.
 */
export class AsyncQueue<T> implements AsyncIterable<T> {
  #ended = false;

  readonly #items: T[] = [];

  readonly #waiters: Array<(result: IteratorResult<T, undefined>) => void> = [];

  /** Stop the iteration once the buffered items drain. Idempotent. */
  end(): void {
    this.#ended = true;
    for (const waiter of this.#waiters.splice(0)) {
      waiter({ done: true, value: undefined });
    }
  }

  /** Deliver one item to a waiting reader, or buffer it. */
  push(item: T): void {
    if (this.#ended) {
      return;
    }

    const waiter = this.#waiters.shift();
    if (waiter === undefined) {
      this.#items.push(item);
      return;
    }

    waiter({ done: false, value: item });
  }

  [Symbol.asyncIterator](): AsyncIterator<T, undefined> {
    return {
      next: (): Promise<IteratorResult<T, undefined>> => {
        if (this.#items.length > 0) {
          const [item] = this.#items.splice(0, 1);
          if (item !== undefined) {
            return Promise.resolve({ done: false, value: item });
          }
        }

        if (this.#ended) {
          return Promise.resolve({ done: true, value: undefined });
        }

        return new Promise((resolve) => {
          this.#waiters.push(resolve);
        });
      },
    };
  }
}
