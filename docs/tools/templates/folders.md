# Folders Generator Reference

Generate folder structures for project routes or services.

## Quick Start

```bash
# Get schema
nx g @tools/generators:folders --describe

# List applications
nx g @tools/generators:folders --list=applications

# Generate routing folder
nx g @tools/generators:folders \
  --application=openthrottle-cms \
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
nx g @tools/generators:folders \
  --application=openthrottle-cms \
  --folder=routing \
  --name=users
```

### Services Folder

```bash
nx g @tools/generators:folders \
  --application=openthrottle-cms \
  --folder=services \
  --name=email-service
```

## Naming Conventions

- **Folders**: kebab-case (e.g., `users`, `email-service`, `forecasting`)
