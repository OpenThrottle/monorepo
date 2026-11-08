import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';

import type { GlobalClsStore } from './global-cls.types.ts';
import type { GlobalClsUser } from './global-cls.types.ts';
import { applyGlobalClsUser } from './global-cls.utils.ts';

/**
 * @description Using our "GlobalClsModule" we can now use the "GlobalClsService"
 * to provide a type-safe way to interact with our CLS store.
 *
 * @description {@link applyGlobalClsUser} is bound as {@link GlobalClsService.setUser} at runtime via {@link GlobalClsModule}
 * because Nest provides the underlying {@link ClsService} singleton, not a true subclass instance.
 */
@Injectable()
export class GlobalClsService extends ClsService<GlobalClsStore> {
  /**
   * @description Stores {@link GlobalClsUser} for the active CLS context (typically after JWT/session validation).
   */
  setUser(user: GlobalClsUser): void {
    applyGlobalClsUser(this, user);
  }
}
