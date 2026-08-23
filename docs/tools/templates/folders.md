# Folders Generator Reference

Generate folder structures for project routes or services.

## Quick Start

```bash
# Get schema
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:folders --describe

# List applications
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:folders --list=applications

# Generate routing folder
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:folders \
  --application=openthrottle-developer \
  --folder=routing \
  --name=users
```

## Parameters

| Parameter     | Type     | Required | Description                | Constraints                                                                                   |
| ------------- | -------- | -------- | -------------------------- | --------------------------------------------------------------------------------------------- |
| `application` | `string` | ✅       | Target application         | Min 1 char. Use `--list=applications` to enumerate valid values.                              |
| `folder`      | `string` | ✅       | Type of folder to generate | `"routing" \| "services"`                                                                     |
| `name`        | `string` | ✅       | Folder name                | Valid slug (lowercase, hyphen-separated). Pattern: `^[a-z0-9]+(?:-[a-z0-9]+)*$`. Min 3 chars. |

## Examples

### Routing Folder

```bash
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:folders \
  --application=openthrottle-developer \
  --folder=routing \
  --name=users
```

### Services Folder

```bash
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:folders \
  --application=openthrottle-developer \
  --folder=services \
  --name=email-service
```

## Naming Conventions

- **Folders**: kebab-case (e.g., `users`, `email-service`, `forecasting`)
