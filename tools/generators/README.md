# @tools/generators

Nx generators for quickly scaffolding code in this monorepo.

## Usage

> **Note for AI Agents**: All generator commands **MUST** use `NX_ISOLATE_PLUGINS=false` prefix. See [AGENT_USAGE.md](../../docs/tools/templates/AGENT_USAGE.md) for details.

### Listing available generators

```bash
pnpm nx list @tools/generators
```

### Interactive (human) usage

All generators support interactive prompting.

```bash
# React generator (prompts for sub-generator + inputs)
pnpm nx g @tools/generators:react --interactive

# Remix generator
pnpm nx g @tools/generators:remix --interactive

# NestJS generator
pnpm nx g @tools/generators:nestjs --interactive
```

### Non-interactive (AI / programmatic) usage

All generators can be invoked with flags only (no prompts). Missing/invalid options fail fast.

#### React

> [!Warning]
> `--generator` is reserved by Nx; use `--subGenerator`.

```bash
pnpm nx g @tools/generators:react \
  --subGenerator=component \
  --destination=@openthrottle/shared-ui \
  --name=MyComponent
```

#### Remix

```bash
pnpm nx g @tools/generators:remix \
  --subGenerator=component \
  --application=openthrottle \
  --folder=global/components \
  --name=MyComponent
```

#### NestJS

```bash
pnpm nx g @tools/generators:nestjs \
  --subGenerator=application \
  --name=my-api \
  --port=4010
```

#### React Native

React Native uses `--type` (not `--subGenerator`):

```bash
pnpm nx g @tools/generators:react-native \
  --type=package \
  --packageType=package \
  --organization=@openthrottle \
  --name=react-native-example-package
```

#### Package + Folders

```bash
pnpm nx g @tools/generators:package \
  --type=react \
  --organization=@openthrottle \
  --name=my-lib

pnpm nx g @tools/generators:folders \
  --application=openthrottle \
  --folder=routing \
  --name=forecasting
```

## AI-friendly discovery

### Describe (machine-readable contract)

Prints a JSON description of the generator interface and exits (no files written).

```bash
pnpm nx g @tools/generators:react --describe
pnpm nx g @tools/generators:remix --describe
pnpm nx g @tools/generators:nestjs --describe
```

### List (machine-readable dynamic values)

Dynamic option sets (project graph / filesystem driven) can be enumerated as JSON:

```bash
# React destinations (Nx projects with tag technology:react)
pnpm nx g @tools/generators:react --list=destinations

# Remix applications (Nx projects with tag type:application)
pnpm nx g @tools/generators:remix --list=applications

# Remix folders (requires application)
pnpm nx g @tools/generators:remix --list=componentFolders --application=openthrottle

# NestJS applications
pnpm nx g @tools/generators:nestjs --list=nestjsApplications
pnpm nx g @tools/generators:nestjs --list=graphqlApplications
```

## Development

```bash
pnpm nx run @tools/generators:test
pnpm nx run @tools/generators:lint
```

See [AGENTS.md](../../AGENTS.md) for pnpm and Nx usage in this workspace.
