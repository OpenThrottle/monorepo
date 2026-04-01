#!/usr/bin/env node

import { Command } from 'commander';
import { ARTWORK_RALPH } from '../config/index';
import { MESSAGE_COMPLETED, MESSAGE_INTRO } from '../config/messages';

interface NxValidateOptions {
  project?: string;
}

/**
 * @description Commander-based Nx validation workflow entry point.
 */
const main = (): void => {
  const program = new Command();

  program
    .name('workflow-nx-validate')
    .description('Nx validation workflow')
    .option(
      '-p, --project <name>',
      'Optional Nx project to validate (e.g. @tools/workflows)',
    )
    .action((options: NxValidateOptions) => {
      console.log(ARTWORK_RALPH);
      console.log('🔍 Parsed arguments:', options);
      console.log(MESSAGE_INTRO);
      console.log(MESSAGE_COMPLETED);
      process.exit(0);
    });

  program.parse();
};

main();
