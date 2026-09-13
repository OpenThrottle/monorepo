import { describe, expect, it } from 'vitest';

import {
  findStripOnlyConstructs,
  STRIP_ONLY_CONSTRUCT,
} from '../lib/strip-only-constructs.ts';

/**
 * The hazardous snippets live here as source strings rather than as a fixture
 * module in a package. A source-first package's `src/` is exactly the surface
 * the gate must keep clean, so committing a real file containing these
 * constructs would mean gating against a file the repo itself ships.
 */
const constructsIn = (source: string): readonly string[] =>
  findStripOnlyConstructs(source, 'fixture.ts').map(
    (finding) => finding.construct,
  );

describe('findStripOnlyConstructs — constructs Node cannot strip', () => {
  it('flags a constructor parameter property', () => {
    expect(
      constructsIn(`
        export class Cache {
          constructor(private readonly now: () => number) {}
        }
      `),
    ).toEqual([STRIP_ONLY_CONSTRUCT.PARAMETER_PROPERTY]);
  });

  it('flags a public parameter property without readonly', () => {
    expect(
      constructsIn(`
        export class Client {
          constructor(public url: string) {}
        }
      `),
    ).toEqual([STRIP_ONLY_CONSTRUCT.PARAMETER_PROPERTY]);
  });

  it('flags an enum and a const enum', () => {
    expect(
      constructsIn(`
        export enum Status { ACTIVE = 'ACTIVE' }
        const enum Level { LOW = 1 }
      `),
    ).toEqual([STRIP_ONLY_CONSTRUCT.ENUM, STRIP_ONLY_CONSTRUCT.ENUM]);
  });

  it('flags a namespace block', () => {
    expect(
      constructsIn(`
        export namespace Paths {
          export const root = '/';
        }
      `),
    ).toEqual([STRIP_ONLY_CONSTRUCT.NAMESPACE]);
  });

  it('flags a class decorator and a property decorator', () => {
    expect(
      constructsIn(`
        @Injectable()
        export class Service {
          @Column()
          name: string = '';
        }
      `),
    ).toEqual([STRIP_ONLY_CONSTRUCT.DECORATOR, STRIP_ONLY_CONSTRUCT.DECORATOR]);
  });

  it('reports the line of each finding', () => {
    const findings = findStripOnlyConstructs(
      ['const a = 1;', 'enum Status { A }', ''].join('\n'),
      'fixture.ts',
    );

    expect(findings).toEqual([
      { construct: STRIP_ONLY_CONSTRUCT.ENUM, line: 2 },
    ]);
  });
});

describe('findStripOnlyConstructs — what must not fire', () => {
  it('ignores the word enum in comments, strings and identifiers', () => {
    expect(
      constructsIn(`
        // An enum would break here; use an as const object instead.
        const enumLike = { label: 'enum' };
        export type EnumName = keyof typeof enumLike;
      `),
    ).toEqual([]);
  });

  it('ignores an as const object — the sanctioned enum replacement', () => {
    expect(
      constructsIn(`
        export const STATUS = { ACTIVE: 'ACTIVE', DONE: 'DONE' } as const;
        export type Status = (typeof STATUS)[keyof typeof STATUS];
      `),
    ).toEqual([]);
  });

  it('ignores a constructor that assigns in the body', () => {
    expect(
      constructsIn(`
        export class Cache {
          private readonly now: () => number;
          constructor(now: () => number) {
            this.now = now;
          }
        }
      `),
    ).toEqual([]);
  });

  it('ignores an ambient declare namespace — types only, fully erasable', () => {
    expect(
      constructsIn(`
        declare namespace Ambient {
          interface Shape { readonly id: string }
        }
      `),
    ).toEqual([]);
  });

  it('ignores a declaration file entirely', () => {
    expect(
      findStripOnlyConstructs('export enum Status { A }', 'types.d.ts'),
    ).toEqual([]);
  });

  it('ignores type-only constructs that erase cleanly', () => {
    expect(
      constructsIn(`
        export interface Options { readonly retries: number }
        export type Maybe<TValue> = TValue | undefined;
        export abstract class Base { abstract run(): void }
      `),
    ).toEqual([]);
  });
});
