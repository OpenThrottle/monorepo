import { QueryFailedError } from 'typeorm';

/**
 * @description True when a TypeORM error wraps a Postgres unique-constraint
 * violation (SQLSTATE 23505), so services can surface a ConflictException.
 *
 * @public
 */
export const isUniqueViolation = (error: unknown): boolean => {
  if (!(error instanceof QueryFailedError)) return false;
  const driverError: unknown = error.driverError;
  return (
    typeof driverError === 'object' &&
    driverError !== null &&
    'code' in driverError &&
    driverError.code === '23505'
  );
};
