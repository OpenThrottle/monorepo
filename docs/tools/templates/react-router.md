# React Router Generator Reference

Generate React Router applications, components, forms, hooks, modals, routes, and tables.

## Quick Start

```bash
# Get schema
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:react-router --describe

# List applications
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:react-router --list=applications

# List folders for an application
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:react-router --list=componentFolders --application=openthrottle-developer

# List hook area folders for an application
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:react-router --list=hookFolders --application=openthrottle-developer

# Generate component
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:react-router \
  --subGenerator=component \
  --application=openthrottle-developer \
  --folder=global/components \
  --name=UserProfile
```

## Sub-Generators

- `application` - Generate a React Router application
- `component` - Generate a React Router component
- `form` - Generate a Formik form
- `hook` - Generate a React hook under `app/<area>/hooks/`
- `modal` - Generate a modal component
- `route` - Generate a React Router route
- `table` - Generate a table component

## Parameters

| Parameter      | Type     | Required                                                        | Description                                                       | Constraints                                                                                                                                                                                                                                                      |
| -------------- | -------- | --------------------------------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `subGenerator` | `string` | ✅                                                              | Type of artifact to generate                                      | `"application" \| "component" \| "form" \| "hook" \| "modal" \| "route" \| "table"`                                                                                                                                                                              |
| `name`         | `string` | ✅                                                              | Name(s) of artifact(s). Multiple comma-separated names supported. | PascalCase for components/forms/modals/tables. camelCase for hooks (e.g. `usePlanOutputStream`). Forms must end with `'Form'`, modals with `'Modal'`, tables with `'Table'`. Routes can be any valid route name (e.g., `'api.users'` or `'users'`). Min 3 chars. |
| `application`  | `string` | ✅ (for `component`, `form`, `hook`, `modal`, `route`, `table`) | Target application                                                | Min 1 char. Use `--list=applications` to enumerate valid values.                                                                                                                                                                                                 |
| `folder`       | `string` | ✅ (for `component`, `form`, `hook`, `modal`, `table`)          | Destination folder path                                           | Components/forms/modals/tables: `--list=componentFolders` (or related) with `--application`. Hooks: area paths via `--list=hookFolders` (e.g. `global`, `routing/<area>`, `services/<area>` → `app/<folder>/hooks/`).                                            |

## Conditional Requirements

- For `application`: Only `name` required
- For `route`: `application` and `name` required
- For `component`, `form`, `hook`, `modal`, `table`: `application`, `name`, and `folder` required

## Examples

### Application

```bash
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:react-router \
  --subGenerator=application \
  --name=new-app
```

### Component

```bash
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:react-router \
  --subGenerator=component \
  --application=openthrottle-developer \
  --folder=global/components \
  --name=UserProfile
```

### Form (must end with 'Form')

```bash
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:react-router \
  --subGenerator=form \
  --application=openthrottle-developer \
  --folder=routing/users/components \
  --name=UserForm
```

### Hook (camelCase; comma-separated batching supported)

```bash
# List area folders first: --list=hookFolders --application=openthrottle-developer
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:react-router \
  --subGenerator=hook \
  --application=openthrottle-developer \
  --folder=global \
  --name=useCommanderOptions

# Routing area example (lands in app/routing/plans/hooks/)
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:react-router \
  --subGenerator=hook \
  --application=openthrottle-developer \
  --folder=routing/plans \
  --name=usePlanOutputStream,usePlanStatus
```

### Modal (must end with 'Modal')

```bash
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:react-router \
  --subGenerator=modal \
  --application=openthrottle-developer \
  --folder=global/components \
  --name=DeleteModal
```

### Route

```bash
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:react-router \
  --subGenerator=route \
  --application=openthrottle-developer \
  --name=api.users
```

### Table (must end with 'Table')

```bash
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:react-router \
  --subGenerator=table \
  --application=openthrottle-developer \
  --folder=routing/users/components \
  --name=UsersTable
```

## Naming Conventions

- **Components**: PascalCase (e.g., `UserProfile`)
- **Forms**: Must end with `Form` (e.g., `UserForm`)
- **Hooks**: camelCase (e.g., `useCommanderOptions`, `usePlanOutputStream`)
- **Modals**: Must end with `Modal` (e.g., `DeleteModal`)
- **Tables**: Must end with `Table` (e.g., `UsersTable`)
- **Routes**: Any valid route name (e.g., `api.users`, `users`)
