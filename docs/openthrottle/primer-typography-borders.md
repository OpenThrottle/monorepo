# GitHub/Primer typography and border patterns

Research for Cortex app styles. Source: [Primer Primitives](https://github.com/primer/primitives) (`src/tokens/base/typography/typography.json5`, `src/tokens/functional/color/borderColor.json5`) and [Primer foundations – Typography](https://primer.style/foundations/typography).

## Typography

### Overview

- **Units:** Primer uses **rem** for font sizes (accessible with browser zoom).
- **Line height:** Unitless values; align to 4px grid. Use line-height tokens, not arbitrary values.
- **Weight:** Use CSS variables / tokens for `font-weight`; avoid raw numbers in UI.
- **Semantic markup:** Use heading levels (h1–h6) with styles; do not reorder headings for visual hierarchy only.

### Base typography tokens (Primer)

| Token                     | Value           | Description                           |
| ------------------------- | --------------- | ------------------------------------- |
| **Size**                  |                 |                                       |
| `text.size.xs`            | 0.75rem (12px)  | Captions, compact UI                  |
| `text.size.sm`            | 0.875rem (14px) | Default body/UI                       |
| `text.size.md`            | 1rem (16px)     | Large body, small titles              |
| `text.size.lg`            | 1.25rem (20px)  | Medium titles, subtitles              |
| `text.size.xl`            | 2rem (32px)     | Large titles, page headings           |
| `text.size.2xl`           | 2.5rem (40px)   | Display/hero                          |
| **Weight**                |                 |                                       |
| `text.weight.light`       | 300             |                                       |
| `text.weight.normal`      | 400             |                                       |
| `text.weight.medium`      | 500             |                                       |
| `text.weight.semibold`    | 600             |                                       |
| **Line height**           |                 |                                       |
| `text.lineHeight.tight`   | 1.25            | Labels, badges, single-line; not body |
| `text.lineHeight.snug`    | 1.375           | Display, headings, short multi-line   |
| `text.lineHeight.normal`  | 1.5             | Default body and UI                   |
| `text.lineHeight.relaxed` | 1.625           | Long-form, smaller text               |
| `text.lineHeight.loose`   | 1.75            | Footnotes, high readability           |

### Heading scale (mapping for Cortex)

Map Primer sizes to a heading scale (h1–h6):

- **h1:** xl or 2xl (page title)
- **h2:** lg or xl (section)
- **h3:** md or lg
- **h4–h6:** md / sm with weight/line-height as needed

Body/copy: primary = default text color (e.g. `color-copy`); secondary/muted = subdued (e.g. `color-copy-light` / `color-copy-dark` per gray-mapping).

### Light vs dark

Foreground/background and semantic colors (e.g. `fgColor`, `bgColor` in Primer) have light and dark values. Cortex already uses `@media (prefers-color-scheme: dark)` in `index.css` for gray and semantic colors; typography utilities should use semantic colors (e.g. `color-copy`) so they follow light/dark automatically.

---

## Borders

### Semantic border tokens (Primer)

| Token        | Light (base)                   | Dark override                | Usage                                      |
| ------------ | ------------------------------ | ---------------------------- | ------------------------------------------ |
| **default**  | `base.color.neutral.6`         | `neutral.7`                  | Cards, inputs, dividers; main border color |
| **muted**    | Same as default, **alpha 0.7** | (overrides per mode)         | Subtle borders, light dividers             |
| **emphasis** | `base.color.neutral.8`         | (overrides in high-contrast) | Stronger border, emphasis, selected        |
| **disabled** | `neutral.8` @ 0.1 alpha        | (overrides per mode)         | Disabled elements only                     |

Additional: `transparent`, `translucent` for overlays.

### Cortex mapping

- **Default:** `color-border` (already in `index.css`: light `#d1d9e0`, dark from gray scale).
- **Muted (lighter):** `color-border-light` — default with reduced opacity or lighter gray (e.g. light: `#eff2f5`, dark: one step lighter than default).
- **Emphasis (darker):** `color-border-dark` — stronger separator (e.g. light: `#818b98`, dark: align to neutral.8).

See `docs/openthrottle/gray-mapping.md` for gray scale; border colors should reference the same scale so light/dark stay consistent.

### When to use which

- **Default:** Most borders (cards, inputs, dividers).
- **Muted:** Secondary separation, subtle outlines.
- **Emphasis:** Focused or selected state, strong dividers.

---

## References

- Primer Primitives: <https://github.com/primer/primitives>
- Primer typography foundations: <https://primer.style/foundations/typography>
- Primer design tokens (color, typography, spacing): <https://primer.style/foundations>
- Cortex gray mapping: `docs/openthrottle/gray-mapping.md`
- Cortex app theme: `applications/cortex/app/styles/index.css`
