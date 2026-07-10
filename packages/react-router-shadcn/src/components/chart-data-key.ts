import type { DataKey } from 'recharts';

/**
 * @description Bridge a statically-known string key (`keyof T & string`) to
 * recharts' `DataKey<T>` inside a generic chart component. `DataKey<T>` is a
 * conditional (`TypedDataKey`) that does not reduce while `T` is an unresolved
 * type parameter, so a direct assignment fails even though it is sound for every
 * concrete `T`. The generic overload carries `DataKey<T>` while the
 * implementation returns the key unchanged — no type assertion, no behavior
 * change (recharts receives the same string key).
 */
export function toDataKey<T>(key: keyof T & string): DataKey<T>;
export function toDataKey(key: string): unknown {
  return key;
}
