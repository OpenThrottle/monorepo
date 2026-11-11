import type { PostgresExplainQueryManager } from '../postgres-profiling.types.ts';

const isQueryManager = (
  candidate: unknown,
): candidate is PostgresExplainQueryManager => {
  const isManager =
    typeof candidate === 'object' &&
    candidate !== null &&
    'query' in candidate &&
    typeof candidate.query === 'function';

  return isManager;
};

// `repository` is protected on the base repository, so it is read structurally at runtime.
export const resolveQueryManager = (
  instance: unknown,
): PostgresExplainQueryManager | undefined => {
  if (
    typeof instance !== 'object' ||
    instance === null ||
    !('repository' in instance)
  ) {
    return undefined;
  }

  const { repository } = instance;

  if (
    typeof repository !== 'object' ||
    repository === null ||
    !('manager' in repository)
  ) {
    return undefined;
  }

  return isQueryManager(repository.manager) ? repository.manager : undefined;
};

export const resolveClassName = (instance: unknown): string => {
  const hasConstructor =
    typeof instance === 'object' &&
    instance !== null &&
    typeof instance.constructor === 'function';

  return hasConstructor ? instance.constructor.name : 'UnknownClass';
};

export const copyMethodMetadata = (source: object, target: object): void => {
  if (typeof Reflect.getMetadataKeys !== 'function') {
    return;
  }

  for (const metadataKey of Reflect.getMetadataKeys(source)) {
    Reflect.defineMetadata(
      metadataKey,
      Reflect.getMetadata(metadataKey, source),
      target,
    );
  }
};
