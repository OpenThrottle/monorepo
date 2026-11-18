import { BadRequestException } from '@nestjs/common';
import { AGENT_ASSET_SLUG_PATTERN } from '@openthrottle/openthrottle-skills';

/** @description Trims the surrounding whitespace a user typed around a tag. */
export const normalizeTag = (tag: string): string => {
  return tag.trim();
};

/**
 * @description Rejects a tag that is not a kebab-case slug (`AGENT_ASSET_SLUG_PATTERN`), with
 * an actionable message.
 * @throws BadRequestException when the tag is not kebab-case.
 */
export const assertKebabCaseTag = (tag: string): void => {
  if (!AGENT_ASSET_SLUG_PATTERN.test(tag)) {
    throw new BadRequestException(
      `Invalid tag "${tag}": tags must be kebab-case slugs (lowercase letters, digits, single hyphens; e.g. "pr-review").`,
    );
  }
};

/**
 * @description Rejects a vocabulary dimension other than `domain` or `phase`.
 * @throws BadRequestException for any other dimension.
 */
export const assertKnownDimension = (dimension: string): void => {
  if (dimension !== 'domain' && dimension !== 'phase') {
    throw new BadRequestException(
      `Invalid dimension "${dimension}": must be "domain" or "phase".`,
    );
  }
};
