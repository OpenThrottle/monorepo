---
group: 04. Troubleshooting
order: 3
title: Why won't tests collect in a fresh checkout?
---

App Vitest suites depend on generated GraphQL types that don't exist yet in a brand-new checkout. Generate them first with `pnpm nx run-many --target=codegen-graphql --all`, then run the tests.
