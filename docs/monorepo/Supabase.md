# 🦸‍♂️ Supabase

> [!IMPORTANT]
> This doc is more or less a scratch pad used in setting up the scripts to automate things. We **should not** have to use anything in here, rather the setup script reference in the root level [README](../README.md).

---

## See also

- [Redirecting the user to a server-side endpoint](https://supabase.com/docs/guides/auth/auth-email-templates#redirecting-the-user-to-a-server-side-endpoint)

---

**Resources:**

- [Supabase CLI (v1)](https://github.com/supabase/cli)
- [Supabase CLI Action - Github](https://github.com/marketplace/actions/supabase-cli-action)
- [Supabase DB](https://supabase.com/dashboard/project/srzgpgqnwmnnragylrys/database/tables)
  - [Supabase GraphQL](https://supabase.com/dashboard/project/srzgpgqnwmnnragylrys/api/graphiql)
  - [Monitoring your DB](https://supabase.com/dashboard/project/srzgpgqnwmnnragylrys/database/query-performance?preset=slowest_execution&order=asc)
  - [Seeding your DB](https://supabase.com/docs/guides/cli/seeding-your-database)
  - [Testing your DB](https://supabase.com/docs/guides/cli/testing-and-linting)
  - [Linting your DB](https://supabase.com/docs/guides/cli/testing-and-linting#linting-your-database)
  - [Full Text Search](https://supabase.com/docs/guides/database/joins-and-nesting)
- 🌟 [Postgres Junction Tables](https://bipinparajuli.com.np/blog/many-to-many-relationship-in-postgresql)
- [Supabase Emails w/ Resend](https://supabase.com/docs/guides/functions/examples/send-emails)
- [Connecting with pgAdmin](https://supabase.com/docs/guides/database/pgadmin)
- Emails
  - [Customizing email templates](https://supabase.com/docs/guides/local-development/customizing-email-templates)
  - [Development Inbox](http://localhost:55324/)
  - [Supabase SSR Auth flow](https://github.com/supabase/auth-js/issues/221)

## ⚙️ Installation

```bash
brew install supabase/tap/supabase
brew upgrade supabase
```

If you have any Supabase containers running locally, stop them and delete their data volumes before proceeding with the upgrade. This ensures that Supabase managed services can apply new migrations on a clean state of the local database.

> [!NOTE]
> Remember to save any local schema and data changes before stopping because the `--no-backup` flag will delete them.

```bash

supabase db diff my_schema --workdir ./databases/barguide
supabase db dump --local --data-only > supabase/seed.sql --workdir ./databases/barguide

# Stop and remove local data (see note above about --no-backup)
supabase stop --no-backup --workdir ./databases/barguide
supabase start --workdir ./databases/barguide
```

## 🧑‍💻 Development

```bash
supabase init --workdir ./databases/barguide
supabase start --workdir ./databases/barguide

# Create a migration
supabase migration list --workdir ./databases/barguide
supabase migration new add_action_logs --workdir ./databases/barguide

# Run the migration
supabase db reset --workdir ./databases/barguide
```

### GraphQL

- https://supabase.com/docs/guides/graphql
- http://127.0.0.1:55323/project/default/integrations/graphiql/graphiql

### BarGuide -- WIP

```bash
# Had to use this beta, there is a bug in the CLI
SUPABASE_DB_PASSWORD="xxxxxxxxxx" npx supabase@beta link --workdir ./databases/barguide
# supabase link --project-ref rjqioqfeqrkmvazrdtuk --workdir ./databases/barguide

# Dump the local DB to something we can seed with in prod
pnpm database:barguide:dump

# Reset Production with the data
SUPABASE_DB_PASSWORD="xxxxxxxxxx" pnpm database:barguide:reset:prod
```

## AWS - Amazon Web Services

- https://us-west-1.console.aws.amazon.com/s3/buckets/barguide.io?region=us-west-1&bucketType=general&tab=permissions
- https://docs.aws.amazon.com/AmazonS3/latest/userguide/HostingWebsiteOnS3Setup.html#step4-add-bucket-policy-make-content-public
- https://medium.com/@shresthshruti09/uploading-files-in-aws-s3-bucket-through-javascript-sdk-with-progress-bar-d2a4b3ee77b5
- https://www.freecodecamp.org/news/how-to-upload-files-to-aws-s3-with-node/

### Diffing changes

This workflow is great if you know SQL and are comfortable creating tables and columns. If not, you can still use the Dashboard to create tables and columns, and then use the CLI to diff your changes and create migrations.

#### SO MUCH TO LOOK AT

- https://supabase.com/docs/guides/database/webhooks
- https://supabase.com/docs/guides/auth/redirect-urls
- https://supabase.com/docs/guides/local-development/customizing-email-templates#deploying-email-templates
