import { execSync } from 'child_process';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join, relative } from 'path';

/**
 * @description Directories to exclude when searching for package.json files
 */
const EXCLUDED_DIRECTORIES = [
  '.cache',
  '.cursor',
  '.git',
  '.nx',
  '.react-email',
  '.venv',
  '.vscode',
  'build',
  'coverage',
  'dist',
  'learning',
  'node_modules',
] as const;

/**
 * @description Directories that should have NX configuration
 */
const NX_PROJECT_DIRECTORIES = ['applications', 'packages', 'tools'] as const;

/**
 * @description Interface for package.json structure
 */
interface PackageJson {
  readonly name?: string;
  readonly nx?: {
    readonly [key: string]: unknown;
  };
  readonly private?: boolean;
}

/**
 * @description Result of auditing a single package.json file
 */
interface AuditResult {
  readonly filePath: string;
  readonly hasNxConfig: boolean;
  readonly projectName: string | undefined;
  readonly reason?: string;
  readonly shouldHaveNxConfig: boolean;
}

/**
 * @description Checks if a path should be excluded from the audit
 */
const shouldExcludePath = (filePath: string): boolean => {
  const normalizedPath = filePath.replace(/\\/g, '/');

  // Check for excluded directories anywhere in the path
  return EXCLUDED_DIRECTORIES.some((dir) => {
    // Match directory at any level, but ensure it's a directory boundary
    const regex = new RegExp(
      `(^|/)${dir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(/|$)`,
    );

    return regex.test(normalizedPath);
  });
};

/**
 * @description Determines if a package.json file should have NX configuration
 */
const shouldHaveNxConfig = (
  filePath: string,
): { should: boolean; reason?: string } => {
  const normalizedPath = filePath.replace(/\\/g, '/');
  const _relativePath = relative(process.cwd(), filePath).replace(/\\/g, '/');

  // Root package.json doesn't need nx config (it's the workspace root)
  if (filePath === join(process.cwd(), 'package.json')) {
    return { reason: 'Root workspace package.json', should: false };
  }

  // Check if it's a template file (these are generators, not actual projects)
  if (normalizedPath.includes('/tools/generators/src/generators/')) {
    return { reason: 'Template file for generators', should: false };
  }

  // Check if it's in a directory that should have NX projects
  const isInNxProjectDirectory = NX_PROJECT_DIRECTORIES.some((dir) =>
    normalizedPath.startsWith(join(process.cwd(), dir).replace(/\\/g, '/')),
  );

  if (isInNxProjectDirectory) {
    return {
      reason: `Located in ${NX_PROJECT_DIRECTORIES.find((dir) => normalizedPath.includes(`/${dir}/`))} directory`,
      should: true,
    };
  }

  // Default: if it's not in excluded directories and not root, it might need config
  // But we'll be conservative and only flag ones in known project directories
  return { reason: 'Not in a known NX project directory', should: false };
};

/**
 * @description Finds all package.json files in the workspace
 */
const findAllPackageJsonFiles = (): readonly string[] => {
  try {
    // Use find command to locate all package.json files
    const isWindowsPlatform = process.platform === 'win32';
    const command = isWindowsPlatform
      ? 'powershell -Command "Get-ChildItem -Recurse -Filter package.json | ForEach-Object { $_.FullName }"'
      : 'find . -name "package.json" -type f';

    const output = execSync(command, {
      cwd: process.cwd(),
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });

    const files = output
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((filePath) => {
        // Convert to absolute path
        if (filePath.startsWith('./')) {
          return join(process.cwd(), filePath.slice(2));
        }
        if (!filePath.startsWith(process.cwd())) {
          return join(process.cwd(), filePath);
        }
        return filePath;
      })
      .filter((filePath) => {
        // Filter out excluded paths
        return !shouldExcludePath(filePath);
      });

    return files;
  } catch (error) {
    console.error('Error finding package.json files:', error);
    return [];
  }
};

/**
 * @description Reads and parses a package.json file
 */
const readPackageJson = (filePath: string): PackageJson | null => {
  try {
    if (!existsSync(filePath)) {
      return null;
    }
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as PackageJson;
  } catch {
    return null;
  }
};

/**
 * @description Audits a single package.json file
 */
const auditPackageJson = (filePath: string): AuditResult | null => {
  const packageJson = readPackageJson(filePath);
  if (!packageJson) {
    return null;
  }

  const { should, reason } = shouldHaveNxConfig(filePath);
  const hasNxConfig = !!packageJson.nx;

  return {
    filePath: relative(process.cwd(), filePath),
    hasNxConfig,
    projectName: packageJson.name,
    reason,
    shouldHaveNxConfig: should,
  };
};

/**
 * @description Formats audit results for display
 */
const formatResults = (results: readonly AuditResult[]): string => {
  const missingNxConfig = results.filter(
    (r) => r.shouldHaveNxConfig && !r.hasNxConfig,
  );

  const hasNxConfig = results.filter(
    (r) => r.shouldHaveNxConfig && r.hasNxConfig,
  );

  const unexpectedNxConfig = results.filter((r) => {
    const generatorPath = 'tools/generators/src/generators/';
    const isGeneratorTemplate = r.filePath.startsWith(generatorPath);

    if (isGeneratorTemplate) return false;
    if (r.projectName === 'monorepo') return false;

    return !r.shouldHaveNxConfig && r.hasNxConfig;
  });

  const lines: string[] = [];

  lines.push('📊 NX Package.json Audit Results\n');
  lines.push(`Total package.json files found: ${results.length}`);
  lines.push(
    `Files that should have NX config: ${results.filter((r) => r.shouldHaveNxConfig).length}`,
  );
  lines.push(`Files with NX config: ${hasNxConfig.length}`);
  lines.push(`Files missing NX config: ${missingNxConfig.length}`);
  lines.push('');

  if (missingNxConfig.length > 0) {
    lines.push('❌ Package.json files missing NX configuration:');
    lines.push('');
    missingNxConfig.forEach((result) => {
      lines.push(`  - ${result.filePath}`);
      lines.push(`    Project: ${result.projectName || 'N/A'}`);
      lines.push(`    Reason: ${result.reason}`);
      lines.push('');
    });
  }

  if (unexpectedNxConfig.length > 0) {
    lines.push('⚠️  Package.json files with NX config but may not need it:');
    lines.push('');
    unexpectedNxConfig.forEach((result) => {
      lines.push(`  - ${result.filePath}`);
      lines.push(`    Project: ${result.projectName || 'N/A'}`);
      lines.push(`    Reason: ${result.reason}`);
      lines.push('');
    });
  }

  if (missingNxConfig.length === 0 && unexpectedNxConfig.length === 0) {
    lines.push('✅ All package.json files have appropriate NX configuration!');
  }

  return lines.join('\n');
};

/**
 * @description Generates JSON report of audit results
 */
const generateJsonReport = (results: readonly AuditResult[]): string => {
  const report = {
    filesMissingNxConfig: results.filter(
      (r) => r.shouldHaveNxConfig && !r.hasNxConfig,
    ),
    filesWithNxConfig: results.filter((r) => r.hasNxConfig).length,
    summary: {
      hasNxConfig: results.filter((r) => r.hasNxConfig).length,
      missingNxConfig: results.filter(
        (r) => r.shouldHaveNxConfig && !r.hasNxConfig,
      ).length,
      shouldHaveNxConfig: results.filter((r) => r.shouldHaveNxConfig).length,
      total: results.length,
    },
    totalFiles: results.length,
  };

  return JSON.stringify(report, null, 2);
};

/**
 * @description Main function to audit all package.json files
 */
const main = async (): Promise<void> => {
  console.log('🔍 Auditing package.json files for NX configuration...\n');

  try {
    const packageJsonFiles = findAllPackageJsonFiles();
    console.log(`Found ${packageJsonFiles.length} package.json files\n`);

    const results: AuditResult[] = [];

    for (const filePath of packageJsonFiles) {
      const result = auditPackageJson(filePath);
      if (result) {
        results.push(result);
      }
    }

    const output = formatResults(results);
    console.log(output);

    // Generate JSON report
    const jsonReport = generateJsonReport(results);
    const reportPath = join(
      process.cwd(),
      '.cursor',
      'plans',
      'nx-validate-confgurations-report.json',
    );
    writeFileSync(reportPath, jsonReport, 'utf-8');
    console.log(
      `\n📄 JSON report saved to: ${relative(process.cwd(), reportPath)}`,
    );

    const missingCount = results.filter(
      (r) => r.shouldHaveNxConfig && !r.hasNxConfig,
    ).length;

    if (missingCount > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error auditing package.json files:', error);
    process.exit(1);
  }

  process.exit(0);
};

main();
