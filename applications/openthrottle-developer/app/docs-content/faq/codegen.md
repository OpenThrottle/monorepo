---
group: 01. Local Development
order: 4
title: When do I need to run codegen?
---

After changing GraphQL types, resolvers, or documents. Run `pnpm nx run openthrottle-server:graphql-schema:write` to rewrite `schema.gql` (booting the server does not), then run `pnpm nx affected --target=codegen-graphql,codegen-react-router --parallel` and commit the generated output — CI fails on codegen drift. In a fresh checkout, run `pnpm nx run-many --target=codegen-graphql --all` before app tests will collect.
