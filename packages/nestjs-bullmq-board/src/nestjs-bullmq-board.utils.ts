/**
 * Single source of truth for whether the Bull Board dashboard should mount.
 *
 * The dashboard is internet-reachable and guarded only by a single shared
 * static basic-auth credential, so it must stay off in production. Both the
 * root opt-in ({@link NestjsBullmqBoardModule.forRoot}) and the per-queue
 * registrations ({@link NestjsBullmqBoardModule.forFeature}) must agree on this
 * value: `forFeature` mounts a `BullBoardFeatureModule` that injects the
 * `bull_board_instance` provider, which only `forRoot` supplies, so a
 * `forFeature` that outlives a disabled root throws Nest's
 * `UnknownDependenciesException` at boot.
 *
 * @public
 */
export const isBullBoardEnabled = (): boolean => {
  return process.env.NODE_ENV !== 'production';
};
