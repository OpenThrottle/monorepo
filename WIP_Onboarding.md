# Onboarding

```bash
claude mcp list
```

```bash
docker compose build --no-cache openthrottle-postgres

pnpm run database:start

docker compose --profile dev watch
```

```<bash></bash>
cursor ~/.claude.json
cursor ~/.cursor/mcp.json
```

```bash
=== openthrottle-mcp ===
OPENTHROTTLE_MCP_AUTH_TOKEN=ot_sa_KERAYfiNzsjY_JjSccfe6zY6wfiKjqX5QloueYsFNFeM1

query: START TRANSACTION
query: INSERT INTO "service_account_credentials"("id", "service_account_id", "prefix", "secret_hash", "label", "expires_at", "last_used_at", "revoked_at", "created_at") VALUES (DEFAULT, $1, $2, $3, $4, $5, DEFAULT, DEFAULT, DEFAULT) RETURNING "id", "created_at" -- PARAMETERS: ["5a07ff4d-5eaa-47b8-a642-a0fe99080c32","cIP0FzkhMCv9","$2b$10$XZxzxeI2wcNnC.h6JSC0oOaZb5JzaLzN5smJT4MheUcX3XwaXio9q","bootstrap-workflow-ralph",null]
query: COMMIT

=== workflow-ralph ===
OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN=ot_sa_cIP0FzkhMCv9_fMq9J66M5SF9IiLOJVBoRZucQTNo8I1Y

Add the lines above to:
  - applications/openthrottle-server/.env
  - Cursor ~/.cursor/mcp.json env for openthrottle-mcp (OPENTHROTTLE_MCP_AUTH_TOKEN only)
Tokens are shown once; store them securely and rotate via admin GraphQL when needed.
p
```
