import type { ClassProvider, Provider } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { EmitNotificationInterceptor } from '@openthrottle/nestjs-websockets';

import { GlobalClsAuthHook } from './auth/global-cls-auth-hook/global-cls-auth-hook.service.ts';
import { ServiceAccountAuthService } from './auth/service-account-auth/service-account-auth.service.ts';
import { PlanScheduleConflictFilter } from './graphql/plans/plan-enqueue/plan-schedule-conflict.filter.ts';
import { GlobalAuthGuard } from './guards/global-auth.guard.ts';
import { GqlJwtAuthGuard } from './guards/gql-jwt-auth.guard.ts';

/**
 * `multi` + `useClass` on the `APP_INTERCEPTOR` token is a runtime-valid Nest
 * pattern, but `ClassProvider` does not declare `multi` (only factory-style
 * providers do), so widen the annotation to permit it without an assertion.
 */
const emitNotificationInterceptorProvider: ClassProvider & {
  multi?: boolean;
} = {
  multi: true,
  provide: APP_INTERCEPTOR,
  useClass: EmitNotificationInterceptor,
};

export const appProviders: Provider[] = [
  GlobalClsAuthHook,
  GlobalAuthGuard,
  GqlJwtAuthGuard,
  ServiceAccountAuthService,
  {
    provide: APP_GUARD,
    useClass: GlobalAuthGuard,
  },
  {
    provide: APP_FILTER,
    useClass: PlanScheduleConflictFilter,
  },
  emitNotificationInterceptorProvider,
];
