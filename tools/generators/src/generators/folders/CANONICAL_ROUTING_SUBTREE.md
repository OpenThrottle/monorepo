# Canonical subtree: `@tools/generators:folders`

Source of truth: template tree under `files/__name__/` and `generator.ts` / `schema.json`.

## Generator options (machine contract)

| Option        | Required | Description                                                                       |
| ------------- | -------- | --------------------------------------------------------------------------------- |
| `application` | Yes      | Target Nx application project name (`--list=applications`).                       |
| `folder`      | Yes      | Area under `app/`: **`routing`** or **`services`**.                               |
| `name`        | Yes      | Route/service segment: slug, **≥ 3** chars, pattern `^[a-z0-9]+(?:-[a-z0-9]+)*$`. |

Interactive fallbacks: `--interactive` when `application`, `folder`, or `name` is omitted.

List keys (no files written): `--list=applications`, `--list=folders`.

Introspection: `--describe` emits schema metadata (same enums as above).

## Destination path

Generated output root:

```text
applications/<application>/app/<folder>/<name>/
```

- `<folder>` is literally `routing` or `services`.
- `<name>` is the slug passed to `--name`.

For **routing** audits, compare against everything under:

```text
applications/<application>/app/routing/
```

Each **child folder** of `routing/` (each route slug directory) should align with the subtree below.

## Canonical directory layout per `<name>/`

Relative to `applications/<application>/app/<folder>/<name>/`:

```text
components/
components/__tests__/
config/
config/__tests__/
data/
data/__tests__/
hooks/
hooks/__tests__/
utils/
utils/__tests__/
```

The generator also writes non-placeholder files at this level:

- `types.ts`
- `config/defaults.ts`
- `utils/formatters.ts`
- `utils/parsers.ts`

And `.gitkeep` only under each `*/__tests__/` directory when those dirs would otherwise be empty.

## Deterministic checklist (directories only)

For a single route slug directory `<name>`, these paths must exist (order does not matter):

1. `components`
2. `components/__tests__`
3. `config`
4. `config/__tests__`
5. `data`
6. `data/__tests__`
7. `hooks`
8. `hooks/__tests__`
9. `utils`
10. `utils/__tests__`

## Services folder

The same template is used for `--folder=services`; only the parent segment changes (`app/services/<name>/` instead of `app/routing/<name>/`). The per-`<name>/` subtree is identical.
