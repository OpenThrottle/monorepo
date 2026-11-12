# @openthrottle/react-router-cms-ui

Content-block React components for OpenThrottle CMS pages — headings, heroes, cards, images, a
carousel, rich-text (WYSIWYG) blocks and more — built on `@openthrottle/react-router-shadcn`.
Ported from the RocketCMS library.

Each component's props carry `@default` / `@description` / `@cmsWidget` doc-comment tags that are
generated into the committed JSON Schemas under `schemas/` (one per block, for the CMS prop editor
and server-side validation), and a static `debug` property the CMS uses to outline blocks in debug
mode. Regenerate with `pnpm nx run @openthrottle/react-router-cms-ui:cms-schemas:write`.

## Installation

Install with your preferred package manager (list pnpm first in this monorepo):

**pnpm:**

```bash
pnpm add @openthrottle/react-router-cms-ui
```

**npm:**

```bash
npm install @openthrottle/react-router-cms-ui
```

## Usage

```tsx
import { Hero, Wysiwyg } from '@openthrottle/react-router-cms-ui';

<Hero
  heading="A custom CMS"
  highlight="using your code"
  subheading="Build, ship, and iterate on your content with ease."
/>;

// `html` must already be sanitized by the server that supplies it.
<Wysiwyg html={page.body} />;

// Debug mode: each component exposes the classes to add while editing.
<Hero className={cn(isDebug && Hero.debug.className)} {...props} />;
```

The consuming app's Tailwind setup must scan this package's `src/` — the components ship Tailwind
classes, not a stylesheet.

## Development

```bash
pnpm nx run @openthrottle/react-router-cms-ui:lint
pnpm nx run @openthrottle/react-router-cms-ui:typecheck
pnpm nx run @openthrottle/react-router-cms-ui:test
```
