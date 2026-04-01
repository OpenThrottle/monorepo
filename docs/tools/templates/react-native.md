# React Native Generator Reference

Generate React Native components, hooks, routes, packages, and applications.

## Quick Start

```bash
# Get schema
nx g @tools/generators:react-native --describe

# List targets
nx g @tools/generators:react-native --list=targets

# Generate component
nx g @tools/generators:react-native \
  --type=component \
  --target=barguide-app \
  --name=Button
```

## Available Types

- `component` - Generate a React Native component
- `package` - Generate a React Native package

## Parameters

| Parameter      | Type     | Required                        | Description                                                                      | Constraints                                                                                                                       |
| -------------- | -------- | ------------------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `type`         | `string` | ✅                              | Type of artifact to generate                                                     | `"component" \| "package"` (note: uses `--type` not `--subGenerator`)                                                             |
| `name`         | `string` | ✅ (for `component`, `package`) | Name(s) of artifact(s). Multiple comma-separated names supported for components. | PascalCase for components. Min 3 chars.                                                                                           |
| `target`       | `string` | ✅ (for `component`)            | Destination package or application                                               | Min 1 char. Use `--list=targets` to enumerate valid values.                                                                       |
| `destination`  | `string` | Optional (for `component`)      | Destination folder path within application                                       | Pattern: `^(global/components\|routes/[^/]+/components\|services/[^/]+/components)$`                                              |
| `organization` | `string` | ✅ (for `package`)              | Organization scope                                                               | `"@barguide" \| "@intouch" \| "@openthrottle" \| "@rocketcms" \| "@tools" \| "@visormatt"`                                        |
| `packageType`  | `string` | ✅ (for `package`)              | Type of package                                                                  | `"feature" \| "package"`. Feature packages must start with `"feature-"`, React Native packages must start with `"react-native-"`. |

## Conditional Requirements

- For `component`: `target` and `name` required
- For `package`: `name`, `organization`, and `packageType` required. Name must match pattern based on `packageType`:
  - If `packageType` is `"feature"`: name must match `^feature-`
  - If `packageType` is `"package"`: name must match `^react-native-`

## Examples

### Component

```bash
nx g @tools/generators:react-native \
  --type=component \
  --target=barguide-app \
  --name=Button
```

### Component with Destination

```bash
nx g @tools/generators:react-native \
  --type=component \
  --target=barguide-app \
  --destination=global/components \
  --name=UserCard
```

### Feature Package

```bash
nx g @tools/generators:react-native \
  --type=package \
  --name=feature-auth \
  --organization=@rocketcms \
  --packageType=feature
```

### React Native Package

```bash
nx g @tools/generators:react-native \
  --type=package \
  --name=react-native-ui \
  --organization=@rocketcms \
  --packageType=package
```

## Naming Conventions

- **Components**: PascalCase (e.g., `Button`, `UserCard`)
- **Feature Packages**: Must start with `feature-` (e.g., `feature-auth`)
- **React Native Packages**: Must start with `react-native-` (e.g., `react-native-ui`)
