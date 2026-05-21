/**
 * @description Copyable Nx commands that bridge the portal to local @tools/generators usage.
 */

interface GeneratorNxPreset {
  readonly command: string;
  readonly description: string;
  readonly id: string;
}

/**
 * @description Presets for running generators from the repo root with documented NX_ISOLATE_PLUGINS=false prefix.
 */
export const buildGeneratorNxPresets = (
  generatorName: string,
): readonly GeneratorNxPreset[] => {
  const q = generatorName;

  return [
    {
      command: 'NX_ISOLATE_PLUGINS=false nx list @tools/generators',
      description: 'List installed generators in @tools/generators',
      id: 'list-generators',
    },
    {
      command: `NX_ISOLATE_PLUGINS=false nx g @tools/generators:${q} --describe`,
      description: 'Print full schema and flags for this generator',
      id: 'describe',
    },
    {
      command: `NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:${q} --describe`,
      description:
        'Same as describe using pnpm nx (matches workspace guidance in AGENTS.md)',
      id: 'describe-pnpm',
    },
    {
      command: `NX_ISOLATE_PLUGINS=false nx g @tools/generators:${q} --dry-run`,
      description:
        'Preview files that would be created or updated (add flags from --describe as needed)',
      id: 'dry-run',
    },
    {
      command: `NX_ISOLATE_PLUGINS=false nx g @tools/generators:${q} --list=destinations`,
      description:
        'Example: list one dynamic option key (replace destinations with a key from --describe if this fails)',
      id: 'list-destinations-example',
    },
  ];
};
