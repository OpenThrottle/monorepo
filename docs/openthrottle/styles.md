# OpenThrottle developer UI: styles and theme

The **openthrottle-developer** dashboard imports a single Tailwind entry: **`applications/openthrottle-developer/app/styles.css`** (`@import 'tailwindcss'`, `@import '@openthrottle/react-router-shadcn/src/theme.css'`, `@source` globs for workspace packages).

Shared **CSS variables and Shadcn-compatible tokens** live in **`packages/react-router-shadcn/src/theme.css`** and related files in that package (see `packages/react-router-shadcn/README.md`).

## File structure (current repo)

| Location                                             | Purpose                                                                      |
| ---------------------------------------------------- | ---------------------------------------------------------------------------- |
| `applications/openthrottle-developer/app/styles.css` | App Tailwind entry, optional brand/`@utility` overrides, `@source` for scans |
| `packages/react-router-shadcn/src/theme.css`         | `:root` semantic tokens, dark mode, `@theme` mapping for Tailwind v4         |
| `packages/react-router-shadcn/src/index.css`         | Package-level CSS used by consumers                                          |

## Design reference (typography and borders)

Primer-inspired scales and border semantics are documented for copy and UX alignment:

- [primer-typography-borders.md](./primer-typography-borders.md) — typography and border token research
- [gray-mapping.md](./gray-mapping.md) — gray scale mapping

Implement using **Tailwind utilities** and variables from **`react-router-shadcn`** rather than legacy path `applications/cortex/app/styles/` (removed in consolidation).

## Shadcn UI

Theming for shared components: [docs/packages/shadcn-ui/THEMING.md](../packages/shadcn-ui/THEMING.md).
