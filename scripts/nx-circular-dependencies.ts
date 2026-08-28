import { createProjectGraphAsync } from '@nx/devkit';
import { createLogger } from './lib/index.ts';

const logger = createLogger();

/**
 * @description Detects circular dependencies in the NX project graph
 * @returns Array of circular dependency paths found
 */
const findCircularDependencies = (
  graph: Awaited<ReturnType<typeof createProjectGraphAsync>>,
): string[][] => {
  const cycles: string[][] = [];
  const path: string[] = [];
  const recursionStack = new Set<string>();
  const visited = new Set<string>();

  /**
   * @description Performs depth-first search to detect cycles
   */
  const dfs = (node: string): void => {
    path.push(node);
    recursionStack.add(node);
    visited.add(node);

    const dependencies = graph.dependencies[node] || [];
    for (const dep of dependencies) {
      const target = dep.target;

      // Skip external dependencies (npm packages)
      if (!graph.nodes[target]) {
        continue;
      }

      if (!visited.has(target)) {
        dfs(target);
      } else if (recursionStack.has(target)) {
        // Found a cycle - extract the cycle path
        const cycleStart = path.indexOf(target);
        const cycle = path.slice(cycleStart).concat(target);

        cycles.push([...cycle]);
      }
    }

    recursionStack.delete(node);
    path.pop();
  };

  // Check all nodes in the graph
  for (const nodeName of Object.keys(graph.nodes)) {
    if (!visited.has(nodeName)) {
      dfs(nodeName);
    }
  }

  return cycles;
};

/**
 * @description Formats circular dependencies for display
 */
const formatCycles = (cycles: string[][]): string => {
  if (cycles.length === 0) {
    return '';
  }

  const formatted = cycles.map((cycle, index) => {
    const cycleStr = cycle.join(' → ');
    return `  ${index + 1}. ${cycleStr}`;
  });

  return formatted.join('\n');
};

/**
 * @description Main function to check for circular dependencies
 */
const main = async (): Promise<void> => {
  logger.step('Checking for circular dependencies...');
  logger.blank();

  try {
    const graph = await createProjectGraphAsync();
    const cycles = findCircularDependencies(graph);

    if (cycles.length > 0) {
      logger.fail('Circular dependencies detected!');
      logger.blank();
      logger.info('The following circular dependencies were found:');
      logger.blank();
      logger.info(formatCycles(cycles));
      logger.blank();
      logger.info('For more information, see: docs/monorepo/nx-graph.md');
      logger.blank();
      logger.info('To visualize the dependency graph, run: pnpm exec nx graph'); // prettier-ignore

      process.exit(1);
    }

    logger.success('No circular dependencies detected!');
  } catch (error) {
    logger.fail(`Error checking for circular dependencies: ${String(error)}`);

    process.exit(1);
  }

  process.exit(0);
};

main();
