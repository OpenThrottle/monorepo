import * as path from 'path';

const _toRelativePath = (filePath) => {
  if (!path.isAbsolute(filePath)) return filePath;

  return path.relative(process.cwd(), filePath);
};

export default {
  '**/*.{css,html,json,less,md,mdx,sass,scss,yaml,yml}': (files) => {
    const list = files.join(', \n');
    const count = files.length;
    const prettierFiles = files.map((file) => JSON.stringify(file)).join(' ');

    return [
      `echo "🎨 Format ${count} staged files: \n\n${list}"`,
      `pnpm exec prettier --ignore-unknown --write ${prettierFiles}`,
    ];
  },

  '**/*.{js,jsx,ts,tsx}': (files) => {
    const list = files.join(', \n');
    const count = files.length;
    const prettierFiles = files.map((file) => JSON.stringify(file)).join(' ');
    const eslintFiles = files.map((file) => JSON.stringify(file)).join(' ');

    return [
      `echo "🤖 Lint + 🎨 Prettify ${count} staged files: \n\n${list}"`,
      // `pnpm exec eslint --fix --max-warnings=0 ${eslintFiles}`, // FIXME: Bring this back - SUPER STRICT
      `pnpm exec eslint --fix ${eslintFiles}`,
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
