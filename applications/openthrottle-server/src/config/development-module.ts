/**
 * @description Feature gate: the development-only GraphQL surface
 * (DevelopmentModule — ping + test websocket notification + sample JSONL log)
 * is registered everywhere EXCEPT production. Mirrors the `isBullBoardEnabled`
 * pattern for keeping a dev-only surface out of prod. The committed schema is
 * generated in a non-production environment, so the dev resolver fields stay
 * in the schema; only a running production process omits the module.
 */
export const isDevelopmentModuleEnabled = (): boolean =>
  process.env.NODE_ENV !== 'production';
