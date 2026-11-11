# @openthrottle/react-router-cms-ui — agent notes

Content-block components (Heading, Hero, Card, Image, Carousel, Wysiwyg, …) that OpenThrottle CMS
pages are assembled from, ported from the RocketCMS library
(`visormatt/monorepo` → `packages/rocketcms/library`). Built on
`@openthrottle/react-router-shadcn` primitives.

**Consumed by:** `@openthrottle/react-router-cms-core` (the component registry) and
`openthrottle-cms`. Its committed [schemas/](schemas/) are read by the CMS server (OT plan
`a608869b`).

## Layout

- [src/index.ts](src/index.ts) — public API. Every export carries `@public`.
- [src/components/](src/components/) — one PascalCase `.tsx` per content block (Button, Card,
  Carousel, Heading, Hero, Image, Layout, Link, Tweet, Wysiwyg), scaffolded with
  `@tools/generators:react` (`--destination=@openthrottle/react-router-cms-ui`).
- [src/types.ts](src/types.ts) — `CmsComponentDebug`, the shape of every component's `debug` static.
- [src/data/](src/data/) — copy (`data.copy.ts`) and lookup tables the components read (button
  sizes/variants, card icons, heading tags, Wysiwyg descendant classes). Not exported.
- [schemas/](schemas/) — **generated**: one `<Block>.schema.json` (JSON Schema draft 7) per block
  plus `manifest.json` (`typename`, content-hash `version`, `file`). Never hand-edit; regenerate
  with `pnpm nx run @openthrottle/react-router-cms-ui:cms-schemas:write`. CI runs
  `cms-schemas:check` and fails on drift.

## Invariants & gotchas — do not "clean these up"

- **Prop doc-comment tags are a JSON Schema contract.** `scripts/generate-cms-schemas.ts` turns
  each block's `<Name>Props` into `schemas/<Name>.schema.json`, so the tags stay even where the
  repo's "JSDoc only when not self-evident" rule would drop them:
  - `@description` → `description`; `@default` → `default`, parsed as JSON (`"md"`, `[]`, `{}`),
    non-JSON text such as HTML kept as a string. Keep each `@default` equal to the runtime default,
    and valid against the prop's type — a spec in cms-core validates every block's defaults.
  - `@cmsWidget <name>` (`className`, `children`, `wysiwyg`, `color`, `image`, `json`, `link`) →
    the custom `x-cms-widget` keyword beside the standard `type` the TypeScript type yields. It
    replaced RocketCMS's `@TJS-type`, whose widget-in-`type` is not valid JSON Schema; the
    generator rejects a leftover `@TJS-type`.
  - `@maxItems`, `@minItems`, `@maxLength`, `@minLength`, `@maximum`, `@minimum`, `@format`,
    `@pattern` pass through as the same-named keywords.
  - Prefer string-literal unions for variant props — they become schema enums. Types with no
    mapping (other unions, functions, objects with named members) fail the generator.
- **Only a props interface's own members are editor fields.** Members it inherits
  (`ButtonProps extends Pick<ButtonHTMLAttributes, 'disabled' | 'name' | 'value'>`) never reach the
  schema, and every schema is `additionalProperties: false`. A prop the editor should set must be
  declared in the interface body.
- **A block is an index export with a `debug` static**, paired with an exported `<Name>Props`. That
  is how the generator discovers blocks — there is no list to update. A new block gets a schema on
  the next `cms-schemas:write`; a `debug` static without a `<Name>Props` fails it.
- **Props the CMS may omit stay `?:`** (or admit `undefined`): the generator derives `required`
  from optionality, and a `children` widget is never required (children come from the fragment
  tree). Optional means "has a `@default`".
- **Every component has a `debug` static** (`X.debug = { className } satisfies CmsComponentDebug`),
  added by hand after the generator runs. The CMS applies `debug.className` in debug mode to show
  block bounds. `className: undefined` means "nothing extra". Lint accepts the static as-is — no
  rule override exists or is needed.
- **HTML props are trusted.** `Wysiwyg.html` and `Tweet.tweet` render with
  `dangerouslySetInnerHTML` and no client-side sanitizer, deliberately: the CMS server that supplies
  them owns sanitization. Never feed user-typed input to them directly.
- `components/**` is held to `openthrottle/component-primitive-shape` at `error` and the 210-line
  cap (see [eslint.config.ts](eslint.config.ts)).
- Source-first, no build target — see [packages/AGENTS.md](../AGENTS.md).

## Pointers

- [README.md](README.md) — human-facing overview and usage.
- [../AGENTS.md](../AGENTS.md) — parent-tier conventions (package layout, `@public` tags, source-first pattern).
