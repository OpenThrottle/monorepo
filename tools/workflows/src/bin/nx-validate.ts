#!/usr/bin/env node

import { Command } from 'commander';
import { getNxProjectNames } from '../utils/projects';
import {
  resolveWorkspaceRoot,
  runNxValidateScripts,
} from '../utils/nx-validate-workspace';

interface NxValidateOptions {
  project?: string;
}

/**
 * @description Commander-based Nx validation workflow entry point.
 */
const main = async (): Promise<void> => {
  const program = new Command();

  program
    .name('workflow-nx-validate')
    .description(
      'Run monorepo Nx validation (nx:validate-tags, nx:validate-projects, nx:validate-configurations)',
    )
    .option(
      '-p, --project <name>',
      'Optional Nx project to verify exists in the graph before workspace validation',
    )
    .action(async (options: NxValidateOptions) => {
      const workspaceRoot = resolveWorkspaceRoot(process.cwd());

      if (options.project) {
        const names = await getNxProjectNames();
        if (!names.includes(options.project)) {
          console.error(
            `Unknown Nx project "${options.project}". Known application/package projects include: ${names.slice(0, 10).join(', ')}${names.length > 10 ? ', …' : ''}`,
          );
          process.exit(1);
        }
      }

      console.log(`Running pnpm run nx:validate in ${workspaceRoot}`);
      process.exit(runNxValidateScripts(workspaceRoot));
    });

  await program.parseAsync();
};

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
