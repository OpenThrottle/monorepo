import type {
  ServiceAccountsRepository,
  UsersRepository,
} from '@openthrottle/nestjs-repositories-server';

/** Repositories {@link getEditorNameForPrincipal} reads the caller's display name from. */
export interface PrincipalIdentityRepositories {
  readonly serviceAccountsRepository: ServiceAccountsRepository;
  readonly usersRepository: UsersRepository;
}
