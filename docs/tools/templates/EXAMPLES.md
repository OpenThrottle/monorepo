# Generator Examples

Common usage patterns and examples for `@tools/generators` generators.

## React Generator Examples

### Creating a Component

**User Request:** "Create a UserCard component in the shared-ui package"

```bash
# 1. Discover available destinations
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:react --list=destinations

# 2. Execute generator
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:react \
  --subGenerator=component \
  --destination=@openthrottle/react-router-ui \
  --name=UserCard
```

### Creating Multiple Components

**User Request:** "Create Button, Input, and Select components"

```bash
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:react \
  --subGenerator=component \
  --destination=@openthrottle/react-router-ui \
  --name=Button,Input,Select
```

### Creating a Hook

```bash
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:react \
  --subGenerator=hook \
  --destination=@openthrottle/react-router-ui \
  --name=useUser
```

### Creating a Utility

```bash
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:react \
  --subGenerator=util \
  --destination=@openthrottle/react-router-ui \
  --name=formatDate
```

## React Router Generator Examples

### Creating a Component

```bash
# 1. List available applications
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:react-router --list=applications

# 2. List available folders
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:react-router --list=componentFolders --application=openthrottle-developer

# 3. Generate component
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:react-router \
  --subGenerator=component \
  --application=openthrottle-developer \
  --folder=global/components \
  --name=UserProfile
```

### Creating a Form

```bash
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:react-router \
  --subGenerator=form \
  --application=openthrottle-developer \
  --folder=routing/users/components \
  --name=UserForm
```

### Creating a Route

```bash
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:react-router \
  --subGenerator=route \
  --application=openthrottle-developer \
  --name=api.users
```

## NestJS Generator Examples

### Creating a GraphQL Service

```bash
# 1. List available applications
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:nestjs --list=graphqlApplications

# 2. Generate service
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:nestjs \
  --subGenerator=graphql-service \
  --application=openthrottle-server \
  --name=users
```

### Creating a New NestJS Application

```bash
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:nestjs \
  --subGenerator=application \
  --name=new-api \
  --port=4001
```

### Creating a Queue Service

```bash
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:nestjs \
  --subGenerator=queue \
  --application=openthrottle-server \
  --name=email-queue
```

## React Native

There is no `@tools/generators:react-native` entry in this workspace (`tools/generators/generators.json`). See [react-native.md](./react-native.md).

## Package Generator Examples

### Creating a React Package

```bash
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:package \
  --type=react \
  --name=ui-components \
  --organization=@openthrottle
```

### Creating a NestJS Package

```bash
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:package \
  --type=nestjs \
  --name=auth-module \
  --organization=@tools
```

## Folders Generator Examples

### Creating a Routing Folder

```bash
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:folders \
  --application=openthrottle-developer \
  --folder=routing \
  --name=users
```

### Creating a Services Folder

```bash
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:folders \
  --application=openthrottle-developer \
  --folder=services \
  --name=email-service
```

## Batch Operations

Many generators support comma-separated names for generating multiple artifacts:

```bash
# Generate multiple React components
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:react \
  --subGenerator=component \
  --destination=@openthrottle/react-router-ui \
  --name=Button,Input,Select,Textarea
```

## Complete Workflow Example

Here's a complete workflow for creating a new feature:

```bash
# 1. Create routing folder structure
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:folders \
  --application=openthrottle-developer \
  --folder=routing \
  --name=users

# 2. Create a route
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:react-router \
  --subGenerator=route \
  --application=openthrottle-developer \
  --name=users

# 3. Create components
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:react-router \
  --subGenerator=component \
  --application=openthrottle-developer \
  --folder=routing/users/components \
  --name=UserList,UserCard

# 4. Create a form
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:react-router \
  --subGenerator=form \
  --application=openthrottle-developer \
  --folder=routing/users/components \
  --name=UserForm

# 5. Create a table
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:react-router \
  --subGenerator=table \
  --application=openthrottle-developer \
  --folder=routing/users/components \
  --name=UsersTable
```
