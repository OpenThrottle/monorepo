/**
 * @description Test-only entry point (`@openthrottle/nestjs-repositories-server/testing`): the
 * fishery factories. Kept out of the main barrel because they import `@faker-js/faker`, a
 * devDependency the production server image does not install.
 */
export * from '../modules/notes/notes.factory.ts';
