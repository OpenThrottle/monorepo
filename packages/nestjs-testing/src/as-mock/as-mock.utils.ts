/**
 * @description Retype a loosely-constructed test value — a partial object, a
 * test-data factory result, or a `vi.fn()` implementation — as `T` at a mock
 * boundary, without a type assertion.
 *
 * The public generic overload advertises `T`; the implementation signature takes
 * and returns `unknown` and hands the value back untouched. Because the overload
 * return (`T`) is assignable to the implementation return (`unknown`), this is
 * legal with no `as`, and it is the sanctioned replacement for the
 * `x as unknown as T` pattern in tests where constructing a full `T` is
 * impractical and the code under test only reads a subset.
 *
 * Prefer a properly-typed value (or a real factory such as
 * `@golevelup/ts-vitest`'s `createMock` for interface/class mocks) when
 * feasible; reach for `asMock` only at genuine partial-mock boundaries.
 *
 * @example
 * const repo = createMock<Repository<User>>();
 * const row = asMock<User>(userFactory.build()); // factory returns DeepPartial
 *
 * @public
 */
export function asMock<T>(value: unknown): T;
export function asMock(value: unknown): unknown {
  return value;
}
