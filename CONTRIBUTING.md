# Contributing to the Monorepo

Thank you for your interest in contributing! This document provides guidelines and best practices for contributing to this monorepo.

For information about monorepo structure, organization, and project setup, see [MONOREPO.md](./MONOREPO.md).

## Project Tags

All NX projects in this monorepo must have appropriate tags. Tags enable project filtering, consistent organization, release management, and proper tooling workflows.

### Tag Types

Projects in this monorepo use four primary tag types:

1. **`name:`** - Identifies the project name
2. **`type:`** - Categorizes the project type (`application`, `package`, or `tool`)
3. **`production:`** - Indicates production readiness
4. **`technology:`** - Identifies the technology stack

### Tag Format

Tags follow the pattern `<type>:<value>`:

```json
{
  "nx": {
    "tags": [
      "name:@openthrottle/xxxxxx",
      "type:application",
      "production:true",
      "technology:react",
      "technology:react-router"
    ]
  }
}
```

### Tag Usage in Workflows

Tags are used throughout the monorepo for:

- **Release Management**: The `nx.json` release configuration uses `tag:type:application` and `tag:type:package` to determine which projects to release
- **Project Filtering**: Filter projects by technology, type, or production status
- **Task Execution**: Run tasks on specific project subsets using tag filters
- **Organization**: Group and discover related projects

### Required Tags

Every project must have:

- **`name:`** tag - The project identifier (matches package name or directory name)
- **`type:`** tag - One of `type:application`, `type:package`, or `type:tool`
- **`production:`** tag - Either `production:true` or `production:false`
- **At least one `technology:`** tag - See [Technology Tags](#technology-tags) section below

### Tag Examples

**React Router Application:**

```json
{
  "nx": {
    "tags": [
      "name:openthrottle-yyy",
      "type:application",
      "production:true",
      "technology:react",
      "technology:react-router"
    ]
  }
}
```

**NestJS API Application:**

```json
{
  "nx": {
    "tags": [
      "name:openthrottle-api",
      "type:application",
      "production:true",
      "technology:nestjs"
    ]
  }
}
```

### Tag Combinations

Projects can have multiple tags of the same type when appropriate:

- **Multiple technology tags**: Projects using multiple technologies should have all relevant `technology:` tags
- **Single type tag**: Projects should have exactly one `type:` tag
- **Single production tag**: Projects should have exactly one `production:` tag
- **Single name tag**: Projects should have exactly one `name:` tag

## Technology Tags

All NX projects in this monorepo must have appropriate technology tags. Technology tags enable project filtering, consistent organization, and proper tooling workflows.

### Quick Reference

- **Reference Document**: See [docs/monorepo/NX/tags.md](docs/monorepo/NX/tags.md) for complete tag definitions
- **Validation**: Run `pnpm nx:validate-tags` to check all projects
- **Format**: Tags follow the pattern `technology:<value>`

### Tagging Rules

1. **Always tag by primary technology**: Use the most specific tag that applies
2. **Use multiple tags when appropriate**: If a project uses multiple technologies, tag it with all relevant tags
3. **Don't duplicate**: Don't use `technology:typescript` if the project already has a framework tag (React, NestJS, etc.)
4. **Be consistent**: Use the exact tag values listed in the reference document
5. **Tag all projects**: Every project should have at least one technology tag

### Examples

**React Router Application:**

```json
{
  "nx": {
    "tags": ["technology:react", "technology:react-router", "type:application"]
  }
}
```

**TypeScript-only Package:**

```json
{
  "nx": {
    "tags": ["technology:typescript", "type:package"]
  }
}
```

**NestJS API:**

```json
{
  "nx": {
    "tags": ["technology:nestjs", "type:application"]
  }
}
```

### Validation

Before committing changes, ensure your project tags are valid:

```bash
pnpm nx:validate-tags
```

This script will:

- Identify projects missing technology tags
- Validate tag values against the reference document
- Report any inconsistencies

### Adding Tags to New Projects

When creating a new project:

1. Determine the primary technology stack
2. Consult the [technology tags reference](docs/monorepo/NX/tags.md)
3. Add appropriate `technology:*` tags to the project's `package.json` or `project.json`
4. Run `pnpm nx:validate-tags` to verify

### Updating Tags

If you need to update technology tags for an existing project:

1. Update the tags in the project's configuration file
2. Run `pnpm nx:validate-tags` to verify
3. Ensure the tags accurately reflect the project's technology stack

## General Guidelines

- **Code style and preferences:** Follow the coding conventions defined in [`.cursor/rules/`](.cursor/rules/). See [.cursor/rules/README.md](.cursor/rules/README.md) for the full style guide: `coding/` holds TypeScript/JS and structure rules; `commands/` holds rules for OpenThrottle (OT), GitHub, and agents. This is the single place to document and evolve how we write code.
- Use conventional commits for commit messages
- Ensure all tests pass before submitting changes
- Update documentation when adding new features
- See [MONOREPO.md](./MONOREPO.md) for project structure and organization guidelines

### Knip and public exports

When you add or keep an export that is part of a **package public API** (see `package.json` → `exports`) or a documented cross-workspace helper, tag it with JSDoc **`@publicApi`** so Knip does not report or auto-remove it. Component prop types (`*Props`, `*Options`) do not need this tag; intentional `export` on those types is expected. See [docs/monorepo/Knip.md](docs/monorepo/Knip.md) for the full report-vs-fix workflow. Run **`pnpm nx run monorepo:knip`** for reports only—do not run **`knip --fix-type exports`** on application UI. **`knip --fix-type dependencies`** is optional and only after reviewing the `package.json` diff.

## Additional Resources

- **[MONOREPO.md](./MONOREPO.md)**: Comprehensive monorepo structure, organization, and contribution guidelines
- **[Technology Tags Reference](docs/monorepo/NX/tags.md)**: Complete technology tag definitions
- **[NX Documentation](https://nx.dev/)**: Official NX documentation
- **[NX Tags Documentation](https://nx.dev/concepts/more-concepts/tags)**: NX tags and filtering

## Questions?

If you have questions about tags, project structure, or other contribution guidelines, please:

- Check the [MONOREPO.md](./MONOREPO.md) for structure and organization questions
- Review the [technology tags reference](docs/monorepo/NX/tags.md) for technology tag questions
- Review existing projects for examples
- Open an issue for clarification
