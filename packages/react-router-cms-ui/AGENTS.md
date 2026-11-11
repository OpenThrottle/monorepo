# @openthrottle/react-router-cms-ui — agent notes

Content-block components (Heading, Hero, Card, Image, Carousel, Wysiwyg, …) that OpenThrottle CMS
pages are assembled from, ported from the RocketCMS library
(`visormatt/monorepo` → `packages/rocketcms/library`). Built on
`@openthrottle/react-router-shadcn` primitives.

**Consumed by:** nothing yet — `openthrottle-cms` wiring is follow-up plan `57b7cad8`; JSON Schema
generation from the prop tags is follow-up plan `a608869b`.

## Layout

- [src/index.ts](src/index.ts) — public API. Every export carries `@public`.
- [src/components/](src/components/) — one PascalCase `.tsx` per content block (Button, Card,
  Carousel, Heading, Hero, Image, Layout, Link, Tweet, Wysiwyg), scaffolded with
  `@tools/generators:react` (`--destination=@openthrottle/react-router-cms-ui`).
- [src/types.ts](src/types.ts) — `CmsComponentDebug`, the shape of every component's `debug` static.
- [src/data/](src/data/) — copy (`data.copy.ts`) and lookup tables the components read (button
  sizes/variants, card icons, heading tags, Wysiwyg descendant classes). Not exported.

## Invariants & gotchas — do not "clean these up"

- **Prop doc-comment tags are a JSON Schema contract.** Every props interface member carries
  `@default`, `@description` and `@TJS-type` (plus `@link` where relevant). The CMS prop editor's
  JSON Schemas are generated from them, so they stay even where the repo's "JSDoc only when not
  self-evident" rule would drop them. Keep each `@default` equal to the component's runtime default.
  Prefer string-literal unions for variant props — they become schema enums.
- **Props the CMS may omit stay `?:`**, against the repo's usual `T | undefined` preference: the
  schema generator derives `required` from optionality, so `className: string | undefined` would
  wrongly make every block's `className` required in the editor. Optional means "has a `@default`".
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
