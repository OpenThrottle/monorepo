/**
 * @description Path policy for the single filesystem write the custom-prompt
 * resolver performs. `CustomPromptInput.filePath` is entirely client-supplied,
 * so the raw value is never trusted: a write target is refused unless it is a
 * workspace-relative path with no `..` segment whose resolved location stays
 * inside the realpath of the workspace root. Containment is checked against the
 * realpath of the deepest EXISTING ancestor, so a symlinked directory — or a
 * symlinked target file — that points outside the workspace is refused even
 * though `path.resolve` alone would have looked contained.
 *
 * Skill content is refused outright: `SKILL.md` has exactly one write path
 * (`writeSkillFileBySlug` in the developer app), which enforces provenance and
 * re-validates frontmatter. Allowing a prompt to target a SKILL.md would fork
 * an externally installed skill from upstream and bypass that gate entirely.
 */

import { existsSync, realpathSync } from 'node:fs';
import { basename, dirname, isAbsolute, resolve, sep } from 'node:path';

const SKILL_FILENAME = 'SKILL.md';

const PARENT_SEGMENT = '..';

/** @public Refusal reasons surfaced to the caller as a BadRequest message. */
export const CUSTOM_PROMPT_WRITE_REFUSAL = {
  absolutePath: `Refused: filePath must be relative to the workspace root, not an absolute path.`,
  emptyPath: `Refused: filePath is empty.`,
  escapesWorkspace: `Refused: filePath resolves outside the workspace root.`,
  parentSegment: `Refused: filePath must not contain a ".." segment.`,
  skillContent: `Refused: SKILL.md is written only through the skills surface, which enforces skill provenance and frontmatter validation.`,
  unresolvableRoot: `Refused: the workspace root could not be resolved on disk.`,
} as const;

/** @public Outcome of validating a client-supplied custom-prompt write target. */
export type ResolveCustomPromptWritePathResult =
  | { readonly absolutePath: string; readonly ok: true }
  | { readonly ok: false; readonly reason: string };

/**
 * @description Realpath of the deepest existing ancestor of `target` (the
 * target itself when it already exists). Returns null when nothing on the
 * chain can be resolved.
 */
const realpathOfNearestExistingAncestor = (target: string): string | null => {
  let current = target;

  while (true) {
    if (existsSync(current)) {
      try {
        return realpathSync(current);
      } catch {
        return null;
      }
    }

    const parent = dirname(current);
    if (parent === current) return null;

    current = parent;
  }
};

const isInside = (realRoot: string, candidate: string): boolean =>
  candidate === realRoot || candidate.startsWith(`${realRoot}${sep}`);

/**
 * @description Validates a client-supplied `filePath` against the workspace
 * root and returns the absolute path to write. Every refusal returns a reason
 * WITHOUT touching disk — no directory is created for a rejected path.
 */
export const resolveCustomPromptWritePath = (
  workspaceRoot: string,
  filePath: string,
): ResolveCustomPromptWritePathResult => {
  const trimmed = filePath.trim();
  if (trimmed.length === 0) {
    return { ok: false, reason: CUSTOM_PROMPT_WRITE_REFUSAL.emptyPath };
  }

  if (isAbsolute(trimmed)) {
    return { ok: false, reason: CUSTOM_PROMPT_WRITE_REFUSAL.absolutePath };
  }

  // Checked on the raw value: `resolve` normalizes `..` away, so a later
  // containment check alone cannot tell an escape attempt from a plain path.
  if (trimmed.split(/[\\/]/).includes(PARENT_SEGMENT)) {
    return { ok: false, reason: CUSTOM_PROMPT_WRITE_REFUSAL.parentSegment };
  }

  let realRoot: string;
  try {
    realRoot = realpathSync(workspaceRoot);
  } catch {
    return { ok: false, reason: CUSTOM_PROMPT_WRITE_REFUSAL.unresolvableRoot };
  }

  const absolutePath = resolve(realRoot, trimmed);

  if (basename(absolutePath).toLowerCase() === SKILL_FILENAME.toLowerCase()) {
    return { ok: false, reason: CUSTOM_PROMPT_WRITE_REFUSAL.skillContent };
  }

  const anchor = realpathOfNearestExistingAncestor(absolutePath);
  if (anchor == null || !isInside(realRoot, anchor)) {
    return { ok: false, reason: CUSTOM_PROMPT_WRITE_REFUSAL.escapesWorkspace };
  }

  return { absolutePath, ok: true };
};
