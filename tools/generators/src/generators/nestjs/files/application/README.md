# <%= name %>

Describe this NestJS application (what it exposes, how it is run, and key dependencies).

## GraphQL schema (opt-in)

When you enable `NestjsGraphqlModule` in `src/app.module.ts`, add `"graphql-schema": {}` to `nx.targets` in `package.json`. That opts this app into the shared `graphql-schema` target in `nx.json`, which needs no script here:

```bash
pnpm nx run <%= name %>:graphql-schema:write   # regenerate schema.gql without booting
pnpm nx run <%= name %>:graphql-schema:check   # fail when schema.gql has drifted (runs in check:local)
```

Commit `schema.gql`. Keep `autoSchemaFile` at its default relative `schema.gql`.

## LangGraph Studio

```bash
# CD into the application

# Setup: Create a virtual environment
python3 -m venv .venv

# Activate the python env
source .venv/bin/activate

langgraph dev

# Turn it off
deactivate
```
