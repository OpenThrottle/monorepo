/**
 * @description Test-only entry point (`@openthrottle/nestjs-postgres/testing`): the
 * `BaseRepository` mock every repositories package builds its own mocks on. Kept out of
 * the main barrel because it imports `vitest`, a devDependency the production image does
 * not install.
 */
export type * from '../base-repository-mock/base-repository-mock.types.ts';
export * from '../base-repository-mock/base-repository-mock.utils.ts';
