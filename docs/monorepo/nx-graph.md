# NX Graph - Dependency Visualization Guide

## Overview

NX Graph is a powerful tool for visualizing and understanding the dependency relationships within our monorepo. It helps developers understand how projects relate to each other, identify dependencies, and detect potential issues like circular dependencies.

## Running NX Graph Locally

### Interactive Browser View

The most common way to use nx graph is through the interactive browser interface:

```bash
# Open the interactive graph in your browser
nx graph

# Open without auto-opening browser (useful for CI/CD)
nx graph --open=false

# Watch for changes and auto-update
nx graph --watch
```

The interactive view provides:

- Visual representation of all projects and their dependencies
- Click-to-explore functionality
- Search and filter capabilities
- Zoom and pan controls

### Command Line Output

For quick checks or scripting, you can output the graph to stdout:

```bash
# Print the graph structure to terminal
nx graph --print

# Output to a JSON file
nx graph --file=graph.json

# Output to an HTML file (static visualization)
nx graph --file=dep-graph.html
```

### Server Options

Customize the server behavior:

```bash
# Bind to a specific host and port
nx graph --host=0.0.0.0 --port=4211

# Disable watch mode (useful for one-time generation)
nx graph --watch=false
```

## Understanding the Dependency Graph Visualization

### Graph Elements

- **Nodes**: Represent individual projects (applications, libraries, tools)
- **Edges/Arrows**: Show dependency relationships
  - Arrow direction indicates dependency flow (A → B means A depends on B)
  - Different colors may indicate different types of dependencies

### Project Types

Projects in the graph are typically categorized as:

- **Applications**: Runnable projects (e.g., `openthrottle`, `openthrottle-server`)
- **Libraries**: Shared code packages (e.g., `@openthrottle/react-router-ui`, `@openthrottle/nestjs-graphql`)
- **Tools**: Build tools and generators (e.g., `@tools/generators`)

### Dependency Types

NX tracks several types of dependencies:

- **Direct dependencies**: Projects explicitly imported in code
- **Implicit dependencies**: Dependencies inferred from shared configuration
- **Task dependencies**: Dependencies between build/test tasks

## Common Use Cases

### Finding Dependencies of a Project

To see what a project depends on:

```bash
# Focus on a specific project and its dependencies
nx graph --focus=openthrottle

# This shows openthrottle and all projects it depends on (ancestors)
```

### Finding What Depends on a Project

To see what projects depend on a specific library:

```bash
# Focus on a project to see its dependents
nx graph --focus=@openthrottle/react-router-ui

# This shows the library and all projects that depend on it (descendants)
```

### Understanding Project Relationships

```bash
# View the full graph to understand overall structure
nx graph

# Group projects by folder for better organization
nx graph --groupByFolder
```

### Checking Affected Projects

When working with git changes, see what's affected:

```bash
# Show affected projects based on git changes
nx graph --affected

# Compare specific commits
nx graph --base=main --head=HEAD --affected

# Show affected by uncommitted changes
nx graph --uncommitted --affected
```

### Detecting Circular Dependencies

Circular dependencies are problematic and can cause build issues. The graph visualization helps identify them:

```bash
# View the full graph and look for circular paths
nx graph

# Focus on a project to see if it has circular dependencies
nx graph --focus=<project-name>
```

Look for paths that form loops in the visualization.

## Filtering and Focusing on Specific Projects

### Focus on a Single Project

```bash
# Show only a specific project and its dependencies/dependents
nx graph --focus=openthrottle-server
```

This filters the graph to show:

- The focused project
- All projects it depends on (ancestors)
- All projects that depend on it (descendants)

### Exclude Projects

```bash
# Exclude specific projects from the graph
nx graph --exclude=@tools/*,test-*

# Multiple exclusions
nx graph --exclude=@tools/* --exclude=@openthrottle/*
```

### Group by Folder

```bash
# Organize projects by their folder structure
nx graph --groupByFolder
```

This groups projects visually by their directory location, making it easier to understand the monorepo structure.

## Task Graph View

NX can also visualize task dependencies:

```bash
# View task graph instead of project graph
nx graph --view=tasks

# Focus on specific targets
nx graph --view=tasks --targets=build,test
```

This shows how tasks depend on each other, which is useful for understanding build pipelines.

## Examples

### Example 1: Understanding a New Package's Dependencies

When adding a new package, understand what it should depend on:

```bash
# First, see what similar packages depend on
nx graph --focus=@openthrottle/react-router-ui

# Then check what depends on it to understand usage patterns
nx graph --focus=@openthrottle/react-router-ui
```

### Example 2: Refactoring Impact Analysis

Before refactoring a shared library:

```bash
# See all projects that depend on the library
nx graph --focus=@openthrottle/react-router-shadcn

# This helps identify what might break during refactoring
```

### Example 3: Generating Static Documentation

Create a static HTML file for documentation:

```bash
# Generate static HTML visualization
nx graph --file=docs/nx/dependency-graphs/dependency-graph.html --watch=false --open=false
```

### Example 4: CI/CD Integration

Generate graph for CI/CD pipelines:

```bash
# Generate JSON for programmatic analysis
nx graph --file=graph.json --print=false --watch=false --open=false

# Generate HTML artifact
nx graph --file=dep-graph.html --watch=false --open=false
```

## Generated snapshots — mostly not running today

Two mechanisms can produce a static graph. **Neither runs automatically**, and that is deliberate —
both are priced in [ci-cost.md](./ci-cost.md).

| mechanism                                                        | state                                                                                                                                                                                                                      |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `nx-dependency-graph` job in `continuous-integration.yml`        | **`workflow_dispatch` only.** Uploads an artifact; commits nothing. This is the one you can actually run — trigger the CI workflow manually.                                                                               |
| `.github/workflows/dependency-graph-scheduled.yml` (weekly cron) | **Disabled (`if: false`).** It COMMITS each snapshot into `docs/nx/dependency-graphs/`, and every snapshot grows the repo, raising clone cost for every other workflow. Do not re-enable it without reading the cost note. |

So `docs/nx/dependency-graphs/` holds **no snapshots** — only a pointer README. Historical
graph-over-time tracking does not exist; if you need it, generate locally
(`nx graph --file=…`, § Example 3) or dispatch the CI job and download the artifact.

## Tips and Best Practices

1. **Regular Visualization**: Run `nx graph` regularly to stay aware of dependency changes
2. **Before Refactoring**: Always check the graph before major refactoring to understand impact
3. **New Dependencies**: Review the graph after adding new dependencies to ensure no circular dependencies
4. **Documentation**: Generate static graphs periodically for documentation purposes
5. **Team Onboarding**: Use the graph to help new team members understand the monorepo structure

## Troubleshooting

### Graph Not Updating

If the graph seems stale:

```bash
# Clear NX cache
nx reset

# Regenerate graph
nx graph
```

### Performance Issues

For large monorepos, use focus to narrow the view:

```bash
# Instead of viewing everything, focus on what you need
nx graph --focus=<specific-project>
```

### Missing Dependencies

If dependencies aren't showing up:

1. Ensure projects are properly configured in `nx.json` or `project.json`
2. Check that imports are correctly resolved
3. Run `nx reset` to clear cached dependency information

## Additional Resources

- [NX Dependency Graph Documentation](https://nx.dev/nx/dep-graph)
- [Understanding NX Project Graph](https://nx.dev/concepts/project-graph)
- [NX Affected Commands](https://nx.dev/nx/dep-graph#affected)
