import { defineWorkspace } from 'vitest/config';

/**
 * @link https://vitest.dev/guide/workspace#configuration
 * @description you can use a list of glob patterns to define your workspaces
 * Vitest expects a list of config files or directories where there is a config file
 */
export default defineWorkspace([
  'applications/**/*',
  'packages/**/*',
  'tools/**/*',

  // ...
  '!applications/barguide-llm/',
  '!tools/generators/',
]);
