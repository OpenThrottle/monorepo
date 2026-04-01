import { createProjectGraphAsync } from '@nx/devkit';

/**
 * @description Detects circular dependencies in the NX project graph
 * @returns Array of circular dependency paths found
 */
const findCircularDependencies = (
  graph: Awaited<ReturnType<typeof createProjectGraphAsync>>,
): string[][] => {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const path: string[] = [];

  /**
   * @description Performs depth-first search to detect cycles
   */
  const dfs = (node: string): void => {
    visited.add(node);
    recursionStack.add(node);
    path.push(node);

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
  console.log('🔍 Checking for circular dependencies...\n');

  try {
    const graph = await createProjectGraphAsync();
    const cycles = findCircularDependencies(graph);

    if (cycles.length > 0) {
      console.error('❌ Circular dependencies detected!\n');
      console.error('The following circular dependencies were found:\n');
      console.error(formatCycles(cycles));
      console.error(
        '\n📚 For more information, see: docs/monorepo/NX/dependencies.md',
      );
      console.error(
        '\n💡 To visualize the dependency graph, run: pnpm exec nx graph',
      );
      process.exit(1);
    } else {
      console.log('✅ No circular dependencies detected!');
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Error checking for circular dependencies:', error);
    process.exit(1);
  }
};

main();
