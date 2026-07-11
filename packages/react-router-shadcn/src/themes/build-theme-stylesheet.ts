import {
  THEME_TOKEN_NAMES,
  type Theme,
  type ThemeTokens,
} from './theme-contract';

const renderTokenBlock = (tokens: ThemeTokens): string =>
  THEME_TOKEN_NAMES.map((name) => `  --${name}: ${tokens[name]};`).join('\n');

/**
 * @public
 * @description Builds the CSS for a set of {@link Theme}s as scoped token
 * overrides. Each theme emits an `html[data-theme="id"]` block (light) and an
 * `html[data-theme="id"].dark` block (dark), whose selector specificity beats
 * the base `:root` / `prefers-color-scheme` rules in `theme.css`. Render the
 * result in a single SSR `<style>` in the document head so the palette is
 * present on first paint (no flash), then set `data-theme` / `.dark` on
 * `<html>` to activate a theme.
 */
export const buildThemeStylesheet = (themes: readonly Theme[]): string =>
  themes
    .map(
      (theme) =>
        `html[data-theme="${theme.id}"] {\n${renderTokenBlock(theme.light)}\n}\n` +
        `html[data-theme="${theme.id}"].dark {\n${renderTokenBlock(theme.dark)}\n}`,
    )
    .join('\n\n');
