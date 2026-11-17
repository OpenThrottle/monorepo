/**
 * @description Test-only entry point (`@openthrottle/nestjs-repositories-server/testing`): the
 * fishery factories and one repository mock per table. Kept out of the main barrel because
 * they import `@faker-js/faker` and `vitest`, devDependencies the production server image
 * does not install.
 */
export * from '../modules/notes/notes.factory.ts';
export type * from '../modules/notes/notes.types.ts';
export * from '../modules/notes/notes.utils.ts';
