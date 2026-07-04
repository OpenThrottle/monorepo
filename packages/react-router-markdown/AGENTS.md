# @openthrottle/react-router-markdown — agent notes

SSR-capable Markdown renderer: compiles trusted CommonMark + GFM to React components via MDX so output is present in server-rendered HTML. Two exports of note: `MarkdownRenderer` (compiles synchronously during render, memoized on `source`) and the `compileMarkdown`/`compileMarkdownSync` helpers.

**Consumed by:** `openthrottle-developer` (plan/task output, notes) and `@openthrottle/react-router-docs`.

## Layout

- [src/utils/compileMarkdown.tsx](src/utils/compileMarkdown.tsx) — the compile pipeline and the whole security boundary; read its comments before touching options.
- [src/components/MarkdownRenderer.tsx](src/components/MarkdownRenderer.tsx) — the component wrapper.
- [src/index.css](src/index.css) — `.markdown` styles; consumers import this stylesheet and wrap output so they apply.

## Invariants & gotchas

- Source-first, no build target (`__build`/`__build-package` placeholders) — see [packages/AGENTS.md](../AGENTS.md).
- **Security boundary:** input renders as literal text — no raw HTML, no JSX — and a custom rehype pass drops link/image URLs whose scheme is outside the `SAFE_URL_SCHEMES` allow-list (`http`, `https`, `mailto`, `tel`), with control-char stripping to defeat `java\tscript:` bypasses. MDX's default `normalizeUri` does **not** do this. Switching to `format: 'mdx'` or adding `rehype-raw` requires a full `rehype-sanitize` pass first.
- Input is "trusted" Markdown by contract — do not point this at raw LLM output without revisiting the boundary (the chat package deliberately uses escaped preformatted text instead).

## Pointers

- [README.md](README.md) — export list and the security-boundary summary.
