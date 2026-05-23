import { execSync } from 'child_process';

/**
 * @description Valid technology tag values as defined in the reference document
 */
const VALID_TECHNOLOGY_TAGS = [
  'expo',
  'llm',
  'nestjs',
  'nodejs',
  'python',
  'react-native',
  'react-router',
  'react',
  'supabase',
  'terraform',
  'typescript',
] as const;

type ValidTechnologyTag = (typeof VALID_TECHNOLOGY_TAGS)[number];

/**
 * @description Validates that a technology tag value is in the allowed list
 */
const isValidTechnologyTag = (tag: string): tag is ValidTechnologyTag => {
  return VALID_TECHNOLOGY_TAGS.includes(tag as ValidTechnologyTag);
};

/**
 * @description Extracts technology tags from project tags
 */
const extractTechnologyTags = (tags: readonly string[]): string[] => {
  return tags
    .filter((tag) => tag.startsWith('technology:'))
    .map((tag) => tag.replace('technology:', ''));
};

const VALID_PRODUCTION_VALUES = ['true', 'false'] as const;

type ValidProductionValue = (typeof VALID_PRODUCTION_VALUES)[number];

/**
 * @description Extracts production tag values from project tags
 */
const extractProductionTags = (tags: readonly string[]): string[] => {
  return tags
    .filter((tag) => tag.startsWith('production:'))
    .map((tag) => tag.replace('production:', ''));
};

const isValidProductionValue = (
  value: string,
): value is ValidProductionValue => {
  return VALID_PRODUCTION_VALUES.includes(value as ValidProductionValue);
};

/**
 * @description Validates technology and production tags for a single project
 */
interface ValidationResult {
  readonly hasProductionTag: boolean;
  readonly hasTechnologyTag: boolean;
  readonly invalidProductionTags: readonly string[];
  readonly invalidTechnologyTags: readonly string[];
  readonly multipleProductionTags: boolean;
  readonly projectName: string;
  readonly technologyTags: readonly string[];
}

const validateProjectTags = (
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

  return {
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
 * @description Formats validation results for display
 */
const formatResults = (results: readonly ValidationResult[]): string => {
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

  const hasErrors =
    missingTechnologyTags.length > 0 ||
    missingProductionTags.length > 0 ||
    multipleProductionTags.length > 0 ||
    invalidTechnologyTags.length > 0 ||
    invalidProductionTags.length > 0;

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

    const hasErrors = results.some(
      (r) =>
        !r.hasTechnologyTag ||
        !r.hasProductionTag ||
        r.multipleProductionTags ||
        r.invalidTechnologyTags.length > 0 ||
        r.invalidProductionTags.length > 0,
    );

    if (hasErrors) {
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

main();
