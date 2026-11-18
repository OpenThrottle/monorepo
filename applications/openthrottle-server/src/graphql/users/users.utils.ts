import { NotFoundException } from '@nestjs/common';

/**
 * @description Runs a repository write that throws {@link NotFoundException} for a missing row
 * and returns null for it instead, for GraphQL mutations whose result is nullable. Any other
 * error still propagates.
 */
export const nullIfNotFound = async <TValue>(
  write: () => Promise<TValue>,
): Promise<TValue | null> => {
  try {
    return await write();
  } catch (error) {
    if (error instanceof NotFoundException) {
      return null;
    }
    throw error;
  }
};
