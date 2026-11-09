/**
 * @description Helpers shared by the eval GraphQL resolvers: foreign-key violation detection,
 * JSON-argument parsing and the acting identity for `created_by`.
 */

import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import type { AuthPrincipal } from '@openthrottle/nestjs-auth';
import type { GlobalClsUser } from '@openthrottle/nestjs-modules';
import type { EvalJsonValue } from '@openthrottle/nestjs-repositories';
import { QueryFailedError } from 'typeorm';

import { resolveNoteAuthor } from '../notes/notes.utils.ts';

const FOREIGN_KEY_VIOLATION = '23503';

/**
 * @description Detects a Postgres foreign-key violation (23503) behind a TypeORM QueryFailedError,
 * so a resolver can map a missing parent row to NotFound.
 */
export const isForeignKeyViolation = (error: unknown): boolean => {
  if (!(error instanceof QueryFailedError)) return false;

  const driverError: unknown = error.driverError;

  return (
    typeof driverError === 'object' &&
    driverError !== null &&
    'code' in driverError &&
    driverError.code === FOREIGN_KEY_VIOLATION
  );
};

const isEvalJsonValue = (value: unknown): value is EvalJsonValue => {
  return (
    value === null ||
    typeof value === 'object' ||
    typeof value === 'boolean' ||
    typeof value === 'number' ||
    typeof value === 'string'
  );
};

export const parseEvalJson = (name: string, text: string): EvalJsonValue => {
  let value: unknown;

  try {
    value = JSON.parse(text);
  } catch {
    throw new BadRequestException(`${name} is not valid JSON`);
  }

  if (!isEvalJsonValue(value)) {
    throw new BadRequestException(`${name} is not valid JSON`);
  }

  return value;
};

export const resolveEvalActor = (
  clsUser: GlobalClsUser | undefined,
  principal: AuthPrincipal | undefined,
): string => {
  const actor = resolveNoteAuthor(null, clsUser, principal);

  if (actor == null) {
    throw new UnauthorizedException(
      'Recording eval data needs an authenticated identity',
    );
  }

  return actor;
};
