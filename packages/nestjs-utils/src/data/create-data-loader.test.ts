import { describe, expect, it, vi } from 'vitest';

import {
  createDataLoader,
  createLoaderFromFindByIds,
} from './create-data-loader';

interface User {
  readonly id: string;
  readonly name: string;
}

describe('createDataLoader', () => {
  it('batches multiple loads in the same tick into one batch call', async () => {
    const batchLoadFn = vi.fn(async (keys: ReadonlyArray<string>) =>
      keys.map((key) => `value:${key}`),
    );
    const loader = createDataLoader<string, string>(batchLoadFn);

    const [a, b, c] = await Promise.all([
      loader.load('a'),
      loader.load('b'),
      loader.load('c'),
    ]);

    expect(a).toBe('value:a');
    expect(b).toBe('value:b');
    expect(c).toBe('value:c');
    expect(batchLoadFn).toHaveBeenCalledTimes(1);
    expect(batchLoadFn).toHaveBeenCalledWith(['a', 'b', 'c']);
  });

  it('caches per instance so a repeated key is not re-fetched', async () => {
    const batchLoadFn = vi.fn(async (keys: ReadonlyArray<string>) =>
      keys.map((key) => `value:${key}`),
    );
    const loader = createDataLoader<string, string>(batchLoadFn);

    const first = await loader.load('a');
    const second = await loader.load('a');

    expect(first).toBe('value:a');
    expect(second).toBe('value:a');
    expect(batchLoadFn).toHaveBeenCalledTimes(1);
  });

  it('maps missing keys to null', async () => {
    const loader = createDataLoader<string, string>(async (keys) =>
      keys.map((key) => (key === 'present' ? 'hit' : null)),
    );

    await expect(loader.load('present')).resolves.toBe('hit');
    await expect(loader.load('absent')).resolves.toBeNull();
  });

  it('respects DataLoader options such as maxBatchSize', async () => {
    const batchLoadFn = vi.fn(async (keys: ReadonlyArray<string>) =>
      keys.map((key) => key),
    );
    const loader = createDataLoader<string, string>(batchLoadFn, {
      maxBatchSize: 1,
    });

    await Promise.all([loader.load('a'), loader.load('b')]);

    expect(batchLoadFn).toHaveBeenCalledTimes(2);
  });
});

describe('createLoaderFromFindByIds', () => {
  it('batches load calls into one findByIds call and maps results to key order', async () => {
    const alice: User = { id: '1', name: 'Alice' };
    const bob: User = { id: '2', name: 'Bob' };
    const findByIds = vi.fn(async (ids: ReadonlyArray<string>) =>
      // Returned out of key order on purpose to exercise the re-mapping.
      [bob, alice].filter((user) => ids.includes(user.id)),
    );
    const loader = createLoaderFromFindByIds<string, User>(findByIds);

    const [first, second] = await Promise.all([
      loader.load('1'),
      loader.load('2'),
    ]);

    expect(first).toEqual(alice);
    expect(second).toEqual(bob);
    expect(findByIds).toHaveBeenCalledTimes(1);
    expect(findByIds).toHaveBeenCalledWith(['1', '2']);
  });

  it('maps ids with no matching entity to null', async () => {
    const alice: User = { id: '1', name: 'Alice' };
    const loader = createLoaderFromFindByIds<string, User>(async (ids) =>
      [alice].filter((user) => ids.includes(user.id)),
    );

    await expect(loader.load('1')).resolves.toEqual(alice);
    await expect(loader.load('missing')).resolves.toBeNull();
  });

  it('tolerates null entries in the findByIds result', async () => {
    const alice: User = { id: '1', name: 'Alice' };
    const loader = createLoaderFromFindByIds<string, User>(async (ids) =>
      ids.map((id) => (id === '1' ? alice : null)),
    );

    await expect(loader.load('1')).resolves.toEqual(alice);
    await expect(loader.load('2')).resolves.toBeNull();
  });

  it('uses a custom keyFn for entities not keyed by id', async () => {
    interface Account {
      readonly externalId: string;
      readonly label: string;
    }
    const account: Account = { externalId: 'ext-9', label: 'Ops' };
    const loader = createLoaderFromFindByIds<string, Account>(
      async (keys) => [account].filter((a) => keys.includes(a.externalId)),
      { keyFn: (a) => a.externalId },
    );

    await expect(loader.load('ext-9')).resolves.toEqual(account);
    await expect(loader.load('ext-0')).resolves.toBeNull();
  });

  it('serves duplicate keys in one batch from a single resolved entity', async () => {
    const alice: User = { id: '1', name: 'Alice' };
    const findByIds = vi.fn(async (ids: ReadonlyArray<string>) =>
      [alice].filter((user) => ids.includes(user.id)),
    );
    const loader = createLoaderFromFindByIds<string, User>(findByIds);

    const [first, second] = await Promise.all([
      loader.load('1'),
      loader.load('1'),
    ]);

    expect(first).toEqual(alice);
    expect(second).toEqual(alice);
    // DataLoader dedupes the duplicate key, so findByIds sees it once.
    expect(findByIds).toHaveBeenCalledTimes(1);
    expect(findByIds).toHaveBeenCalledWith(['1']);
  });

  it('rejects with a clear TypeError when the default keyFn hits an entity without an id', async () => {
    // Documents the silent-null footgun around the default key extractor: when
    // findByIds returns a row that lacks the `id` field, the default keyFn cannot
    // map it back to its key and throws a descriptive TypeError (rather than
    // silently dropping the row), which rejects the load.
    interface NoId {
      readonly id: string;
      readonly name: string;
    }
    // Build the malformed row without a type assertion: the helper is typed to
    // hand back a NoId, but the literal it returns omits `id`, mirroring a
    // repository row that is missing the keyed field at runtime.
    const makeOrphan = (): NoId => JSON.parse('{"name":"orphan"}');
    const loader = createLoaderFromFindByIds<string, NoId>(async () => [
      makeOrphan(),
    ]);

    await expect(loader.load('any')).rejects.toThrow(
      /entity has no "id" field/,
    );
  });
});
