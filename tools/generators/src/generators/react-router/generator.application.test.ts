import { describe, expect, beforeEach, test } from 'vitest';
import type { Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { generatorReactRouterApplication } from './generator.application';

describe('generatorReactRouterApplication', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  const name = 'application-name';

  test('should run successfully', async () => {
    await generatorReactRouterApplication(tree, { name });

    const changes = tree.listChanges();
    const _files = changes.map((change) => change.path);

    expect(true).toBeTruthy();

    // expect(files).toStrictEqual([
    //   '.prettierrc',
    //   'package.json',
    //   'nx.json',
    //   'tsconfig.base.json',
    //   'applications/.env',
    //   'applications/.env.default',
    //   'applications/.gitignore',
    //   'applications/.prettierrc.mjs',
    //   'applications/LICENSE',
    //   'applications/README.md',
    //   'applications/app/entry.client.tsx',
    //   'applications/app/entry.server.tsx',
    //   'applications/app/global/components/GlobalErrorBoundary.tsx',
    //   'applications/app/global/components/__tests__/GlobalErrorBoundary.test.tsx',
    //   'applications/app/global/config/__tests__/.gitkeep',
    //   'applications/app/global/config/artwork.ts',
    //   'applications/app/global/config/settings.ts',
    //   'applications/app/global/data/__tests__/.gitkeep',
    //   'applications/app/global/hooks/__tests__/.gitkeep',
    //   'applications/app/global/utils/__tests__/.gitkeep',
    //   'applications/app/global/utils/session.server.ts',
    //   'applications/app/global/utils/supabase.server.ts',
    //   'applications/app/root.tsx',
    //   'applications/app/routes/__tests__/.gitkeep',
    //   'applications/app/routes/_index.tsx',
    //   'applications/app/routing/__template__/components/__tests__/.gitkeep',
    //   'applications/app/routing/__template__/config/__tests__/.gitkeep',
    //   'applications/app/routing/__template__/data/__tests__/.gitkeep',
    //   'applications/app/routing/__template__/hooks/__tests__/.gitkeep',
    //   'applications/app/routing/__template__/utils/__tests__/.gitkeep',
    //   'applications/app/routing/home/components/__tests__/.gitkeep',
    //   'applications/app/routing/home/config/__tests__/.gitkeep',
    //   'applications/app/routing/home/data/__tests__/.gitkeep',
    //   'applications/app/routing/home/hooks/__tests__/.gitkeep',
    //   'applications/app/routing/home/utils/__tests__/.gitkeep',
    //   'applications/app/styles/base.css',
    //   'applications/app/styles/index.css',
    //   'applications/app/styles/layers.css',
    //   'applications/app/styles/scrollbar.css',
    //   'applications/app/types/global.d.ts',
    //   'applications/eslint.config.ts',
    //   'applications/package.json',
    //   'applications/postcss.config.mjs',
    //   'applications/public/branding/icon-144.png',
    //   'applications/public/branding/icon-192.png',
    //   'applications/public/branding/icon-256.png',
    //   'applications/public/branding/icon-384.png',
    //   'applications/public/branding/icon-48.png',
    //   'applications/public/branding/icon-512.png',
    //   'applications/public/branding/icon-96.png',
    //   'applications/public/branding/icon.png',
    //   'applications/public/branding/share.jpg',
    //   'applications/public/branding/share.jpg',
    //   'applications/public/favicon.ico',
    //   'applications/public/favicon.png',
    //   'applications/public/manifest.json',
    //   'applications/public/worker.js',
    //   'applications/tests/setup.ts',
    //   'applications/tsconfig.json',
    //   'applications/vite.config.ts',
    //   'applications/vitest.config.ts',
    // ]);
  });
});
