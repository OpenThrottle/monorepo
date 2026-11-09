import type {
  ServiceAccountsService,
  UsersService,
} from '@openthrottle/nestjs-repositories';

/** Services {@link getEditorNameForPrincipal} reads the caller's display name from. */
export interface PrincipalIdentityServices {
  readonly serviceAccountsService: ServiceAccountsService;
  readonly usersService: UsersService;
}
