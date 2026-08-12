import { IDE_SEMANTIC_STATUS } from '@openthrottle/react-router-ide';
import type { IdeSemanticStatus } from '@openthrottle/react-router-ide';

/** Coerce the server's status string into the client's {@link IdeSemanticStatus} union. */
export const toSemanticStatus = (value: string): IdeSemanticStatus => {
  switch (value) {
    case 'indexing':
      return IDE_SEMANTIC_STATUS.indexing;
    case 'notIndexed':
      return IDE_SEMANTIC_STATUS.notIndexed;
    case 'ready':
      return IDE_SEMANTIC_STATUS.ready;
    default:
      return IDE_SEMANTIC_STATUS.unavailable;
  }
};
