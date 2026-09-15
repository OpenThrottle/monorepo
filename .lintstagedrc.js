import * as path from 'path';

const _toRelativePath = (filePath) => {
  if (!path.isAbsolute(filePath)) return filePath;

  return path.relative(process.cwd(), filePath);
};

// lint-staged resolves its config from this file's default export, so the
// repo-wide named-exports rule cannot apply here.
// eslint-disable-next-line import-x/no-default-export
export default {
  // Mirrors the extension list in monorepo:format-check's prettier glob. `cjs`
  // and `mjs` belong here: without them a staged .mjs skips both eslint and
  // prettier locally and only fails later in check:local's format-check, which
  // is exactly how scripts/check-node-engine.mjs landed unformatted.
  '**/*.{cjs,js,jsx,mjs,ts,tsx}': (allFiles) => {
    // Generator templates are EJS, not TypeScript — `<%= namePascal %>` is a
    // parse error. @tools/dotfiles ignores them for `nx run <p>:lint`, but that
    // does not take effect for every template tree when eslint is invoked from
    // the repo root the way lint-staged invokes it, so they are excluded here.
    // Generated hook bundles (`.claude/hooks/*.cjs`, `.cursor/`, `.codex/`, and
    // the `plugins/*/hooks/` copies) are esbuild output banner-marked GENERATED
    // — DO NOT EDIT. They are not lint-clean and never were: they carry
    // `require()` calls, unused consts and empty blocks straight from the
    // bundler. Worse, `eslint --fix` would REWRITE a generated file, and the
    // next `bundle-hooks` run reverts it — leaving `bundle-hooks-check`
    // failing. Authoring lives in @openthrottle/agentic-hooks/src, which is
    // linted normally; lint the source, not the bundle.
    const isGeneratedHookBundle = (file) =>
      /(^|\/)(\.claude|\.cursor|\.codex|plugins\/[^/]+)\/hooks\/[^/]+\.cjs$/.test(
        file.replace(/\\/g, '/'),
      );

    const files = allFiles.filter(
      (file) =>
        !file
          .replace(/\\/g, '/')
          .includes('tools/generators/src/generators/') &&
        !isGeneratedHookBundle(file),
    );
    if (files.length === 0) return [];

    const list = files.join(', \n');
    const count = files.length;
    const prettierFiles = files.map((file) => JSON.stringify(file)).join(' ');
    const normalized = files.map((f) => f.replace(/\\/g, '/'));
    const openthrottleServerFiles = files.filter((_, i) =>
      normalized[i]?.includes('applications/openthrottle-server/'),
    );
    const otherTsFiles = files.filter(
      (_, i) => !normalized[i]?.includes('applications/openthrottle-server/'),
    );
    const eslintServer = openthrottleServerFiles
      .map((file) => JSON.stringify(file))
      .join(' ');
    const eslintOther = otherTsFiles
      .map((file) => JSON.stringify(file))
      .join(' ');

    const eslintCommands = [];
    if (openthrottleServerFiles.length > 0) {
      eslintCommands.push(
        `pnpm exec eslint --config applications/openthrottle-server/eslint.config.ts --fix ${eslintServer}`,
      );
    }
    if (otherTsFiles.length > 0) {
      eslintCommands.push(`pnpm exec eslint --fix ${eslintOther}`);
    }

    return [
      `echo "🤖 Lint + 🎨 Prettify ${count} staged files: \n\n${list}"`,
      ...eslintCommands,
      `pnpm exec prettier --ignore-unknown --write ${prettierFiles}`,
    ];
  },
  '**/*.{css,html,json,less,md,mdx,sass,scss,yaml,yml}': (files) => {
    const list = files.join(', \n');
    const count = files.length;
    const prettierFiles = files.map((file) => JSON.stringify(file)).join(' ');

    return [
      `echo "🎨 Format ${count} staged files: \n\n${list}"`,
      `pnpm exec prettier --ignore-unknown --write ${prettierFiles}`,
    ];
  },

  // '**/*.{ts,tsx}': (files) => {
  //   const list = files.join(', \n');
  //   const count = files.length;
  //   const nxFiles = files.map(_toRelativePath).join(',');
  //   const nxFilesArg = JSON.stringify(nxFiles);
  //
  //   return [
  //     `echo "🔎 Typecheck ${count} staged files: \n\n${list}"`,
  //     `env NX_DAEMON=false pnpm exec nx affected --target=typecheck --excludeTaskDependencies --files=${nxFilesArg} --exclude='tag:type:application'`,
  //   ];
  // },
};
