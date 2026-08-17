import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import type { StorybookConfig } from '@storybook/react-vite';

const HERE = dirname(fileURLToPath(import.meta.url));

const SHADCN_ROOT = join(HERE, '../../../packages/react-router-shadcn');

/**
 * Docgen needs BOTH of these to see components that live outside this app, and
 * getting either wrong produces the same silent failure — "Skipping docgen …
 * because it is not included in the active TypeScript project", empty prop
 * tables, and empty variant selects:
 *
 * - `tsconfigPath`, so the parser type-checks against the config that owns the
 *   component sources rather than the workbench's own.
 * - `include`, because the plugin globs its candidate files from the Vite root
 *   (this app) and its `**\/*.tsx` default therefore never reaches `packages/`.
 *   The final file set is the INTERSECTION of that glob and the tsconfig's
 *   files, so the tsconfig alone is not enough.
 */
const SHADCN_TSCONFIG = join(SHADCN_ROOT, 'tsconfig.lib.json');
const SHADCN_COMPONENT_GLOB = join(SHADCN_ROOT, 'src/**/*.tsx');

/**
 * @description Storybook host for `@openthrottle/react-router-shadcn`.
 *
 * The workbench owns no components. Stories are co-located next to the
 * components they document, inside the package — the precedent already set by
 * `packages/react-router-shadcn/eslint.config.ts`, which exempts
 * `**\/*.stories.tsx` from the `openthrottle/component-primitive-shape` rule.
 *
 * The shadcn package is router-free (`react-router` appears only in its
 * `__tests__`), so this host needs plain React + Vite — no React Router
 * framework, and deliberately no `@nx/storybook`: targets in this workspace are
 * hand-declared in `package.json` `nx.targets` against `nx.json`
 * `targetDefaults`.
 */
const config: StorybookConfig = {
  /**
   * `@storybook/addon-themes` is deliberately absent: both of its decorators
   * bind the same `theme` global, so the palette and light/dark axes collide.
   * `preview.tsx` drives them off the registry with its own decorator instead.
   */
  addons: ['@storybook/addon-docs'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  stories: ['../../../packages/react-router-shadcn/src/**/*.stories.tsx'],
  typescript: {
    /**
     * `react-docgen-typescript` (rather than the `react-docgen` default)
     * because the package's prop types are interfaces that extend others —
     * `ButtonProps extends BaseProps, ButtonVariants` — and only the TS-aware
     * resolver follows that inheritance into a real API table.
     */
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      include: [SHADCN_COMPONENT_GLOB],
      /**
       * Drop only the React DOM typings, not everything under node_modules.
       *
       * The usual `!/node_modules/` recipe keeps tables short, but most of this
       * package is thin Radix wrappers whose props come from
       * `ComponentPropsWithoutRef<typeof SomePrimitive.Root>` — so that filter
       * throws away the entire real API. Tabs, for instance, documented exactly
       * one prop. Excluding `@types/react` alone still suppresses the ~250
       * inherited DOM attributes while keeping `value`, `orientation`,
       * `onValueChange` and friends.
       */
      propFilter: (prop) =>
        prop.parent
          ? !/node_modules\/(@types\/react|@types\/react-dom)\//.test(
              prop.parent.fileName,
            )
          : true,
      shouldExtractLiteralValuesFromEnum: true,
      tsconfigPath: SHADCN_TSCONFIG,
    },
  },
  /**
   * Tailwind v4 runs as a Vite plugin, exactly as it does in
   * `packages/react-router-shadcn/vite.config.ts` and in every consuming app.
   */
  viteFinal: async (viteConfig) => ({
    ...viteConfig,
    plugins: [...(viteConfig.plugins ?? []), tailwindcss()],
  }),
};

export default config;
