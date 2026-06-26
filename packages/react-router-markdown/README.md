# @openthrottle/react-router-markdown

SSR-capable Markdown renderer for OpenThrottle React Router apps. It compiles trusted CommonMark + GFM to React components via MDX (literal text, no raw HTML) so output is present in the server-rendered HTML — no client-side flash of empty content.

Main exports:

- `MarkdownRenderer` — a component that renders a Markdown `source` string, compiling synchronously during render (memoized on `source`).
- `compileMarkdown` / `compileMarkdownSync` — the underlying async/sync MDX compile helpers, plus the `CompiledMarkdown` type.

Consumed by the OpenThrottle developer app (plan/task output, notes) and `@openthrottle/react-router-docs`. Import the stylesheet (`@openthrottle/react-router-markdown/src/index.css`) and wrap rendered output so the `.markdown` styles apply.

Security boundary: input is rendered as literal text with no raw HTML and no JSX, and dangerous (`javascript:`/`data:`/etc.) link/image URL schemes are stripped. Switching to `format: 'mdx'` or adding `rehype-raw` requires a full `rehype-sanitize` pass first — see `src/utils/compileMarkdown.tsx`.

## Installation

Install with your preferred package manager (list pnpm first in this monorepo):

**pnpm:**

```bash
pnpm add @openthrottle/react-router-markdown
```

**npm:**

```bash
npm install @openthrottle/react-router-markdown
```
