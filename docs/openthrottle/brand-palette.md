# Cortex Brand Palette

Cortex uses a GitHub/Primer-inspired gray scale and a dedicated **brand** color with full Tailwind-style variants. Tailwind’s built-in **red** palette is left unchanged.

## Grays (GitHub/Primer-style)

- **Light mode:** Neutral scale from [Primer Primitives](https://github.com/primer/primitives) light (`neutral.0` → `neutral.13`). See [gray-mapping.md](./gray-mapping.md) for hex values and mapping to `gray-50` … `gray-950`.
- **Dark mode:** Same Tailwind step names; hex values switch to Primer dark neutrals when `prefers-color-scheme: dark` (e.g. `dark:bg-gray-100`, `dark:text-gray-500`).

## Brand color

- **Base:** `#ff0000` (brand-500).
- **Variants:** `brand-50` … `brand-950` so utilities like `text-brand-500`, `bg-brand-100`, `border-brand-200` work.
- **Tailwind red:** Unchanged; use `red-*` for semantic red (errors, destructive actions) and `brand-*` for Cortex branding.

## Usage (Tailwind)

- **Grays:** `bg-gray-100`, `text-gray-700`, `border-gray-300`, `dark:bg-gray-900`, etc.
- **Brand:** `text-brand-500`, `bg-brand-100`, `border-brand-200`, `hover:bg-brand-50`.
- **Red:** `text-red-600`, `bg-red-50` (unchanged Tailwind red).

## Where it’s wired

- **Theme:** `applications/cortex/app/styles/index.css` — `@theme` block defines `--color-gray-*`, `--color-brand-*`, and `--color-red-*`. Dark mode grays are overridden in `@media (prefers-color-scheme: dark) { @theme { ... } }`.

## References

- [Primer Primitives](https://github.com/primer/primitives) — base color tokens.
- [primer.style/foundations/color](https://primer.style/foundations/color) — Primer color system.
- [gray-mapping.md](./gray-mapping.md) — Gray scale mapping (light/dark) for Cortex.
