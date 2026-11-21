import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import type { BaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import type { Mock } from 'vitest';

import type { CustomPrompt } from './custom-prompt.entity.ts';
import type { CUSTOM_PROMPT_TYPES } from './custom-prompts.constants.ts';
import type { CustomPromptsRepository } from './custom-prompts.repository.ts';

/**
 * @public
 */
export type CustomPromptType = (typeof CUSTOM_PROMPT_TYPES)[number];

/**
 * @description Scalar/column fields of {@link CustomPrompt} (no relations). Use to type DTOs
 * that mirror the entity.
 * @public
 */
export type CustomPromptData = Omit<CustomPrompt, 'project' | 'user'>;

/**
 * @description Filters for {@link CustomPromptsRepository.listFiltered}; every filter is
 * optional (`null` means "do not filter"). Soft-deleted prompts are listed only with
 * `includeDeleted`. `viewerUserId` is the visibility scope: a user id keeps that user's rows
 * plus system rows (`user_id IS NULL`), `null` keeps system rows only, and `undefined` applies
 * no scope (system-level callers only, never a client request).
 * @public
 */
export interface ListCustomPromptsFilter {
  readonly includeDeleted: boolean;
  readonly labels: readonly string[] | null;
  readonly projectId: string | null;
  readonly promptType: CustomPromptType | null;
  readonly search: string | null;
  readonly userId: string | null;
  readonly viewerUserId: string | null | undefined;
}

/**
 * @description A {@link CustomPromptsRepository} mock: every inherited `BaseRepository` method
 * plus the custom-prompt ones.
 * @public
 */
export interface CustomPromptsRepositoryMock extends BaseRepositoryMock<
  CustomPrompt,
  CreateModelInput<CustomPrompt>
> {
  readonly findIncludingDeleted: Mock<
    CustomPromptsRepository['findIncludingDeleted']
  >;
  readonly findVisibleByFilePath: Mock<
    CustomPromptsRepository['findVisibleByFilePath']
  >;
  readonly findVisibleById: Mock<CustomPromptsRepository['findVisibleById']>;
  readonly hardDeleteById: Mock<CustomPromptsRepository['hardDeleteById']>;
  readonly listFiltered: Mock<CustomPromptsRepository['listFiltered']>;
  readonly restoreById: Mock<CustomPromptsRepository['restoreById']>;
  readonly softDeleteById: Mock<CustomPromptsRepository['softDeleteById']>;
}
