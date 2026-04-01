# Cortex app styles: structure and usage

Overview of `applications/cortex/app/styles/`: typography and border utilities, theme tokens, and how they align with Tailwind and Shadcn UI.

## File structure

| File            | Purpose                                                                              |
| --------------- | ------------------------------------------------------------------------------------ |
| `index.css`     | Tailwind entry; `@theme` (grays, semantic colors, Shadcn vars); light/dark overrides |
| `base.css`      | Base HTML/body and reduced-motion                                                    |
| `layers.css`    | `@layer components`: typography and border utility classes                           |
| `scrollbar.css` | Scrollbar styling                                                                    |

Typography and border design tokens are documented in [primer-typography-borders.md](./primer-typography-borders.md). Gray scale: [gray-mapping.md](./gray-mapping.md).

## Typography

### Heading scale

Component classes in `layers.css` (Primer-inspired):

| Class                     | Size            | Use             |
| ------------------------- | --------------- | --------------- |
| `.heading-1`              | 2rem            | Page title      |
| `.heading-2`              | 1.25rem         | Section heading |
| `.heading-3`–`.heading-6` | 1rem → 0.875rem | Subheadings     |

All use semantic color `--color-color-copy` so they follow light/dark.

### Body / copy

| Class             | Use                                             |
| ----------------- | ----------------------------------------------- |
| `.copy-primary`   | Default body (1rem, normal weight)              |
| `.copy-secondary` | Secondary text (0.875rem, copy-dark color)      |
| `.copy-muted`     | Muted/caption text (0.875rem, copy-light color) |

Use semantic markup (e.g. `<h1 class="heading-1">`) and these classes for styling.

## Borders

| Class              | Use                                          |
| ------------------ | -------------------------------------------- |
| `.border-default`  | Main borders (cards, inputs, dividers)       |
| `.border-muted`    | Lighter borders, subtle separation           |
| `.border-emphasis` | Stronger borders, emphasis or selected state |

Combine with Tailwind `border` for width, e.g. `border border-default`. Colors use semantic tokens and respond to `prefers-color-scheme: dark`.

## Light / dark mode

- Semantic colors (`--color-color-copy`, `--color-color-border*`, etc.) are defined in `index.css` and overridden in `@media (prefers-color-scheme: dark)`.
- Typography and border utilities use these tokens, so they automatically follow system light/dark.
- Future class-based dark (e.g. `.dark` on `<html>`) can mirror the same overrides; see comment in `layers.css`.

## Tailwind

- Theme colors are in `@theme` in `index.css` (e.g. `--color-color-copy`, `--color-gray-*`). Use Tailwind utilities like `text-color-copy`, `bg-color-background`, `border-color-border`.
- Component-layer classes in `layers.css` are for headings and copy when you want a single class instead of composing utilities.

## Shadcn UI

- `index.css` defines Shadcn-compatible variables on `:root` (`--background`, `--foreground`, `--border`, `--muted`, `--primary`, `--radius`, etc.) that map to cortex semantic colors.
- When you add Shadcn components, they will use these variables; light/dark follows our `@theme` overrides.
- See [docs/packages/shadcn-ui/THEMING.md](../packages/shadcn-ui/THEMING.md) for Shadcn theming.

## When to use which

- **Headings:** Prefer `.heading-1` … `.heading-6` for page structure; keep semantic order (h1 → h6).
- **Body text:** `.copy-primary` for main content, `.copy-secondary` for supporting text, `.copy-muted` for captions or de-emphasized copy.
- **Borders:** `.border-default` for most UI; `.border-muted` for light separation; `.border-emphasis` for focus or selected state.
- **Component-level styling:** Use Tailwind utilities and/or Shadcn components; cortex tokens and Shadcn vars keep everything consistent.
