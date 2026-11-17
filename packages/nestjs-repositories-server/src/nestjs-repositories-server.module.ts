import { Module } from '@nestjs/common';

import { NotesModule } from './modules/notes/notes.module.ts';

/**
 * @description The TypeORM data-access layer for the `openthrottle` database:
 * aggregates and re-exports one module per table. Each table module binds to
 * the app's **default** DataSource (no named connection), which
 * `NestjsRepositoriesModule` still registers until the last migration batch
 * moves the DataSource config here.
 * @public
 */
@Module({
  exports: [NotesModule],
  imports: [NotesModule],
})
export class NestjsRepositoriesServerModule {}
