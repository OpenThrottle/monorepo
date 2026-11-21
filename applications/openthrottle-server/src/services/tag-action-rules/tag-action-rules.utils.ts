import { BadRequestException } from '@nestjs/common';
import {
  isTagActionType,
  TAG_ACTION_TYPES,
  type TagActionType,
} from '@openthrottle/openthrottle-skills';

/**
 * @description Narrows a rule's action type, or throws the BadRequest naming the valid ones.
 * Shared by the upsert write path and the match preview so both reject an unknown type the same
 * way.
 */
export const assertTagActionType = (actionType: string): TagActionType => {
  if (!isTagActionType(actionType)) {
    throw new BadRequestException(
      `Unknown action type "${actionType}": expected one of ${Object.values(
        TAG_ACTION_TYPES,
      )
        .map((type) => {
          return `"${type}"`;
        })
        .join(', ')}.`,
    );
  }
  return actionType;
};
