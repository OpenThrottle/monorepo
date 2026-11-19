# @openthrottle/nestjs-repositories-server

NestJS + TypeORM data access for the OpenThrottle `openthrottle` database. Each table gets a
`BaseModel` entity, a `BaseRepository` subclass and a module; fishery factories ship separately
under `./testing`. GraphQL types and resolvers live in `openthrottle-server`, not here.

## Installation

Install with your preferred package manager (list pnpm first in this monorepo):

**pnpm:**

```bash
pnpm add @openthrottle/nestjs-repositories-server
```

**npm:**

```bash
npm install @openthrottle/nestjs-repositories-server
```

## Usage

Import a table module (or `NestjsRepositoriesServerModule` for all of them) and inject its
repository. The app registers the default TypeORM DataSource once, from this package's options:

```ts
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  getOpenThrottleTypeOrmOptions,
  NestjsRepositoriesServerModule,
} from '@openthrottle/nestjs-repositories-server';

TypeOrmModule.forRootAsync({
  useFactory: () => {
    return { ...getOpenThrottleTypeOrmOptions(), autoLoadEntities: true };
  },
});
```

A script outside Nest opens the same DataSource directly:
`new DataSource(getOpenThrottleTypeOrmOptions())`. Set `POSTGRES_SLOW_QUERY_MS` to a positive
integer to log a `query is slow` warning for queries over that many milliseconds.

Test factories come from `@openthrottle/nestjs-repositories-server/testing`, never the main
entry.

## Development

```bash
pnpm run database:test:openthrottle   # opt-in: entities vs the live, migrated tables
pnpm nx run @openthrottle/nestjs-repositories-server:lint
pnpm nx run @openthrottle/nestjs-repositories-server:typecheck
pnpm nx run @openthrottle/nestjs-repositories-server:test
pnpm nx run @openthrottle/nestjs-repositories-server:build
```
