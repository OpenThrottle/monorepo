import type { Type } from '@nestjs/common';

export interface Success<T> {
  readonly ok: true;
  readonly value: T;
}

export interface Failure {
  readonly error: string;
  readonly ok: false;
}

export type Result<T> = Failure | Success<T>;

/** Resolves the root module class named by `--module` / `--export`. */
export type RootModuleLoader = (
  modulePath: string,
  exportName: string,
) => Promise<Result<Type>>;
