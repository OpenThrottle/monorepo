import { Injectable } from '@nestjs/common';
import { PureAbility, AbilityBuilder, MatchConditions } from '@casl/ability';
import { Policy, AppAbility, PolicyUser } from '~/common/guards/policies/types';
import { getAllowedActionsForResource } from '~/common/utils/permissions';

const lambdaMatcher = (matchConditions: MatchConditions) => matchConditions;


@Injectable()
export class <%= namePascal %>Policy implements Policy {
  static readonly resourceName = '<%= singularPascal %>';

  createForUser(user: PolicyUser) {
    const { can, build } = new AbilityBuilder<AppAbility>(PureAbility);

    const { permissions } = user;

    getAllowedActionsForResource('<%= singularKebab %>', permissions).forEach(
      (action) => {
        can(action, <%= namePascal %>Policy.resourceName);
      },
    );

    return build({
      conditionsMatcher: lambdaMatcher,
    });
  }
}
