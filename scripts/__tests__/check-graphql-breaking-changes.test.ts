import { describe, expect, it } from 'vitest';

import {
  checkSchemaBreakingChanges,
  hasBreakingMarker,
} from '../check-graphql-breaking-changes.ts';

const BASE = `
type Query {
  name: String
  title: String
}
`;

describe('hasBreakingMarker', () => {
  it.each([
    'feat!: drop a field',
    'feat(openthrottle-server)!: drop a field',
    'fix(a,b)!: x',
    '  refactor!: x',
  ])('accepts %s', (title) => {
    expect(hasBreakingMarker(title)).toBe(true);
  });

  it.each([
    'feat: add a field',
    'feat(server): wow! great',
    'feat: drop!',
    'not conventional!',
    '',
  ])('rejects %j', (title) => {
    expect(hasBreakingMarker(title)).toBe(false);
  });
});

describe('checkSchemaBreakingChanges', () => {
  const REMOVED = `
type Query {
  name: String
}
`;

  it('blocks a removed field without `!`', async () => {
    const result = await checkSchemaBreakingChanges(BASE, REMOVED, 'feat: x');

    expect(result.kind).toBe('breaking-blocked');
  });

  it('allows a removed field when the title carries `!`', async () => {
    const result = await checkSchemaBreakingChanges(BASE, REMOVED, 'feat(server)!: x'); // prettier-ignore

    expect(result.kind).toBe('breaking-allowed');
  });

  it('passes a deprecation', async () => {
    const deprecated = `
type Query {
  name: String
  title: String @deprecated(reason: "use name")
}
`;

    const result = await checkSchemaBreakingChanges(
      BASE,
      deprecated,
      'feat: x',
    );

    expect(result).toEqual({ kind: 'ok' });
  });

  it('passes a non-breaking addition', async () => {
    const added = `
type Query {
  name: String
  title: String
  extra: Int
}
`;

    const result = await checkSchemaBreakingChanges(BASE, added, 'feat: x');

    expect(result).toEqual({ kind: 'ok' });
  });

  it('reports an unparseable schema instead of throwing', async () => {
    const result = await checkSchemaBreakingChanges(BASE, 'type {', 'feat: x');

    expect(result.kind).toBe('invalid-schema');
  });
});
