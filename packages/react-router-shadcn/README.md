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

**yarn:**

```bash
yarn add @openthrottle/react-router-shadcn
```

## Setup

### 1. Import CSS (single Tailwind entry)

Your app should be the **only** place that imports Tailwind. Import `theme.css` (theme-only, no Tailwind) after Tailwind so app overrides apply correctly:

```css
@import 'tailwindcss';
@import 'tw-animate-css';
@import '@openthrottle/react-router-shadcn/src/theme.css';

/* Then your app overrides: @source, :root, @theme, @layer base */
```

Or use the full entry (same theme, no Tailwind) if you prefer:

```css
@import '@openthrottle/react-router-shadcn/src/index.css';
```

Do **not** import Tailwind from this package; import it once from your app.

### 2. Configure TailwindCSS

This package uses TailwindCSS v4. Ensure your application has TailwindCSS configured and that your build scans this package for class names (e.g. `@source "../../../../packages/**/*.{css,ts,tsx}"` in a monorepo).

## Usage

### Button

The Button component supports multiple variants and sizes:

```tsx
import { Button } from '@openthrottle/react-router-shadcn';

// Default button
<Button>Click me</Button>

// Variants
<Button variant="default">Default</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Outline</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
<Button size="icon">Icon</Button>

// As child (render as different element)
<Button asChild>
  <a href="/link">Link Button</a>
</Button>
```

### Card

The Card component provides a container with sub-components for structured content:

```tsx
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@openthrottle/react-router-shadcn';

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description text</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Card content goes here</p>
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>;
```

### Input

The Input component provides a styled text input:

```tsx
import { Input } from '@openthrottle/react-router-shadcn';

// Basic input
<Input placeholder="Enter text" />

// With type
<Input type="email" placeholder="Enter email" />
<Input type="password" placeholder="Enter password" />

// With value and onChange
<Input
  value={value}
  onChange={(e) => setValue(e.target.value)}
  placeholder="Controlled input"
/>

// Disabled
<Input disabled placeholder="Disabled input" />
```

### Chart and SimpleBarChart (metrics visualization)

Chart components are available for metrics visualization (e.g. CPU, memory, task-run stats). They are built on [Recharts](https://recharts.org/); **recharts** is a direct dependency of this package (no extra peer install required).

**Exports:**

- **Chart** – `ChartContainer`, `ChartTooltip`, `ChartTooltipContent`, `ChartLegend`, `ChartLegendContent`, and types `ChartConfig`, `ChartConfigEntry`. Use with Recharts primitives (`BarChart`, `Bar`, `XAxis`, `YAxis`, etc.) to build custom charts. Set `min-h-[value]` on `ChartContainer` for responsive height.
- **SimpleBarChart** – Single-series bar chart preset: pass `data`, `categoryKey`, and `valueKey` for category-on-axis bar charts (horizontal or vertical). Useful for RSS/heap/CPU values per label or time.

**Example (SimpleBarChart for memory metrics):**

```tsx
import { SimpleBarChart } from '@openthrottle/react-router-shadcn';

const data = [
  { metric: 'RSS', value: 120.5 },
  { metric: 'Heap used', value: 85.2 },
  { metric: 'Heap total', value: 100 },
];
<SimpleBarChart
  data={data}
  categoryKey="metric"
  valueKey="value"
  valueLabel="MB"
  className="min-h-[200px]"
/>;
```

**Example (ChartContainer + Recharts for custom charts):**

```tsx
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@openthrottle/react-router-shadcn';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';

const chartConfig = {
  heapUsed: { label: 'Heap used (MB)', color: 'var(--chart-1)' },
  rss: { label: 'RSS (MB)', color: 'var(--chart-2)' },
} satisfies ChartConfig;

<ChartContainer config={chartConfig} className="min-h-[200px] w-full">
  <BarChart data={metricsData}>
    <CartesianGrid strokeDasharray="3 3" vertical={false} />
    <XAxis dataKey="time" tickLine={false} />
    <YAxis tickLine={false} width={36} />
    <ChartTooltip content={<ChartTooltipContent />} />
    <Bar
      dataKey="heapUsed"
      fill="var(--color-heapUsed)"
      radius={[4, 4, 0, 0]}
    />
    <Bar dataKey="rss" fill="var(--color-rss)" radius={[4, 4, 0, 0]} />
  </BarChart>
</ChartContainer>;
```

Theme tokens `--chart-1` … `--chart-5` (and `--color-chart-1` …) are defined in the package theme; override them in your app CSS to match your palette.

### Utilities

The package exports a `cn` utility function for merging class names with TailwindCSS conflict resolution:

```tsx
import { cn } from '@openthrottle/react-router-shadcn';

// Merge classes
const className = cn('px-2 py-1', 'px-4'); // Results in 'py-1 px-4'

// Conditional classes
const className = cn('base-class', condition && 'conditional-class');

// With objects
const className = cn({
  active: isActive,
  disabled: isDisabled,
});
```

## Theming

This package uses CSS variables for theming, allowing you to customize the appearance of all components. See [THEMING.md](../../../docs/packages/shadcn-ui/THEMING.md) for detailed theming documentation.

### Override contract

Override these in your app’s CSS (`:root` and optionally `.dark` or `@media (prefers-color-scheme: dark)`) to customize colors and fonts. Define only the tokens you want to change; the rest fall back to theme defaults.

**CSS variables (semantic tokens):**

| Variable                                                                                                                                                                          | Purpose                                 |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `--background`, `--foreground`                                                                                                                                                    | Page background and text                |
| `--card`, `--card-foreground`                                                                                                                                                     | Card surface and text                   |
| `--popover`, `--popover-foreground`                                                                                                                                               | Popover/dropdown surface                |
| `--primary`, `--primary-foreground`                                                                                                                                               | Primary actions                         |
| `--secondary`, `--secondary-foreground`                                                                                                                                           | Secondary actions                       |
| `--muted`, `--muted-foreground`                                                                                                                                                   | Muted text and backgrounds              |
| `--accent`, `--accent-foreground`                                                                                                                                                 | Accent/highlight (e.g. links)           |
| `--destructive`, `--destructive-foreground`                                                                                                                                       | Destructive actions                     |
| `--border`, `--input`, `--ring`                                                                                                                                                   | Borders, inputs, focus ring             |
| `--radius`                                                                                                                                                                        | Default border radius (e.g. `0.5rem`)   |
| `--sidebar`, `--sidebar-foreground`, `--sidebar-primary`, `--sidebar-primary-foreground`, `--sidebar-accent`, `--sidebar-accent-foreground`, `--sidebar-border`, `--sidebar-ring` | Sidebar theming                         |
| `--chart-1` … `--chart-5`                                                                                                                                                         | Chart colors (if your app defines them) |

**Tailwind @theme tokens:** The theme maps the above to `--color-*` and `--radius*` (e.g. `--color-background`, `--radius-sm`). Overriding the CSS variables in `:root` is enough; your app’s `@theme` block can re-export them the same way if you define a full theme.

**Fonts:** Set `font-family` in your app’s `@layer base { body { ... } }`; the package does not set a default font.

### Quick Theming Example

Override CSS variables in your application's CSS (after importing `theme.css`):

```css
:root {
  --primary: oklch(0.5 0.2 250); /* Custom primary color */
  --radius: 0.75rem; /* Custom border radius */
}

.dark {
  --primary: oklch(0.6 0.2 250); /* Custom primary for dark mode */
}
```

## Components

### Available Components

- **Button** - Versatile button component with multiple variants and sizes
- **Card** - Container component with header, content, and footer sections
- **Chart** - Chart primitives (ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent) for building charts with Recharts; supports metrics visualization (CPU, memory, etc.)
- **Input** - Styled text input component
- **Progress** - Progress bar for loading or value indicators
- **SimpleBarChart** - Single-series bar chart preset (category + value keys); useful for metrics dashboards

### Coming Soon

More components will be added following the Shadcn UI component library. Check the [Shadcn UI documentation](https://ui.shadcn.com/docs/components) for the full list of available components.

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
