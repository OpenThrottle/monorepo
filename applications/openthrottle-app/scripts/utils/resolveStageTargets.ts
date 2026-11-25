import { STAGE_ARCH_TARGETS } from '../data/data.stage.ts';

export type StageArch = keyof typeof STAGE_ARCH_TARGETS;

export type ResolveStageTargetsResult =
  | {
      readonly arch: StageArch;
      readonly ok: true;
      readonly targets: readonly string[];
    }
  | { readonly ok: false; readonly reason: string };

const isStageArch = (value: string): value is StageArch => {
  return Object.hasOwn(STAGE_ARCH_TARGETS, value);
};

/**
 * @description Reads `--arch <arm64|x64|universal>` (or `--arch=<value>`) from
 * the stage script's argv; without one, stages for the host arch.
 */
export const resolveStageTargets = (
  argv: readonly string[],
  hostArch: string,
): ResolveStageTargetsResult => {
  const index = argv.findIndex(
    (arg) => arg === '--arch' || arg.startsWith('--arch='),
  );
  const flag = argv[index];
  const inline = flag?.startsWith('--arch=') === true;
  const value = inline ? flag?.slice('--arch='.length) : argv[index + 1];
  const arch = index === -1 ? hostArch : (value ?? '');

  if (!isStageArch(arch)) {
    return {
      ok: false,
      reason: `unsupported --arch "${arch}"; use ${Object.keys(STAGE_ARCH_TARGETS).join(', ')}`,
    };
  }

  return { arch, ok: true, targets: STAGE_ARCH_TARGETS[arch] };
};
