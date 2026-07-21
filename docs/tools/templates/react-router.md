# React Router Generator Reference

Generate React Router applications, components, forms, modals, routes, and tables.

## Quick Start

```bash
# Get schema
nx g @tools/generators:react-router --describe

# List applications
nx g @tools/generators:react-router --list=applications

# List folders for an application
nx g @tools/generators:react-router --list=componentFolders --application=openthrottle-developer

# Generate component
nx g @tools/generators:react-router \
  --subGenerator=component \
  --application=openthrottle-developer \
  --folder=global/components \
  --name=UserProfile
```

## Sub-Generators

- `application` - Generate a React Router application
- `component` - Generate a React Router component
- `form` - Generate a Formik form
- `modal` - Generate a modal component
- `route` - Generate a React Router route
- `table` - Generate a table component

## Parameters

| Parameter      | Type     | Required                                                | Description                                                       | Constraints                                                                                                                                                                                                    |
| -------------- | -------- | ------------------------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `subGenerator` | `string` | ✅                                                      | Type of artifact to generate                                      | `"application" \| "component" \| "form" \| "modal" \| "route" \| "table"`                                                                                                                                      |
| `name`         | `string` | ✅                                                      | Name(s) of artifact(s). Multiple comma-separated names supported. | PascalCase for components/forms/modals/tables. Forms must end with `'Form'`, modals with `'Modal'`, tables with `'Table'`. Routes can be any valid route name (e.g., `'api.users'` or `'users'`). Min 3 chars. |
| `application`  | `string` | ✅ (for `component`, `form`, `modal`, `route`, `table`) | Target application                                                | Min 1 char. Use `--list=applications` to enumerate valid values.                                                                                                                                               |
| `folder`       | `string` | ✅ (for `component`, `form`, `modal`, `table`)          | Destination folder path                                           | Use `--list=componentFolders` or `--list=serviceFolders` with `--application` to enumerate valid values.                                                                                                       |

## Conditional Requirements

- For `application`: Only `name` required
- For `route`: `application` and `name` required
- For `component`, `form`, `modal`, `table`: `application`, `name`, and `folder` required

## Examples

### Application

```bash
nx g @tools/generators:react-router \
  --subGenerator=application \
  --name=new-app
```

### Component

```bash
nx g @tools/generators:react-router \
  --subGenerator=component \
  --application=openthrottle-developer \
  --folder=global/components \
  --name=UserProfile
```

### Form (must end with 'Form')

```bash
nx g @tools/generators:react-router \
  --subGenerator=form \
  --application=openthrottle-developer \
  --folder=routing/users/components \
  --name=UserForm
```

### Modal (must end with 'Modal')

```bash
nx g @tools/generators:react-router \
  --subGenerator=modal \
  --application=openthrottle-developer \
  --folder=global/components \
  --name=DeleteModal
```

### Route

```bash
nx g @tools/generators:react-router \
  --subGenerator=route \
  --application=openthrottle-developer \
  --name=api.users
```

### Table (must end with 'Table')

```bash
nx g @tools/generators:react-router \
  --subGenerator=table \
  --application=openthrottle-developer \
  --folder=routing/users/components \
  --name=UsersTable
```

## Naming Conventions

- **Components**: PascalCase (e.g., `UserProfile`)
- **Forms**: Must end with `Form` (e.g., `UserForm`)
- **Modals**: Must end with `Modal` (e.g., `DeleteModal`)
- **Tables**: Must end with `Table` (e.g., `UsersTable`)
- **Routes**: Any valid route name (e.g., `api.users`, `users`)
