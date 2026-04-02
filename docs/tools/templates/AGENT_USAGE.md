# Generator Service - **MANDATORY Agent Usage Guide**

## 🚦 **Absolute Rule for AI Agents:**

**Do not write new code, files, components, services, applications, or modules by hand if a generator exists!
You MUST ALWAYS use the generators in `@tools/generators` as your starting point for any code generation, unless you have verified no appropriate generator exists.**

If no generator exists for what you are asked to build, note it clearly and proceed with custom code only as a last resort.

This policy is **non-negotiable** and applies to all AI agent, LLM, and programmatic workflows in this monorepo.

**Discoverability:** Agents are directed here from [AGENTS.md](../../../AGENTS.md) (§ Generators) and [.cursor/rules/personal-generators.mdc](../../../.cursor/rules/personal-generators.mdc). Always **check generators first**, then use this doc for the full workflow (list → describe → `--list=<key>` → execute).

---

## Table of Contents

- [Why Always Use Generators?](#why-always-use-generators)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
- [Generator References](#generator-references)
- [Best Practices](#best-practices)
- [Plugin Worker Configuration](#plugin-worker-configuration)
- [Integration with Agent Workflows](#integration-with-agent-workflows)
- [Additional Resources](#additional-resources)

---

## Why Always Use Generators?

Generators provided in `@tools/generators` encapsulate best practices, project structure conventions, naming rules, and boilerplate logic that is critical to maintain consistency and quality in this monorepo.

**Key reasons:**

- Ensures all generated code is discoverable, standardized, and maintainable.
- Reduces risk of errors, inconsistencies, or non-compliance with workspace standards.
- Automates many tasks that are error-prone if done manually.
- Enables easy machine-readable introspection (`--describe` and `--list`) for LLMs and agents.
- Supports batch operations for rapid development.

> **As an AI agent:**
>
> - **Before building any new code,** you must check if a generator exists (use `nx list @tools/generators` and `--describe`).
> - **If a generator exists:** Use it to scaffold your code.
> - **If a generator does not exist:** Only then, and only after stating this fact, may you write custom code directly.

---

## Quick Start

> **Absolute for AI Agents:** Every Nx command using `@tools/generators` **MUST** have `NX_ISOLATE_PLUGINS=false` prefixed. **Do NOT omit this.**

### 1. Discover Generators

```bash
NX_ISOLATE_PLUGINS=false nx list @tools/generators
```

### 2. Get Generator Schema and Options

Inspect the full schema and required flags for each generator:

```bash
NX_ISOLATE_PLUGINS=false nx g @tools/generators:react --describe
NX_ISOLATE_PLUGINS=false nx g @tools/generators:remix --describe
# ...repeat for any relevant generator
```

### 3. List Dynamic Values

Discover available values for dynamic options:

```bash
NX_ISOLATE_PLUGINS=false nx g @tools/generators:react --list=destinations
NX_ISOLATE_PLUGINS=false nx g @tools/generators:remix --list=applications
NX_ISOLATE_PLUGINS=false nx g @tools/generators:remix --list=componentFolders --application=openthrottle-cms
```

### 4. Create New Code — Always With Generators

_Only_ generate new files or structures with a generator if one exists:

```bash
# React component example
NX_ISOLATE_PLUGINS=false nx g @tools/generators:react \
  --subGenerator=component \
  --destination=@openthrottle/react-router-ui \
  --name=UserCard
# Remix component example
NX_ISOLATE_PLUGINS=false nx g @tools/generators:remix \
  --subGenerator=component \
  --application=openthrottle-cms \
  --folder=global/components \
  --name=UserProfile
# NestJS GraphQL service
NX_ISOLATE_PLUGINS=false nx g @tools/generators:nestjs \
  --subGenerator=graphql-service \
  --application=openthrottle-server \
  --name=users
# NestJS module into a package (use --list=nestjsPackages for valid destinations)
NX_ISOLATE_PLUGINS=false nx g @tools/generators:nestjs \
  --subGenerator=module \
  --destination=@openthrottle/nestjs-repositories \
  --name=plans
```

---

## API Reference

### How to Discover and Use Generators

#### List all generators available

```bash
NX_ISOLATE_PLUGINS=false nx list @tools/generators
```

This lists all code scaffolding generators. **If you don’t see what you need, check the docs, or ask for help, before writing custom code!**

#### Get machine-readable contract/schema

```bash
NX_ISOLATE_PLUGINS=false nx g @tools/generators:<generator-name> --describe
```

Exposes all options, required fields, and valid values programmatically.

#### Enumerate valid dynamic values

```bash
NX_ISOLATE_PLUGINS=false nx g @tools/generators:<generator-name> --list=<list-key> [--application=<app>]
```

Use for destinations, folders, and more — ensure you select valid targets!

### Generator Execution

All new code should go through a generator:

```bash
NX_ISOLATE_PLUGINS=false nx g @tools/generators:<generator-name> \
  --subGenerator=<type> \
  --option1=value1 \
  --option2=value2
```

- Use `--subGenerator` (not `--generator`) for most.
- Missing required options will fail the command, which is preferable to silent mistakes.

---

## Generator References

- **[React Generator](./docs/react.md)** – Components, hooks, utils, etc.
- **[Remix Generator](./docs/remix.md)** – Apps, components, forms, modals, etc.
- **[NestJS Generator](./docs/nestjs.md)** – Apps, services, modules, agents, etc.
- **[React Native](./docs/react-native.md)** — not registered in this repo; see file
- **[Package Generator](./docs/package.md)**
- **[Folders Generator](./docs/folders.md)**

---

## Best Practices (Strict Agent Edition)

### 1. **Discover Before You Build**

```bash
NX_ISOLATE_PLUGINS=false nx list @tools/generators
NX_ISOLATE_PLUGINS=false nx g @tools/generators:<generator> --describe
NX_ISOLATE_PLUGINS=false nx g @tools/generators:<generator> --list=<key>
```

Always enumerate and fully understand the generator schema first.

### 2. **Do Not Guess Required Fields**

Always check the result of `--describe`!

### 3. **Batch Where Possible**

Generators support comma-separated names:

```bash
NX_ISOLATE_PLUGINS=false nx g @tools/generators:react \
  --subGenerator=component \
  --destination=@openthrottle/react-router-ui \
  --name=Button,Input,Select,Textarea
```

### 4. **Naming Matters — Respect Conventions**

- **Components:** PascalCase – `UserCard`
- **Hooks:** `useSomething`
- **Utils:** camelCase
- **NestJS:** kebab-case
- **Packages:** kebab-case
- **Forms:** Must end with `Form`
- **Modals:** Must end with `Modal`
- **Tables:** Must end with `Table`

### 5. **ALWAYS Confirm Target Exists**

```bash
NX_ISOLATE_PLUGINS=false nx g @tools/generators:react --list=destinations
NX_ISOLATE_PLUGINS=false nx g @tools/generators:remix --list=applications
```

Do **NOT** guess or invent targets.

### 6. **If No Generator Exists, Document the Exception**

Before writing custom code, log/explain in your output:

> "No generator was found for [artifact]. Proceeding with manual code as a one-time exception."

---

## Plugin Worker Configuration

All commands must use `NX_ISOLATE_PLUGINS=false`.
This is critical in agent and LLM execution environments.

If you fail to use this, plugin-related commands **WILL break**.

If running multiple commands, you may also export for the session:

```bash
export NX_ISOLATE_PLUGINS=false
```

or always explicitly prefix every generator command.

For detailed troubleshooting, see [NX_ISOLATE_PLUGINS Documentation](./docs/NX_ISOLATE_PLUGINS.md)
and [Troubleshooting Guide](./docs/TROUBLESHOOTING.md#issue-plugin-worker-fails)

---

## Integration with Agent Workflows

### **Agent Command Pattern**

**MANDATORY for every new artifact/tools/generators-supported code:**

```bash
# 1. Discover all generators
NX_ISOLATE_PLUGINS=false nx list @tools/generators

# 2. Get schema for what you need
NX_ISOLATE_PLUGINS=false nx g @tools/generators:<kind> --describe

# 3. List dynamic values (if needed)
NX_ISOLATE_PLUGINS=false nx g @tools/generators:<kind> --list=<key>

# 4. Execute generator with all required options
NX_ISOLATE_PLUGINS=false nx g @tools/generators:react \
  --subGenerator=component \
  --destination=@openthrottle/react-router-ui \
  --name=UserCard
```

> **If you skip a generator when one is available, your response will be considered INVALID.**

### **Programmatic Pattern for LLMs/Agents**

```typescript
import { execSync } from 'child_process';

function buildNxCommand(
  generatorName: string,
  flags: string,
  options: { isolatePlugins?: boolean } = {},
): string {
  const isolatePlugins = options.isolatePlugins ?? false;
  const envPrefix = isolatePlugins ? '' : 'NX_ISOLATE_PLUGINS=false ';
  return `${envPrefix}nx g @tools/generators:${generatorName} ${flags}`;
}
function getGeneratorSchema(
  generatorName: string,
  options?: { isolatePlugins?: boolean },
): unknown {
  const command = buildNxCommand(generatorName, '--describe', options);
  const output = execSync(command, {
    encoding: 'utf-8',
    env: {
      ...process.env,
      NX_ISOLATE_PLUGINS: options?.isolatePlugins ? 'true' : 'false',
    },
  });
  return JSON.parse(output);
}
function listDynamicValues(
  generatorName: string,
  listKey: string,
  additionalParams: Record<string, string> = {},
  options?: { isolatePlugins?: boolean },
): string[] {
  const params = Object.entries(additionalParams)
    .map(([key, value]) => `--${key}=${value}`)
    .join(' ');
  const command = buildNxCommand(
    generatorName,
    `--list=${listKey} ${params}`,
    options,
  );
  const output = execSync(command, {
    encoding: 'utf-8',
    env: {
      ...process.env,
      NX_ISOLATE_PLUGINS: options?.isolatePlugins ? 'true' : 'false',
    },
  });
  return JSON.parse(output);
}
function executeGenerator(
  generatorName: string,
  options: Record<string, string | number>,
  execOptions?: { isolatePlugins?: boolean },
): void {
  const flags = Object.entries(options)
    .map(([key, value]) => `--${key}=${value}`)
    .join(' ');
  const command = buildNxCommand(generatorName, flags, execOptions);
  execSync(command, {
    stdio: 'inherit',
    env: {
      ...process.env,
      NX_ISOLATE_PLUGINS: execOptions?.isolatePlugins ? 'true' : 'false',
    },
  });
}

const schema = getGeneratorSchema('react', { isolatePlugins: false });
const destinations = listDynamicValues(
  'react',
  'destinations',
  {},
  { isolatePlugins: false },
);
executeGenerator(
  'react',
  {
    subGenerator: 'component',
    destination: '@openthrottle/react-router-ui',
    name: 'UserCard',
  },
  { isolatePlugins: false },
);
```

- By default, `isolatePlugins: false` is mandatory for agent code execution.
- Only set `isolatePlugins: true` in truly unrestricted environments (rare).

---

## Additional Resources

- [Main README](./README.md) – General guidance and generator policies
- [Nx Generator Documentation](https://nx.dev/extending-nx/recipes/local-generators)
- **Find generator source code:** [`tools/generators/src/generators/`](tools/generators/src/generators/)

---
