# GitHub/Primer Gray → Tailwind Scale (50–950)

Research mapping for OpenThrottle brand palette. Source: [Primer Primitives](https://github.com/primer/primitives) base color tokens (`src/tokens/base/color/light/light.json5`, `dark/dark.json5`).

## Light mode (default)

Primer light `neutral` scale (0 = white → 13 = black). Mapped to Tailwind `gray-*` (50 = lightest, 950 = darkest):

| Tailwind | Hex       | Primer ref         |
| -------- | --------- | ------------------ |
| gray-50  | `#ffffff` | neutral.0          |
| gray-100 | `#f6f8fa` | neutral.1          |
| gray-200 | `#eff2f5` | neutral.2          |
| gray-300 | `#e6eaef` | neutral.3          |
| gray-400 | `#e0e6eb` | neutral.4          |
| gray-500 | `#dae0e7` | neutral.5          |
| gray-600 | `#d1d9e0` | neutral.6          |
| gray-700 | `#c8d1da` | neutral.7          |
| gray-800 | `#818b98` | neutral.8          |
| gray-900 | `#59636e` | neutral.9          |
| gray-950 | `#1f2328` | neutral.13 (black) |

Intermediate Primer steps 10–12 (`#454c54`, `#393f46`, `#25292e`) are available for semantic use; Tailwind uses 11 steps so 950 uses black.

## Dark mode

Primer dark `neutral` scale (0 = black → 13 = white). Mapped so Tailwind step names keep the same meaning (50 = lightest gray, 950 = darkest):

| Tailwind | Hex       | Primer ref |
| -------- | --------- | ---------- |
| gray-50  | `#f0f6fc` | neutral.12 |
| gray-100 | `#d1d7e0` | neutral.11 |
| gray-200 | `#b7bdc8` | neutral.10 |
| gray-300 | `#9198a1` | neutral.9  |
| gray-400 | `#656c76` | neutral.8  |
| gray-500 | `#3d444d` | neutral.7  |
| gray-600 | `#2f3742` | neutral.6  |
| gray-700 | `#2a313c` | neutral.5  |
| gray-800 | `#262c36` | neutral.4  |
| gray-900 | `#151b23` | neutral.2  |
| gray-950 | `#0d1117` | neutral.1  |

Primer dark black `#010409` (neutral.0) can be used for page background; we use gray-950 for the darkest step in the scale.

## Usage in @theme

- Default `@theme` block: light gray values and brand/red as below.
- Dark: `@media (prefers-color-scheme: dark) { @theme { ... } }` overrides `--color-gray-*` with dark hex values so `dark:bg-gray-100`, `dark:text-gray-500`, etc. work.
