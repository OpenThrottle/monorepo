import { CORE_COMPONENTS } from '../data/data.registry';
import type { CmsComponentRegistry } from '../types/cms-render';

/**
 * @description The core registry with a layout's own library components merged over it; a library
 * component wins over a core one of the same `typename`.
 * @public
 */
export const createComponentRegistry = (
  libraryComponents: CmsComponentRegistry,
): CmsComponentRegistry => {
  return { ...CORE_COMPONENTS, ...libraryComponents };
};
