import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { createLogger } from './lib/index.ts';

const logger = createLogger();

/**
 * @description Generates a static HTML visualization of the NX dependency graph
 */
const main = async (): Promise<void> => {
  logger.step('Generating dependency graph visualization...');
  logger.blank();

  try {
    // Determine output directory (default to workspace root)
    const outputDir = process.env.DEP_GRAPH_OUTPUT_DIR || process.cwd();
    const outputFile = join(outputDir, 'dependency-graph.html');

    // Ensure output directory exists
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
      logger.info(`Created output directory: ${outputDir}`);
    }

    // Generate the dependency graph HTML file
    logger.info(`Generating graph visualization to: ${outputFile}`);
    execSync(
      `pnpm exec nx graph --file=${outputFile} --watch=false --open=false`,
      {
        cwd: process.cwd(),
        stdio: 'inherit',
      },
    );

    logger.blank();
    logger.success('Dependency graph visualization generated successfully!');
    logger.info(`Output file: ${outputFile}`);
    logger.blank();
    logger.info(
      'You can view this file in a browser or upload it as a CI artifact.',
    );
  } catch (error) {
    logger.fail(`Error generating dependency graph: ${String(error)}`);
    process.exit(1);
  }

  process.exit(0);
};

main();
