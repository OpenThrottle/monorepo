# Package Generator Reference

Generate packages for use across packages and applications.

## Quick Start

```bash
# Get schema
nx g @tools/generators:package --describe

# List organizations
nx g @tools/generators:package --list=organizations

# List types
nx g @tools/generators:package --list=types

# Generate React package
nx g @tools/generators:package \
  --type=react \
  --organization=@openthrottle \
  --name=ui-components
```

## Package Types

- `nestjs` - NestJS package
- `node` - Node.js package
- `react` - React package
- `tools` - Tools package

## Parameters

| Parameter      | Type     | Required | Description                 | Constraints                                                                                   |
| -------------- | -------- | -------- | --------------------------- | --------------------------------------------------------------------------------------------- |
| `type`         | `string` | ✅       | Type of package to generate | `"nestjs" \| "node" \| "react" \| "tools"`                                                    |
| `organization` | `string` | ✅       | Organization scope          | `"@openthrottle" \| "@tools"`                                                                 |
| `name`         | `string` | ✅       | Package name                | Valid slug (lowercase, hyphen-separated). Pattern: `^[a-z0-9]+(?:-[a-z0-9]+)*$`. Min 3 chars. |

## Examples

### React Package

```bash
nx g @tools/generators:package \
  --type=react \
  --name=ui-components \
  --organization=@openthrottle
```

### NestJS Package

```bash
nx g @tools/generators:package \
  --type=nestjs \
  --name=auth-module \
  --organization=@tools
```

### Node Package

```bash
nx g @tools/generators:package \
  --type=node \
  --name=shared-utils \
  --organization=@openthrottle
```

### Tools Package

```bash
nx g @tools/generators:package \
  --type=tools \
  --name=code-generator \
  --organization=@tools
```

## Naming Conventions

- **Packages**: kebab-case (e.g., `ui-components`, `shared-utils`, `auth-module`)
