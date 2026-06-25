# @openthrottle/nestjs-typeorm

TypeORM integration module for NestJS applications with database providers. This package provides TypeORM database connectivity and repository patterns for NestJS applications. Migrations are owned by the consuming application (the DataSource reads `POSTGRES_PATH_MIGRATIONS` at runtime); this package does not ship a migration CLI.

**Resources:**

- https://docs.nestjs.com/recipes/sql-typeorm

## Installation

Install with your preferred package manager:

**pnpm:**

```bash
pnpm add @openthrottle/nestjs-typeorm
```

**npm:**

```bash
npm install @openthrottle/nestjs-typeorm
```

## Provider

The first step we need to do is to establish the connection with our database using new `DataSource().initialize()` class imported from the typeorm package. The `initialize()` function returns a **Promise**, and therefore we have to create an async provider.

Then, we need to export these providers to make them accessible for the rest of the application using the module `providers` and `exports` fields.

## Repository pattern

The TypeORM supports the repository design pattern, thus each entity has its own Repository. These repositories can be obtained from the database connection.
