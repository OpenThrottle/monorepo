# NestJS Applications

Reproduce with `tree -L 2 -I 'node_modules|dist|build|__generated__' applications/openthrottle-server`.

`openthrottle-server` is the only NestJS application in the repo — the code-first
GraphQL API. It shares almost nothing with the React Router tree: no `app/`, no
`vite.config.ts`, no `public/`, no `vercel.json`.

```bash
applications/openthrottle-server
├── docs                      # Design notes for this app
├── eslint.config.mts         # NOTE the .mts extension — not .ts like the RR apps
├── langgraph.json            # LangGraph agent config
├── nest-cli.json
├── package.json
├── schema.gql                # THE committed GraphQL schema — generated, then committed
├── src
│   ├── app.module.ts           # Root module; wires every feature module
│   ├── auth                    # Authentication strategies and session wiring
│   ├── bootstrap.ts            # App construction, shared by main.ts and tests
│   ├── config                  # Typed configuration and defaults
│   ├── graphql                 # Resolvers, object types, input types
│   ├── guards                  # Route/field guards
│   ├── load-env.ts             # Env loading, imported before anything else
│   ├── main.ts                 # Process entrypoint
│   ├── metrics                 # Instrumentation
│   ├── modules                 # Feature modules used by THIS app only
│   ├── notifications           # Notification delivery
│   ├── queues                  # BullMQ producers, consumers, schedulers
│   └── services                # Injectable services and business logic
├── tests
│   └── setup.ts
├── tsconfig.app.json         # Source-only build config
├── tsconfig.json             # Solution config
├── tsconfig.test.json        # Test config
└── vitest.config.ts
```

## Where NestJS code goes

- **A feature module used by this app only** → `src/modules/`.
- **A feature module a second application needs** → promote it to a
  `packages/nestjs-*` package. An application can never be imported, so the
  moment there are two consumers it is a package.
- **Business logic** → `src/services/`, injectable and unit-testable.
- **GraphQL resolvers and types** → `src/graphql/`.
- **Guards** → `src/guards/`; **config and defaults** → `src/config/`.
- There is no `components/`, `hooks/`, or `data/` here — those belong to the
  React and React Router buckets.

## The schema is generated, then committed

`schema.gql` is written by `autoSchemaFile` when the server boots — it is
generated output that is nonetheless **committed**, and consumers read the
committed file. That is why it sits at the project root rather than under
`src/` or in a `__generated__` directory.

The boot → codegen → commit sequence itself belongs to **ot-stack**; go there
before changing GraphQL types, resolvers, or documents.
