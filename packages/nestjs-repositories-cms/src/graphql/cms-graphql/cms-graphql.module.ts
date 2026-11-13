import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CMS_CONNECTION } from '../../config/config.constants.ts';
import { FragmentsModule } from '../../modules/fragments/fragments.module.ts';
import { LayoutsModule } from '../../modules/layouts/layouts.module.ts';
import { LibrariesModule } from '../../modules/libraries/libraries.module.ts';
import { LibraryComponentsModule } from '../../modules/library-components/library-components.module.ts';
import { Profile } from '../../modules/profiles/profile.entity.ts';
import { SchemasModule } from '../../modules/schemas/schemas.module.ts';
import { CmsFragmentChildrenResolver } from '../cms-fragment-children/cms-fragment-children.resolver.ts';
import { CmsFragmentChildrenService } from '../cms-fragment-children/cms-fragment-children.service.ts';
import { CmsFragmentsResolver } from '../cms-fragments/cms-fragments.resolver.ts';
import { CmsFragmentsService } from '../cms-fragments/cms-fragments.service.ts';
import { CmsLayoutsResolver } from '../cms-layouts/cms-layouts.resolver.ts';
import { CmsLayoutsService } from '../cms-layouts/cms-layouts.service.ts';
import { CmsLibrariesResolver } from '../cms-libraries/cms-libraries.resolver.ts';
import { CmsLibrariesService } from '../cms-libraries/cms-libraries.service.ts';
import { CmsLibraryComponentsResolver } from '../cms-library-components/cms-library-components.resolver.ts';
import { CmsLibraryComponentsService } from '../cms-library-components/cms-library-components.service.ts';
import { CmsProfilesService } from '../cms-profiles/cms-profiles.service.ts';
import { CmsSchemaValidationService } from '../cms-schema-validation/cms-schema-validation.service.ts';
import { CmsSchemasResolver } from '../cms-schemas/cms-schemas.resolver.ts';
import { CmsSchemasService } from '../cms-schemas/cms-schemas.service.ts';
import { CmsWriteGuard } from '../cms-write-access/cms-write-access.guard.ts';

/**
 * @description The cms GraphQL API: code-first resolvers over the cms repositories. Reads are
 * `@Public()`; every mutation runs `CmsWriteGuard`, which needs the host to provide
 * `CMS_WRITE_AUTHORIZER` (without it, writes are refused). Lives here,
 * next to the data layer, by owner decision; imported by `NestjsRepositoriesCmsModule`, so an
 * app that imports that module and runs `GraphQLModule` serves it. Without `GraphQLModule` the
 * resolvers are inert.
 * @public
 */
@Module({
  exports: [
    CmsFragmentChildrenService,
    CmsFragmentsService,
    CmsLayoutsService,
    CmsLibrariesService,
    CmsLibraryComponentsService,
    CmsProfilesService,
    CmsSchemaValidationService,
    CmsSchemasService,
  ],
  imports: [
    FragmentsModule,
    LayoutsModule,
    LibrariesModule,
    LibraryComponentsModule,
    SchemasModule,
    TypeOrmModule.forFeature([Profile], CMS_CONNECTION),
  ],
  providers: [
    CmsFragmentChildrenResolver,
    CmsFragmentChildrenService,
    CmsFragmentsResolver,
    CmsFragmentsService,
    CmsLayoutsResolver,
    CmsLayoutsService,
    CmsLibrariesResolver,
    CmsLibrariesService,
    CmsLibraryComponentsResolver,
    CmsLibraryComponentsService,
    CmsProfilesService,
    CmsSchemaValidationService,
    CmsSchemasResolver,
    CmsSchemasService,
    CmsWriteGuard,
  ],
})
export class CmsGraphqlModule {}
