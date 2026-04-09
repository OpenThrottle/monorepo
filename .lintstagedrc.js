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
        `pnpm exec eslint --config applications/openthrottle-server/eslint.config.mts --fix ${eslintServer}`,
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
