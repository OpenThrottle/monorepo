export interface NestjsBullmqBoardModuleOptions {
  /**
   * When false the Bull Board dashboard UI (the `/queues` route, job payloads,
   * queue internals, and retry/remove/clean actions) is NOT mounted. Defaults
   * to disabled so the dashboard is never exposed unless a consumer opts in.
   *
   * The dashboard is internet-reachable and guarded only by a single shared
   * static basic-auth credential, so it must stay off in production. Drive this
   * from the consumer's environment (e.g. `NODE_ENV !== 'production'`).
   */
  enabled?: boolean;
}
