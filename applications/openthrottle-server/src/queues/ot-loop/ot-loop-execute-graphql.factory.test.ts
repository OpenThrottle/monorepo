import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { Kind } from 'graphql';
import { describe, expect, it, vi } from 'vitest';

import { createOtLoopExecuteGraphql } from './ot-loop-execute-graphql.factory.ts';

const document: TypedDocumentNode<{ readonly ok: boolean }, never> = {
  definitions: [],
  kind: Kind.DOCUMENT,
};

describe('createOtLoopExecuteGraphql', () => {
  it('passes the worker credentials as the defaults under each call', async () => {
    const execute = vi.fn().mockResolvedValue({ ok: true });
    const run = createOtLoopExecuteGraphql(execute, {
      token: 'worker-token',
      url: 'http://worker/graphql',
    });

    await run(document, undefined, { url: 'http://override/graphql' });

    expect(execute).toHaveBeenCalledWith(document, undefined, {
      token: 'worker-token',
      url: 'http://override/graphql',
    });
  });

  it('deep-merges per-call headers over the baked worker headers', async () => {
    const execute = vi.fn().mockResolvedValue({ ok: true });
    const run = createOtLoopExecuteGraphql(execute, {
      headers: { 'X-Baked': 'baked' },
      url: 'http://worker/graphql',
    });

    await run(document, undefined, { headers: { 'X-OT-Session-Id': 's-1' } });

    expect(execute.mock.calls[0]?.[2]).toMatchObject({
      headers: { 'X-Baked': 'baked', 'X-OT-Session-Id': 's-1' },
    });
  });

  it('adds no headers key when neither side has headers', async () => {
    const execute = vi.fn().mockResolvedValue({ ok: true });
    const run = createOtLoopExecuteGraphql(execute, {
      url: 'http://w/graphql',
    });

    await run(document);

    expect(execute.mock.calls[0]?.[2]).not.toHaveProperty('headers');
  });
});
