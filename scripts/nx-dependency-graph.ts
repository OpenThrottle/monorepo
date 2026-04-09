import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * @description Generates a static HTML visualization of the NX dependency graph
 */
const main = async (): Promise<void> => {
  console.log('📊 Generating dependency graph visualization...\n');

  try {
    // Determine output directory (default to workspace root)
    const outputDir = process.env.DEP_GRAPH_OUTPUT_DIR || process.cwd();
    const outputFile = join(outputDir, 'dependency-graph.html');

    // Ensure output directory exists
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
      console.log(`📁 Created output directory: ${outputDir}`);
    }

    // Generate the dependency graph HTML file
    console.log(`🎨 Generating graph visualization to: ${outputFile}`);
    execSync(
      `pnpm exec nx graph --file=${outputFile} --watch=false --open=false`,
      {
        cwd: process.cwd(),
        stdio: 'inherit',
      },
    );

    console.log(`\n✅ Dependency graph visualization generated successfully!`);
    console.log(`📄 Output file: ${outputFile}`);
    console.log(
      `\n💡 You can view this file in a browser or upload it as a CI artifact.`,
    );
  } catch (error) {
    console.error('❌ Error generating dependency graph:', error);
    process.exit(1);
  }

  process.exit(0);
};

main();
