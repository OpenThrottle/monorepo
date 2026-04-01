import { execSync } from 'child_process';

/**
 * @description Valid technology tag values as defined in the reference document
 */
const VALID_TECHNOLOGY_TAGS = [
  'expo',
  'llm',
  'nestjs',
  'python',
  'react-native',
  'react-router',
  'react',
  'supabase',
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

/**
 * @description Validates technology tags for a single project
 */
interface ValidationResult {
  readonly projectName: string;
  readonly hasTechnologyTag: boolean;
  readonly technologyTags: readonly string[];
  readonly invalidTags: readonly string[];
}

const validateProjectTags = (
  projectName: string,
  tags: readonly string[],
): ValidationResult => {
  const technologyTags = extractTechnologyTags(tags);
  const invalidTags = technologyTags.filter(
    (tag) => !isValidTechnologyTag(tag),
  );

  return {
    hasTechnologyTag: technologyTags.length > 0,
    invalidTags,
    projectName,
    technologyTags,
  };
};

/**
 * @description Formats validation results for display
 */
const formatResults = (results: readonly ValidationResult[]): string => {
  const missingTags = results.filter((r) => !r.hasTechnologyTag);
  const invalidTags = results.filter((r) => r.invalidTags.length > 0);

  const lines: string[] = [];

  if (missingTags.length > 0) {
    lines.push('❌ Projects missing technology tags:');
    lines.push('');
    missingTags.forEach((result) => {
      lines.push(`  - ${result.projectName}`);
    });
    lines.push('');
  }

  if (invalidTags.length > 0) {
    lines.push('❌ Projects with invalid technology tags:');
    lines.push('');
    invalidTags.forEach((result) => {
      lines.push(`  - ${result.projectName}:`);
      result.invalidTags.forEach((tag) => {
        lines.push(`    • technology:${tag} (not in reference document)`);
      });
    });
    lines.push('');
  }

  if (missingTags.length === 0 && invalidTags.length === 0) {
    lines.push('✅ All projects have valid technology tags!');
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
  console.log('🔍 Validating technology tags across all NX projects...\n');

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

    const hasTechnologyTag = results.some((r) => r.hasTechnologyTag);
    const hasInvalidTags = results.some((r) => r.invalidTags.length > 0);
    const hasErrors = !hasTechnologyTag || hasInvalidTags;

    if (hasErrors) {
      console.log('📚 For more information, see: docs/monorepo/NX/tags.md');
      console.log(
        "\n💡 To view a project's tags, run: nx show project <project-name>",
      );
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Error validating technology tags:', error);
    process.exit(1);
  }
};

main();
