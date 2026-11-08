import type { Repository } from './repository.entity.ts';

export interface MergeDetectedRemoteResult {
  /** True when the provisional row merged into an existing canonical row. */
  readonly merged: boolean;
  /** The surviving repository (canonical on merge, promoted otherwise). */
  readonly repository: Repository;
  /** Project link dropped from the provisional row on merge (canonical wins). */
  readonly supersededProjectId: string | null;
}
