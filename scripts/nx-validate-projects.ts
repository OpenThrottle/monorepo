import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join, relative } from 'path';
import { createLogger } from './lib/index.ts';

const logger = createLogger();

/**
 * @description Gets all registered NX projects
 */
const getRegisteredNxProjects = (): readonly string[] => {
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
 * @description Gets package name from package.json
 */
interface PackageJson {
  readonly name?: string;
  readonly nx?: {
    readonly [key: string]: unknown;
  };
}

const getPackageJsonName = (filePath: string): string | null => {
  try {
    if (!existsSync(filePath)) {
      return null;
    }

    const content = readFileSync(filePath, 'utf-8');
    const packageJson: PackageJson = JSON.parse(content);

    return packageJson.name || null;
  } catch {
    return null;
  }
};

/**
 * @description Finds all package.json files with NX config
 */
const findPackageJsonFilesWithNx = (): Array<{
  name: string | null;
  path: string;
}> => {
  try {
    const isWindowsPlatform = process.platform === 'win32';
    const command = isWindowsPlatform
      ? 'powershell -Command "Get-ChildItem -Recurse -Filter package.json | ForEach-Object { $_.FullName }"'
      : 'find . -name "package.json" -type f';

    const output = execSync(command, {
      cwd: process.cwd(),
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });

    const excludedDirs = [
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
    ];

    const files = output
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((filePath: string): string => {
        if (filePath.startsWith('./')) {
          return join(process.cwd(), filePath.slice(2));
        }

        if (!filePath.startsWith(process.cwd())) {
          return join(process.cwd(), filePath);
        }

        return filePath;
      })
      .filter((filePath) => {
        const normalizedPath = filePath.replace(/\\/g, '/');
        return !excludedDirs.some((dir) => {
          const regex = new RegExp(
            `(^|/)${dir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(/|$)`,
          );
          return regex.test(normalizedPath);
        });
      })
      .map((filePath) => {
        const packageJson = getPackageJsonName(filePath);

        if (!packageJson) {
          return null;
        }

        // Check if it has nx config
        try {
          const content = readFileSync(filePath, 'utf-8');
          const pkg: PackageJson = JSON.parse(content);

          if (pkg.nx) {
            return {
              name: packageJson,
              path: relative(process.cwd(), filePath),
            };
          }
        } catch {
          // Ignore parse errors
        }

        return null;
      })
      .filter(
        // (item): item is { path: string; name: string | null } => item !== null,
        (item) => item !== null,
      );

    return files;
  } catch (error) {
    logger.fail(`Error finding package.json files: ${String(error)}`);

    return [];
  }
};

/**
 * @description Main function
 */
const main = async (): Promise<void> => {
  logger.step(
    'Comparing package.json files with NX config against registered NX projects...',
  );
  logger.blank();

  try {
    const registeredProjects = getRegisteredNxProjects();
    const packageJsonFiles = findPackageJsonFilesWithNx();

    logger.info(`Registered NX projects: ${registeredProjects.length}`);
    logger.info(
      `Package.json files with NX config: ${packageJsonFiles.length}`,
    );
    logger.blank();

    const registeredSet = new Set(registeredProjects);
    const packageJsonNames = packageJsonFiles
      .map((f) => f.name)
      .filter((n): n is string => n !== null);
    const packageJsonSet = new Set(packageJsonNames);

    // Find package.json files with NX config that aren't registered
    const missingFromNx = packageJsonFiles.filter((file) => {
      const isTemplatesPackage = file.path.includes('tools/generators/');

      return file.name && !isTemplatesPackage && !registeredSet.has(file.name);
    });

    // Find registered projects that don't have a corresponding package.json with NX config
    const missingFromPackageJson = registeredProjects.filter(
      (name) => !packageJsonSet.has(name),
    );

    if (missingFromNx.length > 0) {
      logger.fail('Package.json files with NX config but not registered in NX:'); // prettier-ignore
      logger.blank();

      missingFromNx.forEach((file) => {
        logger.detail(file.path);
        logger.detail(`Package name: ${file.name}`);
        logger.blank();
      });
    }

    if (missingFromPackageJson.length > 0) {
      logger.warn(
        'Registered NX projects without corresponding package.json with NX config:',
      );
      logger.blank();
      missingFromPackageJson.forEach((name) => {
        logger.detail(name);
      });
      logger.blank();
    }

    if (missingFromNx.length === 0 && missingFromPackageJson.length === 0) {
      logger.success(
        'All package.json files with NX config are registered in NX!',
      );
    }

    // Summary
    logger.heading('Summary');
    logger.info(`  Registered projects: ${registeredProjects.length}`);
    logger.info(
      `  Package.json files with NX config: ${packageJsonFiles.length}`,
    );
    logger.info(`  Missing from NX: ${missingFromNx.length}`);
    logger.info(
      `  Missing from package.json: ${missingFromPackageJson.length}`,
    );

    if (missingFromNx.length > 0 || missingFromPackageJson.length > 0) {
      process.exit(1);
    }
  } catch (error) {
    logger.fail(`Error comparing projects: ${String(error)}`);
    process.exit(1);
  }

  process.exit(0);
};

main();
