# React Generator Reference

Generate React components, hooks, and utilities.

## Quick Start

```bash
# Get schema
nx g @tools/generators:react --describe

# List destinations
nx g @tools/generators:react --list=destinations

# Generate component
nx g @tools/generators:react \
  --subGenerator=component \
  --destination=@openthrottle/react-router-ui \
  --name=UserCard
```

## Sub-Generators

- `component` - Generate a React component
- `hook` - Generate a React hook
- `util` - Generate a utility function

## Parameters

| Parameter      | Type     | Required | Description                                                       | Constraints                                                                                                              |
| -------------- | -------- | -------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `subGenerator` | `string` | ✅       | Type of artifact to generate                                      | `"component" \| "hook" \| "util"`                                                                                        |
| `name`         | `string` | ✅       | Name(s) of artifact(s). Multiple comma-separated names supported. | PascalCase for components/hooks, camelCase for utils. Min 3 chars. Pattern: `^[A-Z][a-zA-Z0-9]*(?:,[A-Z][a-zA-Z0-9]*)*$` |
| `destination`  | `string` | ✅       | Destination package or application                                | Min 1 char. Use `--list=destinations` to enumerate valid values.                                                         |

## Examples

### Component

```bash
nx g @tools/generators:react \
  --subGenerator=component \
  --destination=@openthrottle/react-router-ui \
  --name=UserCard
```

### Multiple Components

```bash
nx g @tools/generators:react \
  --subGenerator=component \
  --destination=@openthrottle/react-router-ui \
  --name=Button,Input,Select
```

### Hook

```bash
nx g @tools/generators:react \
  --subGenerator=hook \
  --destination=@openthrottle/react-router-ui \
  --name=useUser
```

### Utility

```bash
nx g @tools/generators:react \
  --subGenerator=util \
  --destination=@openthrottle/react-router-ui \
  --name=formatDate
```

## Conditional Requirements

All sub-generators require the same fields: `subGenerator`, `destination`, and `name`.

## Naming Conventions

- **Components**: PascalCase (e.g., `UserCard`, `Button`)
- **Hooks**: camelCase starting with `use` (e.g., `useUser`, `useAuth`)
- **Utils**: camelCase (e.g., `formatDate`, `parseJson`)
