/**
 * @description Copyable Nx commands that bridge the portal to local @tools/generators usage.
 */

export interface GeneratorNxPreset {
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
      command: `NX_ISOLATE_PLUGINS=false nx g @tools/generators:${q} --list=destinations`,
      description:
        'Example: list one dynamic option key (replace destinations with a key from --describe if this fails)',
      id: 'list-destinations-example',
    },
  ];
};
