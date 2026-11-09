import { getLogger } from '../logger.utils.ts';
/**
 * @description Export our logger configured for production or development
 * according to the environment.
 */
export const logger = getLogger();
