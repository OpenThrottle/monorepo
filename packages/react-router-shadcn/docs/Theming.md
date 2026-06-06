# Theming Guide

This package uses CSS variables for theming, allowing you to customize the appearance of all Shadcn UI components.

## Overview

The theming system is built on CSS custom properties (CSS variables) defined in `src/index.css`. All components use these variables for colors, ensuring consistent theming across the entire component library.

## Color System

The package uses the OKLCH color space for better color consistency and perceptual uniformity. OKLCH provides:

- Better color consistency across different displays
- More intuitive color manipulation
- Improved accessibility with better contrast ratios

## CSS Variables

### Base Variables

All theme variables are defined in the `:root` selector for light mode and `.dark` selector for dark mode:

#### Light Mode (`:root`)

- `--background`: Main background color
- `--foreground`: Main text color
- `--card`: Card background color
- `--card-foreground`: Card text color
- `--popover`: Popover background color
- `--popover-foreground`: Popover text color
- `--primary`: Primary brand color
- `--primary-foreground`: Text color on primary background
- `--secondary`: Secondary color
- `--secondary-foreground`: Text color on secondary background
- `--muted`: Muted background color
- `--muted-foreground`: Muted text color
- `--accent`: Accent color
- `--accent-foreground`: Text color on accent background
- `--destructive`: Destructive/error color
- `--destructive-foreground`: Text color on destructive background
- `--border`: Border color
- `--input`: Input border color
- `--ring`: Focus ring color
- `--radius`: Border radius (default: 0.5rem)

#### Dark Mode (`.dark`)

All the same variables are redefined in the `.dark` class for dark mode support.

## Customization

### Method 1: Override CSS Variables

The easiest way to customize the theme is to override the CSS variables in your application's CSS file:

```css
/* In your application's CSS file */
:root {
  --primary: oklch(0.5 0.2 250); /* Custom primary color */
  --radius: 0.75rem; /* Custom border radius */
}

.dark {
  --primary: oklch(0.6 0.2 250); /* Custom primary for dark mode */
}
```

### Method 2: Import and Extend

You can import the base CSS and extend it:

```css
@import '@openthrottle/react-router-shadcn/src/index.css';

:root {
  /* Your custom overrides */
  --primary: oklch(0.5 0.2 250);
}
```

### Method 3: Use Tailwind Theme Configuration

Since the package uses TailwindCSS v4, you can customize colors through Tailwind's theme system:

```css
@theme {
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  /* ... other color mappings */
}
```

## Color Scheme Options

The base color scheme uses a neutral gray palette. You can customize it to use different base colors:

- **Slate** (default): Neutral gray with blue undertones
- **Gray**: Pure neutral gray
- **Zinc**: Neutral gray with cool undertones
- **Neutral**: Warm neutral gray
- **Stone**: Warm gray with brown undertones

To change the base color, update the `baseColor` in `components.json`:

```json
{
  "tailwind": {
    "baseColor": "slate" // Change to "gray", "zinc", "neutral", or "stone"
  }
}
```

## Dark Mode

Dark mode is automatically supported through the `.dark` class. To enable dark mode in your application:

1. Add the `dark` class to your root element or a parent container:

```tsx
<html className="dark">{/* Your app */}</html>
```

2. Or use a theme provider that toggles the class dynamically.

## Examples

### Custom Primary Color

```css
:root {
  --primary: oklch(0.5 0.2 120); /* Green primary */
  --primary-foreground: oklch(0.98 0 0); /* White text */
}
```

### Custom Border Radius

```css
:root {
  --radius: 1rem; /* More rounded corners */
}
```

### Custom Color Palette

```css
:root {
  --background: oklch(0.99 0 0);
  --foreground: oklch(0.15 0 0);
  --primary: oklch(0.45 0.2 270); /* Purple */
  --secondary: oklch(0.95 0.01 270);
  --accent: oklch(0.92 0.02 270);
  --destructive: oklch(0.55 0.22 25); /* Red-orange */
}
```

## Resources

- [Shadcn UI Theming Documentation](https://ui.shadcn.com/docs/theming)
- [OKLCH Color Space](https://oklch.com/)
- [TailwindCSS v4 Documentation](https://tailwindcss.com/docs)
