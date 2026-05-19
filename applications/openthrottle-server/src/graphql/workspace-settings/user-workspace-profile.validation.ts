/**
 * @description Validates workspace profile contact fields and editor preferences per
 * workspace-settings-graphql-design.md.
 */

import type { WorkspaceEditorId } from '@openthrottle/nestjs-repositories';
import { isWorkspaceEditorId } from '@openthrottle/nestjs-repositories';
import type { WorkspaceEditorIdEnum } from './workspace-editor-id.enum';

const MAX_CONTACT_DISPLAY_NAME_LEN = 256;
const MAX_CONTACT_EMAIL_LEN = 320;
const CONTACT_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * @description Validates optional contact display name; returns null when omitted or blank.
 */
export const validateContactDisplayName = (
  raw: string | null | undefined,
): string | null => {
  if (raw === undefined || raw === null) return null;
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  if (trimmed.length > MAX_CONTACT_DISPLAY_NAME_LEN) {
    throw new Error(
      `contactDisplayName must be at most ${MAX_CONTACT_DISPLAY_NAME_LEN} characters`,
    );
  }
  return trimmed;
};

/**
 * @description Validates optional contact email; returns null when omitted or blank.
 */
export const validateContactEmail = (
  raw: string | null | undefined,
): string | null => {
  if (raw === undefined || raw === null) return null;
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  if (trimmed.length > MAX_CONTACT_EMAIL_LEN) {
    throw new Error(
      `contactEmail must be at most ${MAX_CONTACT_EMAIL_LEN} characters`,
    );
  }
  if (!CONTACT_EMAIL_REGEX.test(trimmed)) {
    throw new Error('contactEmail must be a valid email address');
  }
  return trimmed;
};

/**
 * @description Validates enabled editor list for update; returns undefined when omitted.
 * Deduplicates while preserving first-seen order.
 */
export const validateEnabledEditors = (
  raw: readonly WorkspaceEditorIdEnum[] | null | undefined,
): WorkspaceEditorId[] | undefined => {
  if (raw === undefined || raw === null) return undefined;

  const seen = new Set<WorkspaceEditorId>();
  const normalized: WorkspaceEditorId[] = [];

  for (const entry of raw) {
    const value = String(entry);
    if (!isWorkspaceEditorId(value)) {
      throw new Error(
        `enabledEditors contains unknown editor id "${value}"; supported: cursor, vscode`,
      );
    }
    if (seen.has(value)) continue;
    seen.add(value);
    normalized.push(value);
  }

  return normalized;
};
