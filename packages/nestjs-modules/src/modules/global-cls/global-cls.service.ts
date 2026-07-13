import { ClsService, ClsStore } from 'nestjs-cls';
import type { GlobalClsUser } from './global-cls-user';

/**
 * @external https://papooch.github.io/nestjs-cls/features-and-use-cases/type-safety-and-type-inference#type-safe-clsservice
 * @description We want to define a type-safe store for our application which
 * helps with getting and setting data. We should keep this context as simple
 * as possible and avoid putting too much data in it.
 */
export interface GlobalClsStore extends ClsStore {
  app: {
    name: string;
    version: string;
  };

  /**
   * @description Raw `x-ot-session-id` request header, if present. An UNVALIDATED
   * client claim — consumers must verify the session's actor matches the request
   * principal before attributing work to it (work-ledger ambient attribution, G11).
   */
  sessionId?: string;

  /**
   * @description Present after auth populates it (see {@link applyGlobalClsUser});
   * omitted on public or pre-auth requests.
   */
  user?: GlobalClsUser;
}

/**
 * @description Writes {@link GlobalClsUser} into the CLS store. Use this when you hold a raw {@link ClsService} reference.
 */
export const applyGlobalClsUser = (
  cls: ClsService<GlobalClsStore>,
  user: GlobalClsUser,
): void => {
  cls.set('user', {
    displayName: user.displayName,
    email: user.email,
    isDeleted: user.isDeleted,
    permissions: user.permissions != null ? [...user.permissions] : undefined,
    roles: [...user.roles],
    uuid: user.uuid,
  });
};

/**
 * @description Using our "GlobalClsModule" we can now use the "GlobalClsService"
 * to provide a type-safe way to interact with our CLS store.
 *
 * @description {@link applyGlobalClsUser} is bound as {@link GlobalClsService.setUser} at runtime via {@link GlobalClsModule}
 * because Nest provides the underlying {@link ClsService} singleton, not a true subclass instance.
 */
export class GlobalClsService extends ClsService<GlobalClsStore> {
  /**
   * @description Stores {@link GlobalClsUser} for the active CLS context (typically after JWT/session validation).
   */
  setUser(user: GlobalClsUser): void {
    applyGlobalClsUser(this, user);
  }
}
