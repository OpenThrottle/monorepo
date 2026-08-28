import { execSync } from 'child_process';
import { fileURLToPath } from 'node:url';
import { createLogger } from './lib/index.ts';

const logger = createLogger();

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
  return VALID_TECHNOLOGY_TAGS.some((valid) => valid === tag);
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
  return VALID_PRODUCTION_VALUES.some((valid) => valid === value);
};

/**
 * @description Valid `type:` tag values. Every project must carry exactly one —
 * it drives module boundaries (@nx/enforce-module-boundaries depConstraints)
 * and release scoping.
 */
export const VALID_TYPE_TAGS = [
  'application',
  'infrastructure',
  'package',
  'tool',
] as const;

type ValidTypeTag = (typeof VALID_TYPE_TAGS)[number];

export const isValidTypeTag = (tag: string): tag is ValidTypeTag => {
  return VALID_TYPE_TAGS.some((valid) => valid === tag);
};

/**
 * @description Extracts `type:` tag values from project tags
 */
export const extractTypeTags = (tags: readonly string[]): string[] => {
  return tags
    .filter((tag) => tag.startsWith('type:'))
    .map((tag) => tag.replace('type:', ''));
};

export const VALID_PUBLISH_VALUES = ['true', 'false'] as const;

type ValidPublishValue = (typeof VALID_PUBLISH_VALUES)[number];

/**
 * @description Extracts `publish:` tag values from project tags
 */
export const extractPublishTags = (tags: readonly string[]): string[] => {
  return tags
    .filter((tag) => tag.startsWith('publish:'))
    .map((tag) => tag.replace('publish:', ''));
};

export const isValidPublishValue = (
  value: string,
): value is ValidPublishValue => {
  return VALID_PUBLISH_VALUES.some((valid) => valid === value);
};

/**
 * @description Validates technology, production, type, and publish tags for a
 * single project.
 */
export interface ValidationResult {
  readonly hasProductionTag: boolean;
  readonly hasPublishTag: boolean;
  readonly hasTechnologyTag: boolean;
  readonly hasTypeTag: boolean;
  readonly invalidProductionTags: readonly string[];
  readonly invalidPublishValues: readonly string[];
  readonly invalidTechnologyTags: readonly string[];
  readonly invalidTypeTags: readonly string[];
  readonly multipleProductionTags: boolean;
  readonly multiplePublishTags: boolean;
  readonly multipleTypeTags: boolean;
  readonly projectName: string;
  readonly requiresPublishTag: boolean;
  readonly technologyTags: readonly string[];
  readonly typeTags: readonly string[];
}

export const validateProjectTags = (
  projectName: string,
  tags: readonly string[],
): ValidationResult => {
  const technologyTags = extractTechnologyTags(tags);
  const productionTags = extractProductionTags(tags);
  const typeTags = extractTypeTags(tags);
  const publishTags = extractPublishTags(tags);

  const invalidTechnologyTags = technologyTags.filter(
    (tag) => !isValidTechnologyTag(tag),
  );
  const invalidProductionTags = productionTags.filter(
    (tag) => !isValidProductionValue(tag),
  );
  const invalidTypeTags = typeTags.filter((tag) => !isValidTypeTag(tag));
  const invalidPublishValues = publishTags.filter(
    (value) => !isValidPublishValue(value),
  );

  // A single, valid `type:` value of package/tool must declare its publish
  // intent (these are the release-scoped project kinds).
  const typeValue = typeTags.length === 1 ? typeTags[0] : undefined;
  const requiresPublishTag = typeValue === 'package' || typeValue === 'tool';

  return {
    hasProductionTag: productionTags.length === 1,
    hasPublishTag: publishTags.length === 1,
    hasTechnologyTag: technologyTags.length > 0,
    hasTypeTag: typeTags.length === 1,
    invalidProductionTags,
    invalidPublishValues,
    invalidTechnologyTags,
    invalidTypeTags,
    multipleProductionTags: productionTags.length > 1,
    multiplePublishTags: publishTags.length > 1,
    multipleTypeTags: typeTags.length > 1,
    projectName,
    requiresPublishTag,
    technologyTags,
    typeTags,
  };
};

/**
 * @description True when a single result carries any tag violation (missing,
 * duplicate, or invalid technology / production / type tags, or a missing,
 * duplicate, or invalid publish tag where one is required).
 */
export const resultHasErrors = (result: ValidationResult): boolean =>
  !result.hasTechnologyTag ||
  !result.hasProductionTag ||
  !result.hasTypeTag ||
  result.multipleProductionTags ||
  result.multipleTypeTags ||
  result.invalidTechnologyTags.length > 0 ||
  result.invalidProductionTags.length > 0 ||
  result.invalidTypeTags.length > 0 ||
  (result.requiresPublishTag && !result.hasPublishTag) ||
  result.multiplePublishTags ||
  result.invalidPublishValues.length > 0;

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
  const missingTypeTags = results.filter((r) => !r.hasTypeTag);
  const multipleTypeTags = results.filter((r) => r.multipleTypeTags);
  const invalidTypeTags = results.filter((r) => r.invalidTypeTags.length > 0);
  const missingPublishTags = results.filter(
    (r) => r.requiresPublishTag && !r.hasPublishTag,
  );
  const multiplePublishTags = results.filter((r) => r.multiplePublishTags);
  const invalidPublishValues = results.filter(
    (r) => r.invalidPublishValues.length > 0,
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

  if (missingTypeTags.length > 0) {
    lines.push('❌ Projects missing exactly one type tag:');
    lines.push('');
    missingTypeTags.forEach((result) => {
      lines.push(`  - ${result.projectName}`);
    });
    lines.push('');
    lines.push(`   Valid values: ${VALID_TYPE_TAGS.join(', ')}.`);
    lines.push('');
  }

  if (multipleTypeTags.length > 0) {
    lines.push('❌ Projects with multiple type tags:');
    lines.push('');
    multipleTypeTags.forEach((result) => {
      lines.push(`  - ${result.projectName}`);
    });
    lines.push('');
  }

  if (invalidTypeTags.length > 0) {
    lines.push('❌ Projects with invalid type tags:');
    lines.push('');
    invalidTypeTags.forEach((result) => {
      lines.push(`  - ${result.projectName}:`);
      result.invalidTypeTags.forEach((tag) => {
        lines.push(
          `    • type:${tag} (must be one of ${VALID_TYPE_TAGS.join(', ')})`,
        );
      });
    });
    lines.push('');
  }

  if (missingPublishTags.length > 0) {
    lines.push(
      '❌ Projects requiring a publish tag (type:package / type:tool) that are missing or have duplicate publish tags:',
    );
    lines.push('');
    missingPublishTags.forEach((result) => {
      lines.push(`  - ${result.projectName}`);
    });
    lines.push('');
  }

  if (multiplePublishTags.length > 0) {
    lines.push('❌ Projects with multiple publish tags:');
    lines.push('');
    multiplePublishTags.forEach((result) => {
      lines.push(`  - ${result.projectName}`);
    });
    lines.push('');
  }

  if (invalidPublishValues.length > 0) {
    lines.push('❌ Projects with invalid publish tags:');
    lines.push('');
    invalidPublishValues.forEach((result) => {
      lines.push(`  - ${result.projectName}:`);
      result.invalidPublishValues.forEach((value) => {
        lines.push(`    • publish:${value} (must be true or false)`);
      });
    });
    lines.push('');
  }

  const hasErrors =
    missingTechnologyTags.length > 0 ||
    missingProductionTags.length > 0 ||
    multipleProductionTags.length > 0 ||
    invalidTechnologyTags.length > 0 ||
    invalidProductionTags.length > 0 ||
    missingTypeTags.length > 0 ||
    multipleTypeTags.length > 0 ||
    invalidTypeTags.length > 0 ||
    missingPublishTags.length > 0 ||
    multiplePublishTags.length > 0 ||
    invalidPublishValues.length > 0;

  if (!hasErrors) {
    lines.push(
      '✅ All projects have valid technology, production, type, and publish tags!',
    );
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
 * @description Main function to validate project tags across all projects
 */
const main = async (): Promise<void> => {
  logger.step(
    'Validating technology, production, type, and publish tags across all NX projects...',
  );
  logger.blank();

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
    logger.info(output);

    if (hasValidationErrors(results)) {
      logger.info('For more information, see: docs/monorepo/NX/tags.md');
      logger.blank();
      logger.info(
        "To view a project's tags, run: nx show project <project-name>",
      );

      process.exit(1);
    }
  } catch (error) {
    logger.fail(`Error validating project tags: ${String(error)}`);

    process.exit(1);
  }

  process.exit(0);
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
