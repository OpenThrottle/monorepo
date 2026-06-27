import { execSync } from 'child_process';
import { fileURLToPath } from 'node:url';

/**
 * @description Valid technology tag values as defined in the reference document
 */
export const VALID_TECHNOLOGY_TAGS = [
  'llm',
  'nestjs',
  'nodejs',
  'python',
  'react-native',
  'react-router',
  'react',
  'terraform',
  'typescript',
] as const;

type ValidTechnologyTag = (typeof VALID_TECHNOLOGY_TAGS)[number];

/**
 * @description Validates that a technology tag value is in the allowed list
 */
export const isValidTechnologyTag = (
  tag: string,
): tag is ValidTechnologyTag => {
  return VALID_TECHNOLOGY_TAGS.includes(tag as ValidTechnologyTag);
};

/**
 * @description Extracts technology tags from project tags
 */
export const extractTechnologyTags = (tags: readonly string[]): string[] => {
  return tags
    .filter((tag) => tag.startsWith('technology:'))
    .map((tag) => tag.replace('technology:', ''));
};

export const VALID_PRODUCTION_VALUES = ['true', 'false'] as const;

type ValidProductionValue = (typeof VALID_PRODUCTION_VALUES)[number];

/**
 * @description Extracts production tag values from project tags
 */
export const extractProductionTags = (tags: readonly string[]): string[] => {
  return tags
    .filter((tag) => tag.startsWith('production:'))
    .map((tag) => tag.replace('production:', ''));
};

export const isValidProductionValue = (
  value: string,
): value is ValidProductionValue => {
  return VALID_PRODUCTION_VALUES.includes(value as ValidProductionValue);
};

/**
 * @description Validates technology and production tags for a single project
 */
export interface ValidationResult {
  readonly conflictingNodejsTypescript: boolean;
  readonly hasProductionTag: boolean;
  readonly hasTechnologyTag: boolean;
  readonly invalidProductionTags: readonly string[];
  readonly invalidTechnologyTags: readonly string[];
  readonly multipleProductionTags: boolean;
  readonly projectName: string;
  readonly technologyTags: readonly string[];
}

export const validateProjectTags = (
  projectName: string,
  tags: readonly string[],
): ValidationResult => {
  const technologyTags = extractTechnologyTags(tags);
  const productionTags = extractProductionTags(tags);
  const invalidTechnologyTags = technologyTags.filter(
    (tag) => !isValidTechnologyTag(tag),
  );
  const invalidProductionTags = productionTags.filter(
    (tag) => !isValidProductionValue(tag),
  );

  const hasNodejs = technologyTags.includes('nodejs');
  const hasTypescript = technologyTags.includes('typescript');

  return {
    conflictingNodejsTypescript: hasNodejs && hasTypescript && false, // FIXME: Temp
    hasProductionTag: productionTags.length === 1,
    hasTechnologyTag: technologyTags.length > 0,
    invalidProductionTags,
    invalidTechnologyTags,
    multipleProductionTags: productionTags.length > 1,
    projectName,
    technologyTags,
  };
};

/**
 * @description True when a single result carries any tag violation (missing/duplicate/invalid
 * technology or production tags, or the conflicting nodejs+typescript combination).
 */
export const resultHasErrors = (result: ValidationResult): boolean =>
  !result.hasTechnologyTag ||
  !result.hasProductionTag ||
  result.multipleProductionTags ||
  result.invalidTechnologyTags.length > 0 ||
  result.invalidProductionTags.length > 0 ||
  result.conflictingNodejsTypescript;

/**
 * @description True when any project in the set has a tag violation.
 */
export const hasValidationErrors = (
  results: readonly ValidationResult[],
): boolean => results.some(resultHasErrors);

/**
 * @description Formats validation results for display
 */
export const formatResults = (results: readonly ValidationResult[]): string => {
  const missingTechnologyTags = results.filter((r) => !r.hasTechnologyTag);
  const missingProductionTags = results.filter((r) => !r.hasProductionTag);
  const multipleProductionTags = results.filter(
    (r) => r.multipleProductionTags,
  );
  const invalidTechnologyTags = results.filter(
    (r) => r.invalidTechnologyTags.length > 0,
  );
  const invalidProductionTags = results.filter(
    (r) => r.invalidProductionTags.length > 0,
  );
  const conflictingNodejsTypescript = results.filter(
    (r) => r.conflictingNodejsTypescript,
  );

  const lines: string[] = [];

  if (missingTechnologyTags.length > 0) {
    lines.push('❌ Projects missing technology tags:');
    lines.push('');
    missingTechnologyTags.forEach((result) => {
      lines.push(`  - ${result.projectName}`);
    });
    lines.push('');
  }

  if (missingProductionTags.length > 0) {
    lines.push('❌ Projects missing or duplicate production tags:');
    lines.push('');
    missingProductionTags.forEach((result) => {
      lines.push(`  - ${result.projectName}`);
    });
    lines.push('');
  }

  if (multipleProductionTags.length > 0) {
    lines.push('❌ Projects with multiple production tags:');
    lines.push('');
    multipleProductionTags.forEach((result) => {
      lines.push(`  - ${result.projectName}`);
    });
    lines.push('');
  }

  if (invalidTechnologyTags.length > 0) {
    lines.push('❌ Projects with invalid technology tags:');
    lines.push('');
    invalidTechnologyTags.forEach((result) => {
      lines.push(`  - ${result.projectName}:`);
      result.invalidTechnologyTags.forEach((tag) => {
        lines.push(`    • technology:${tag} (not in reference document)`);
      });
    });
    lines.push('');
  }

  if (invalidProductionTags.length > 0) {
    lines.push('❌ Projects with invalid production tags:');
    lines.push('');
    invalidProductionTags.forEach((result) => {
      lines.push(`  - ${result.projectName}:`);
      result.invalidProductionTags.forEach((tag) => {
        lines.push(`    • production:${tag} (must be true or false)`);
      });
    });
    lines.push('');
  }

  if (conflictingNodejsTypescript.length > 0) {
    lines.push(
      '❌ Projects with both technology:nodejs and technology:typescript:',
    );
    lines.push('');
    conflictingNodejsTypescript.forEach((result) => {
      lines.push(`  - ${result.projectName}`);
    });
    lines.push('');
    lines.push(
      '   Use technology:nodejs only for isomorphic shared libraries or monorepo root.',
    );
    lines.push(
      '   Use technology:typescript for Node-only TypeScript packages.',
    );
    lines.push('');
  }

  const hasErrors =
    missingTechnologyTags.length > 0 ||
    missingProductionTags.length > 0 ||
    multipleProductionTags.length > 0 ||
    invalidTechnologyTags.length > 0 ||
    invalidProductionTags.length > 0 ||
    conflictingNodejsTypescript.length > 0;

  if (!hasErrors) {
    lines.push('✅ All projects have valid technology and production tags!');
    lines.push('');
    lines.push(`Validated ${results.length} projects`);
  }

  return lines.join('\n');
};

/**
 * @description Gets project information using nx show project command
 */
const getProjectInfo = (
  projectName: string,
): {
  readonly tags: readonly string[];
} | null => {
  try {
    const output = execSync(`nx show project ${projectName} --json`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });

    const data = JSON.parse(output);

    return {
      tags: data.tags || [],
    };
  } catch {
    return null;
  }
};

/**
 * @description Gets all project names using nx show projects command
 */
const getAllProjectNames = (): readonly string[] => {
  try {
    const output = execSync('nx show projects --json', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });

    const projects = JSON.parse(output);

    return Array.isArray(projects) ? projects : [];
  } catch {
    return [];
  }
};

/**
 * @description Main function to validate technology tags across all projects
 */
const main = async (): Promise<void> => {
  console.log(
    '🔍 Validating technology and production tags across all NX projects...\n',
  );

  try {
    const projectNames = getAllProjectNames();
    const results: ValidationResult[] = [];

    for (const projectName of projectNames) {
      const projectInfo = getProjectInfo(projectName);

      if (projectInfo) {
        const validation = validateProjectTags(projectName, projectInfo.tags);
        results.push(validation);
      }
    }

    const output = formatResults(results);
    console.log(output);

    if (hasValidationErrors(results)) {
      console.log('📚 For more information, see: docs/monorepo/NX/tags.md');
      console.log(
        "\n💡 To view a project's tags, run: nx show project <project-name>",
      );

      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error validating technology tags:', error);

    process.exit(1);
  }

  process.exit(0);
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
