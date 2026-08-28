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

Implement using **Tailwind utilities** and variables from **`react-router-shadcn`** rather than legacy path `applications/openthrottle/app/styles/` (removed in consolidation).

## The palette

A GitHub/Primer-inspired gray scale plus a dedicated **brand** color with full Tailwind-style
variants. Tailwind's built-in **red** palette is left unchanged for semantic reds.

- **Grays.** Light mode is the neutral scale from [Primer Primitives](https://github.com/primer/primitives)
  (`neutral.0` → `neutral.13`); dark mode keeps the same Tailwind step names and switches the hex
  values to Primer dark neutrals under `prefers-color-scheme: dark`.
- **Brand.** `--brand` is `hsl(0, 100%, 50%)` (`#ff0000`) in `theme.css`, exposed as `brand-50` …
  `brand-950` so `text-brand-500`, `bg-brand-100`, `border-brand-200` all work. It also drives
  `--accent` and the default ring color.
- **Red stays red.** Use `red-*` for semantic red (errors, destructive actions) and `brand-*` for
  product branding. Do not overload one for the other.

Typical usage: `bg-gray-100`, `text-gray-700`, `border-gray-300`, `dark:bg-gray-900`;
`text-brand-500`, `hover:bg-brand-50`; `text-red-600`, `bg-red-50`.

Apps override tokens locally where they need to — e.g. `--brand` in
`applications/openthrottle-developer/app/styles.css` or
`applications/openthrottle-admin/app/styles.css`.

## Shadcn UI

Theming for shared components: [react-router-shadcn/docs/Theming.md](../../packages/react-router-shadcn/docs/Theming.md).

## References

- [Primer Primitives](https://github.com/primer/primitives) — base color tokens.
- [primer.style/foundations/color](https://primer.style/foundations/color) — Primer color system.
