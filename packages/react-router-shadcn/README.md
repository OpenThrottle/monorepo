# @openthrottle/react-router-shadcn

A collection of Shadcn UI components built with React, TypeScript, and TailwindCSS. This package provides a set of accessible, customizable UI components following the [Shadcn UI](https://ui.shadcn.com/) design system.

## Installation

Install with your preferred package manager:

**pnpm:**

```bash
pnpm add @openthrottle/react-router-shadcn
```

**npm:**

```bash
npm install @openthrottle/react-router-shadcn
```

## Components

### Available Components

- **Button** - Versatile button component with multiple variants and sizes
- **Card** - Container component with header, content, and footer sections
- **Chart** - Chart primitives (ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent) for building charts with Recharts; supports metrics visualization (CPU, memory, etc.)
- **Input** - Styled text input component
- **Progress** - Progress bar for loading or value indicators
- **SimpleAreaChart** - Single-series area chart preset (category + value keys); useful for trends over time
- **SimpleBarChart** - Single-series bar chart preset (category + value keys); useful for metrics dashboards
- **SimpleLineChart** - Single-series line chart preset (category + value keys); useful for time-series metrics
- **SimplePieChart** - Part-to-whole pie/donut preset (name + value keys); useful for share or composition breakdowns

### Coming Soon

More components will be added following the Shadcn UI component library. Check the [Shadcn UI documentation](https://ui.shadcn.com/docs/components) for the full list of available components.

## Conventions

These are the agreed conventions for contributing components to this package. New
and edited components should follow them; pre-existing components are migrated
opportunistically (no big-bang rewrites required).

- **`cn` + cva `className` placement** — pass user `className` as the trailing
  argument to `cn`, never inside the cva props object:
  `cn(buttonVariants({ size, variant }), className)`. Both forms produce the same
  merged output (cva appends `props.className` and `twMerge` de-dupes), but the
  trailing-arg form is the standard here for readability.

- **Variant (`cva`) definitions** — small, single-component variant sets may stay
  inline in the component file (e.g. `Button`, `Badge`). Extract a variant set to a
  sibling `*Variants.ts` only when it is shared across multiple components in a
  folder or is large enough to dominate the file (e.g.
  `Tabs/tabsTriggerVariants.ts`, `Sidebar/sidebarMenuButtonVariants.ts`).

- **Ref forwarding** — under React 19 `ref` is a regular prop, so plain function
  components forward refs without `forwardRef`. New components should be plain
  functions; reserve `React.forwardRef` for cases that genuinely need the
  imperative ref (Radix primitive wrappers that pass a ref through). Mixed usage in
  existing components is acceptable and migrated opportunistically.

- **`Badge` `color` vs `variant`** — `variant` uses semantic theme tokens and
  follows theme/dark-mode overrides. `color` is a deliberate fixed palette of named
  hues for categorical/status tagging and intentionally does **not** track theme
  tokens. Treat the `color` list as a public, versioned contract; do not silently
  remap it to semantic tokens.

## TypeScript

This package is written in TypeScript and includes full type definitions. All components are properly typed and support TypeScript's IntelliSense.

## Browser Support

This package supports all modern browsers that support:

- ES6+ JavaScript
- CSS Custom Properties (CSS Variables)
- React 19+

## Resources

- [Shadcn UI Documentation](https://ui.shadcn.com/)
- [Shadcn UI Components](https://ui.shadcn.com/docs/components)
- [Shadcn UI Theming](https://ui.shadcn.com/docs/theming)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)
- [Radix UI Primitives](https://www.radix-ui.com/primitives)
