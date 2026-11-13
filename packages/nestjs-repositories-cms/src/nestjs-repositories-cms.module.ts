import { Module } from '@nestjs/common';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CMS_CONNECTION } from './config/config.constants.ts';
import { CmsGraphqlModule } from './graphql/cms-graphql/cms-graphql.module.ts';
import { FragmentsModule } from './modules/fragments/fragments.module.ts';
import { FragmentsChildrenModule } from './modules/fragments-children/fragments-children.module.ts';
import { LayoutsModule } from './modules/layouts/layouts.module.ts';
import { LayoutsLibrariesModule } from './modules/layouts-libraries/layouts-libraries.module.ts';
import { LibrariesModule } from './modules/libraries/libraries.module.ts';
import { LibraryComponentsModule } from './modules/library-components/library-components.module.ts';
import { ProfilesModule } from './modules/profiles/profiles.module.ts';
import { SchemasModule } from './modules/schemas/schemas.module.ts';
import { SurveysModule } from './modules/surveys/surveys.module.ts';
import { TagsModule } from './modules/tags/tags.module.ts';
import { getCmsTypeOrmOptions } from './nestjs-repositories-cms.utils.ts';

/**
 * @description The TypeORM data-access layer for the `cms` database. Registers
 * the DataSource under {@link CMS_CONNECTION}, never the default, so it
 * coexists with `NestjsRepositoriesModule`'s openthrottle DataSource.
 * @public
 */
@Module({
  exports: [
    CmsGraphqlModule,
    FragmentsModule,
    FragmentsChildrenModule,
    LayoutsModule,
    LayoutsLibrariesModule,
    LibrariesModule,
    LibraryComponentsModule,
    ProfilesModule,
    SchemasModule,
    SurveysModule,
    TagsModule,
  ],
  imports: [
    TypeOrmModule.forRootAsync({
      name: CMS_CONNECTION,
      useFactory: (): TypeOrmModuleOptions => {
        const result = getCmsTypeOrmOptions();
        // Boot-time failure is the desired behaviour: the app cannot serve cms
        // data without a connection, and Nest surfaces the message.
        if (!result.ok) {
          throw new Error(result.error);
        }
        return result.options;
      },
    }),
    CmsGraphqlModule,
    FragmentsModule,
    FragmentsChildrenModule,
    LayoutsModule,
    LayoutsLibrariesModule,
    LibrariesModule,
    LibraryComponentsModule,
    ProfilesModule,
    SchemasModule,
    SurveysModule,
    TagsModule,
  ],
})
export class NestjsRepositoriesCmsModule {}
