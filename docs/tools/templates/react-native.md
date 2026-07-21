# React Native generator (not in this workspace)

The `@tools/generators` package in this repo registers **`folders`**, **`nestjs`**, **`package`**, **`react`**, and **`react-router`** only. See `tools/generators/generators.json`.

There is **no** `react-native` generator registered here today, so commands like `nx g @tools/generators:react-native` will fail.

## What to do instead

1. List what exists:

   ```bash
   NX_ISOLATE_PLUGINS=false nx list @tools/generators
   ```

2. Use **`react`** for shared UI in `@openthrottle/*` packages (see [react.md](./react.md)) and **`react-router`** for React Router apps under `applications/` (see [react-router.md](./react-router.md)).

3. If React Native scaffolding is added later, the repo should register a generator in `generators.json` and document `--list=targets` (or equivalent) for valid destinations; organization scopes should match the package generator (`@openthrottle`, `@tools` per [package.md](./package.md)).
