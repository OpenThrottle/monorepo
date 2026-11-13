import { POSTGRES_DEFAULT_PAGE_SIZE } from '@openthrottle/nestjs-postgres';
import { GraphQLError } from 'graphql';

import { CMS_STATUS_VALUES } from '../../config/config.constants.ts';
import type { CmsStatus } from '../../config/config.types.ts';
import type { CmsGraphqlErrorCode } from './cms-graphql.types.ts';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * @description Whether `value` is shaped like a uuid. A lookup by a non-uuid string would make
 * Postgres reject the cast with a 500; callers read it as "not found" instead.
 */
export function isCmsUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

/**
 * @description `skip` / `take` GraphQL arguments as BaseRepository paging options; the repository
 * clamps them.
 */
export function toCmsPageOptions(
  skip: number | null | undefined,
  take: number | null | undefined,
): { readonly skip: number; readonly take: number } {
  return { skip: skip ?? 0, take: take ?? POSTGRES_DEFAULT_PAGE_SIZE };
}

/**
 * @description A GraphQLError carrying `extensions.code` (and any extra extensions). Nest
 * HttpExceptions are masked by the server's GraphQL error formatting, so expected failures use
 * this instead.
 */
export function createCmsGraphqlError(
  code: CmsGraphqlErrorCode,
  message: string,
  extensions: Readonly<Record<string, unknown>> = {},
): GraphQLError {
  return new GraphQLError(message, { extensions: { ...extensions, code } });
}

/**
 * @description Parses a `…Json` argument that must hold a JSON object.
 * @throws GraphQLError BAD_USER_INPUT naming `field` when it is not valid JSON or not an object.
 */
export function parseCmsJsonObject(
  field: string,
  json: string,
): Record<string, unknown> {
  let value: unknown;

  try {
    value = JSON.parse(json);
  } catch {
    throw createCmsGraphqlError(
      'BAD_USER_INPUT',
      `${field} is not valid JSON`,
      {
        field,
      },
    );
  }

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw createCmsGraphqlError(
      'BAD_USER_INPUT',
      `${field} must be a JSON object`,
      { field },
    );
  }

  return Object.fromEntries(Object.entries(value));
}

/**
 * @description Throws NOT_FOUND unless `value` is shaped like a uuid, so a bad id fails as input
 * rather than as a Postgres cast error.
 */
export function assertCmsUuid(field: string, value: string): void {
  if (!isCmsUuid(value)) {
    throw createCmsGraphqlError('NOT_FOUND', `No ${field} "${value}"`, {
      field,
    });
  }
}

/**
 * @description An optional status argument as a {@link CmsStatus}; null when omitted.
 * @throws GraphQLError BAD_USER_INPUT for anything other than ACTIVE, DISABLED or DRAFT.
 */
export function parseCmsStatus(
  status: string | null | undefined,
): CmsStatus | null {
  if (status === null || status === undefined) {
    return null;
  }

  const match = CMS_STATUS_VALUES.find((value) => value === status);

  if (match === undefined) {
    throw createCmsGraphqlError(
      'BAD_USER_INPUT',
      `status must be one of ${CMS_STATUS_VALUES.join(', ')}`,
      { field: 'status' },
    );
  }

  return match;
}
