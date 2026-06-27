import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { OPENTHROTTLE_WORKSPACE_MARKER } from '../workflow.js';

/**
 * Pins the README to the real marker constant so the documentation cannot
 * drift back to `pnpm-workspace.yaml` (or any other literal) while the code
 * keeps using `.openthrottle.mjs`.
 */
describe('OPENTHROTTLE_WORKSPACE_MARKER', () => {
  const packageRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
    '..',
    '..',
  );
  const readme = fs.readFileSync(path.join(packageRoot, 'README.md'), 'utf8');

  it('is the OpenThrottle workspace marker file name', () => {
    expect(OPENTHROTTLE_WORKSPACE_MARKER).toBe('.openthrottle.mjs');
  });

  it('matches the marker documented in the package README', () => {
    expect(readme).toContain(OPENTHROTTLE_WORKSPACE_MARKER);
  });
});
