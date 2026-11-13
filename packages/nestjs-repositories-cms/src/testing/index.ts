/**
 * @description Test-only entry point (`@openthrottle/nestjs-repositories-cms/testing`): the
 * fishery factories. Kept out of the main barrel because they import `@faker-js/faker`, a
 * devDependency the production server image does not install.
 */
export * from '../modules/fragments/fragments.factory.ts';
export * from '../modules/fragments-children/fragments-children.factory.ts';
export * from '../modules/layouts/layouts.factory.ts';
export * from '../modules/layouts-libraries/layouts-libraries.factory.ts';
export * from '../modules/libraries/libraries.factory.ts';
export * from '../modules/library-components/library-components.factory.ts';
export * from '../modules/profiles/profiles.factory.ts';
export * from '../modules/schemas/schemas.factory.ts';
export * from '../modules/surveys/surveys.factory.ts';
export * from '../modules/tags/tags.factory.ts';
