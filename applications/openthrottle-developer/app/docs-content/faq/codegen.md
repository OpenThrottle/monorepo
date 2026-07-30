---
group: 01. Local Development
order: 4
title: When do I need to run codegen?
---

After changing GraphQL types, resolvers, or documents. Bootstrap `pnpm nx run openthrottle-server:dev` once to write `schema.gql`, then run `pnpm nx affected --target=codegen-graphql,codegen-react-router --parallel` and commit the generated output — CI fails on codegen drift. In a fresh checkout, run `pnpm nx run-many --target=codegen-graphql --all` before app tests will collect.
