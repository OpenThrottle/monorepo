# NestJS Generator Reference

Generate NestJS applications, services, controllers, modules, queues, and AI agents.

## Quick Start

```bash
# Get schema
nx g @tools/generators:nestjs --describe

# List NestJS applications
nx g @tools/generators:nestjs --list=nestjsApplications

# List NestJS applications (preferred when choosing --application)
nx g @tools/generators:nestjs --list=nestjsApplications

# Optional: GraphQL-tagged apps (may be empty if no project has technology:graphql)
nx g @tools/generators:nestjs --list=graphqlApplications

# Generate GraphQL service
nx g @tools/generators:nestjs \
  --subGenerator=graphql-service \
  --application=openthrottle-server \
  --name=users
```

## Sub-Generators

- `application` - Generate a NestJS application
- `graphql-service` - Generate a GraphQL service
- `simple-service` - Generate a simple service
- `module` - Generate a module
- `queue` - Generate a queue service
- `ai-agent` - Generate an AI agent service

## Parameters

| Parameter      | Type     | Required                                                                    | Description                  | Constraints                                                                                   |
| -------------- | -------- | --------------------------------------------------------------------------- | ---------------------------- | --------------------------------------------------------------------------------------------- |
| `subGenerator` | `string` | ✅                                                                          | Type of artifact to generate | `"ai-agent" \| "application" \| "graphql-service" \| "module" \| "queue" \| "simple-service"` |
| `name`         | `string` | ✅                                                                          | Name of artifact             | Valid slug (lowercase, hyphen-separated). Pattern: `^[a-z0-9]+(?:-[a-z0-9]+)*$`. Min 3 chars. |
| `port`         | `number` | ✅ (for `application`)                                                      | Port number for application  | Range: 4000-9999                                                                              |
| `application`  | `string` | ✅ (for `graphql-service`, `simple-service`, `module`, `queue`, `ai-agent`) | Target NestJS application    | Min 1 char. Use `--list=nestjsApplications` or `--list=graphqlApplications` to enumerate.     |

## Conditional Requirements

- For `application`: `name` and `port` required
- For `graphql-service`, `simple-service`, `module`, `queue`, `ai-agent`: `application` and `name` required

## Examples

### Application

```bash
nx g @tools/generators:nestjs \
  --subGenerator=application \
  --name=new-api \
  --port=4001
```

### GraphQL Service

```bash
nx g @tools/generators:nestjs \
  --subGenerator=graphql-service \
  --application=openthrottle-server \
  --name=users
```

### Simple Service

```bash
nx g @tools/generators:nestjs \
  --subGenerator=simple-service \
  --application=openthrottle-server \
  --name=email-service
```

### Module

```bash
nx g @tools/generators:nestjs \
  --subGenerator=module \
  --application=openthrottle-server \
  --name=auth
```

### Queue

```bash
nx g @tools/generators:nestjs \
  --subGenerator=queue \
  --application=openthrottle-server \
  --name=email-queue
```

### AI Agent

```bash
nx g @tools/generators:nestjs \
  --subGenerator=ai-agent \
  --application=openthrottle-server \
  --name=chat-agent
```

## Naming Conventions

- **Services**: kebab-case (e.g., `user-service`, `email-service`)
- **Modules**: kebab-case (e.g., `auth`, `email-module`)
- **Applications**: kebab-case (e.g., `new-api`, `openthrottle-server`)
