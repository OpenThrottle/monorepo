# Troubleshooting Guide

Common issues and solutions when using `@tools/generators` generators.

## Error Handling

### Common Error Scenarios

#### Generator Not Found

```bash
nx g @tools/generators:invalid-generator --describe
# Error: Could not find generator "invalid-generator"
```

**Solution:** Use `nx list @tools/generators` to see available generators.

#### Missing Required Fields

```bash
nx g @tools/generators:react --subGenerator=component --name=Button
# Error: Missing required field "destination"
```

**Solution:** Check `--describe` output for required fields, or use `--interactive` to get prompted.

#### Invalid Field Values

```bash
nx g @tools/generators:nestjs --subGenerator=application --name=MyAPI --port=3000
# Error: Port must be between 4000-9999
```

**Solution:** Check field constraints in `--describe` output.

#### Invalid List Key

```bash
nx g @tools/generators:react --list=invalid
# Error: Unknown --list value "invalid"
```

**Solution:** Check `--describe` output for available `list` keys.

### Error Recovery Strategies

1. **Use `--describe`**: Always check generator schema before execution
2. **Use `--list`**: Verify dynamic values exist before using them
3. **Use `--interactive`**: Fall back to interactive mode if unsure about options
4. **Check Nx Project Graph**: Verify target applications/packages exist in workspace

## Common Issues

### Issue: "Generator not found"

**Possible Causes:**

- Generator name typo
- Generator not registered in `generators.json`
- Package not installed

**Solution:**

```bash
# Verify available generators
nx list @tools/generators

# Check generators.json
cat tools/generators/generators.json
```

### Issue: "Schema not found" or "Describe fails"

**Possible Causes:**

- `schema.json` file missing in generator directory
- Schema file malformed JSON
- Generator factory not properly exporting

**Solution:**

- Check `tools/generators/src/generators/<generator-name>/schema.json` exists
- Verify JSON is valid
- Check generator factory exports correctly

### Issue: "List key not found"

**Possible Causes:**

- Invalid `--list` key
- List key requires additional parameters (e.g., `--application`)

**Solution:**

```bash
# Get available list keys from describe
nx g @tools/generators:remix --describe
# Check the "list" object in the output

# Some list keys require additional params
nx g @tools/generators:remix --list=componentFolders --application=openthrottle-developer
```

### Issue: "Target not found" or "Invalid destination"

**Possible Causes:**

- Target application/package doesn't exist
- Target doesn't have required Nx tags
- Typo in target name

**Solution:**

```bash
# List valid targets
nx g @tools/generators:react --list=destinations
nx g @tools/generators:remix --list=applications

# Verify target exists in workspace
nx show project <target-name>
```

### Issue: "Validation failed" for name pattern

**Possible Causes:**

- Name doesn't match required pattern
- Name too short (min 3 chars)
- Wrong naming convention (e.g., using kebab-case for component)

**Solution:**

- Check pattern requirements in `--describe` output
- Use appropriate naming convention (PascalCase for components, kebab-case for services)
- Ensure minimum length requirements are met

### Issue: Generator works interactively but not programmatically

**Possible Causes:**

- Missing required options
- Options format incorrect
- Generator not handling non-interactive mode

**Solution:**

- Check generator implementation supports non-interactive mode
- Verify all required options are provided
- Compare with interactive prompts to ensure all fields covered

### Issue: Multiple components not generating

**Possible Causes:**

- Comma-separated names not supported for this generator
- Name validation too strict

**Solution:**

- Check generator schema for comma-separated support
- Verify name pattern allows multiple values
- Generate components individually if needed

### Issue: "Failed to start plugin worker"

**Possible Causes:**

- Nx plugin worker cannot spawn in sandboxed environments
- Plugin isolation conflicts with environment restrictions
- Node version mismatch (requires Node 24+)
- VS Code/Cursor terminal settings not configured

**Solution:**

This workspace is configured to automatically set `NX_ISOLATE_PLUGINS=false` in VS Code/Cursor terminals (see `.vscode/settings.json`). If you're still seeing this error:

1. **Verify terminal environment**: Check that `NX_ISOLATE_PLUGINS=false` is set in your terminal:

   ```bash
   echo $NX_ISOLATE_PLUGINS  # Should output "false"
   ```

2. **If not set, disable plugin isolation manually** by prefixing commands with `NX_ISOLATE_PLUGINS=false`:

```bash
# For generator execution
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:remix \
  --subGenerator=component \
  --application=openthrottle-website \
  --folder=routing/sandbox/components \
  --name=ExampleAgentComponent

# For describe/list operations
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:remix --describe
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:remix --list=applications
```

**Note**: This workaround is commonly needed in:

- Sandboxed execution environments (CI/CD, containers)
- Restricted process spawning environments
- When plugin worker processes cannot be created

**For more details**, see [NX_ISOLATE_PLUGINS Documentation](./NX_ISOLATE_PLUGINS.md) which explains:

- What `NX_ISOLATE_PLUGINS` does
- Why it's needed for sandboxed environments
- Performance implications
- Configuration options

**Alternative**: Set as environment variable for the session:

```bash
export NX_ISOLATE_PLUGINS=false
pnpm nx g @tools/generators:remix --subGenerator=component ...
```

## Getting Help

1. **Check the generator schema**: `nx g @tools/generators:<generator> --describe`
2. **Review generator-specific docs**: See [Generator References](AGENT_USAGE.md#generator-references)
3. **Check Nx project graph**: `nx graph`
4. **Verify workspace structure**: Ensure target applications/packages exist
