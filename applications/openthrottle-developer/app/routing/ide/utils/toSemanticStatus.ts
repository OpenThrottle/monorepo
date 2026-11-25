import type { IdeSemanticStatusValue } from '@openthrottle/react-router-ide';
import { IDE_SEMANTIC_STATUS } from '@openthrottle/react-router-ide';

/** Coerce the server's status string into the client's {@link IdeSemanticStatusValue} union. */
export const toSemanticStatus = (value: string): IdeSemanticStatusValue => {
  switch (value) {
    case 'failed':
      return IDE_SEMANTIC_STATUS.failed;
    case 'hostedOptInRequired':
      return IDE_SEMANTIC_STATUS.hostedOptInRequired;
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
