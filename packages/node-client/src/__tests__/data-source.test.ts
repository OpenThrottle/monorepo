import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Tests for the per-connection-string DataSource cache. TypeORM's DataSource is replaced by a
 * stub whose `initialize()` resolves only when the test says so, so concurrent first calls can
 * be observed while initialization is still in flight.
 */

const { StubDataSource, instances } = vi.hoisted(() => {
  const created: StubDataSourceShape[] = [];

  interface StubDataSourceShape {
    readonly destroy: ReturnType<typeof vi.fn>;
    readonly initialize: ReturnType<typeof vi.fn>;
    readonly rejectInitialize: (error: Error) => void;
    readonly resolveInitialize: () => void;
  }

  class Stub implements StubDataSourceShape {
    readonly destroy = vi.fn(async () => {
      return undefined;
    });
    readonly initialize: ReturnType<typeof vi.fn>;
    resolveInitialize: () => void = () => {
      return undefined;
    };
    rejectInitialize: (error: Error) => void = () => {
      return undefined;
    };

    constructor() {
      this.initialize = vi.fn(() => {
        return new Promise<Stub>((resolve, reject) => {
          this.resolveInitialize = () => {
            resolve(this);
          };
          this.rejectInitialize = reject;
        });
      });
      created.push(this);
    }
  }

  return { StubDataSource: Stub, instances: created };
});

vi.mock('typeorm', () => {
  return { DataSource: StubDataSource };
});

vi.mock('@openthrottle/nestjs-repositories-server', () => {
  return {
    Plan: {},
    PlanEmbedding: {},
    PlanOutputStreamChunk: {},
    Project: {},
    Task: {},
    TaskEmbedding: {},
  };
});

vi.mock('@openthrottle/openthrottle-agentic-utils', () => {
  return {
    getPostgresUrl: () => {
      return 'postgresql://user:secret@localhost:5432/openthrottle';
    },
  };
});

const { destroyDataSources, getOrCreateDataSource } =
  await import('../data-source.ts');

afterEach(async () => {
  for (const instance of instances) instance.resolveInitialize();
  await destroyDataSources();
  instances.length = 0;
});

describe('getOrCreateDataSource', () => {
  describe('when two callers arrive before initialization finishes', () => {
    it('initializes one DataSource and hands both callers the same one', async () => {
      const first = getOrCreateDataSource();
      const second = getOrCreateDataSource();

      expect(instances).toHaveLength(1);
      instances[0]?.resolveInitialize();

      const [a, b] = await Promise.all([first, second]);
      expect(a).toBe(b);
      expect(instances[0]?.initialize).toHaveBeenCalledTimes(1);
    });
  });

  describe('when the DataSource is already initialized', () => {
    it('returns the cached one without initializing again', async () => {
      const first = getOrCreateDataSource();
      instances[0]?.resolveInitialize();
      const a = await first;

      await expect(getOrCreateDataSource()).resolves.toBe(a);
      expect(instances).toHaveLength(1);
    });
  });

  describe('when initialization fails', () => {
    it('rejects and lets the next call retry with a fresh DataSource', async () => {
      const failed = getOrCreateDataSource();
      instances[0]?.rejectInitialize(new Error('connection refused'));
      await expect(failed).rejects.toThrow('connection refused');

      const retry = getOrCreateDataSource();
      expect(instances).toHaveLength(2);
      instances[1]?.resolveInitialize();
      await expect(retry).resolves.toBe(instances[1]);
    });
  });
});

describe('destroyDataSources', () => {
  it('destroys every cached DataSource once it is initialized', async () => {
    const pending = getOrCreateDataSource();
    instances[0]?.resolveInitialize();
    await pending;

    await destroyDataSources();

    expect(instances[0]?.destroy).toHaveBeenCalledTimes(1);
  });
});
