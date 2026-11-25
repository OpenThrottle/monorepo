import {
  Badge,
  Button,
  Card,
  CardContent,
} from '@openthrottle/react-router-shadcn';
import { ShieldAlertIcon, ShieldCheckIcon } from 'lucide-react';
import * as React from 'react';
import { useFetcher, useRevalidator } from 'react-router';

import type { RepositoryCheckoutFieldsFragment } from '~/__generated__/graphql';
import type { action as agentConfigTrustAction } from '~/routes/resources.repository-agent-config-trust';
import { REPOSITORY_AGENT_CONFIG_TRUST_COPY } from '~/routing/settings/repositories/data/copy';
import { deriveAgentConfigTrust } from '~/routing/settings/repositories/utils/deriveAgentConfigTrust';
import { pluralSuffix } from '~/routing/settings/repositories/utils/pluralSuffix';

/** Resource-route action path backing the one-click trust action. */
const AGENT_CONFIG_TRUST_ACTION = '/resources/repository-agent-config-trust';

export interface RepositoryAgentConfigTrustProps {
  /** The user's checkouts of the repository; trust is flipped for all of them together. */
  checkouts: readonly RepositoryCheckoutFieldsFragment[];
  repositoryId: string;
}

/**
 * @description Repository detail card for the plan-run trust gate: whether plan runs may load the
 * repository's own hooks and MCP servers, how many it defines, and a one-click trust / revoke.
 */
export const RepositoryAgentConfigTrust = (
  props: RepositoryAgentConfigTrustProps,
): React.ReactElement => {
  const { checkouts, repositoryId } = props;

  // Hooks
  const fetcher = useFetcher<typeof agentConfigTrustAction>();
  const revalidator = useRevalidator();

  // Setup
  const copy = REPOSITORY_AGENT_CONFIG_TRUST_COPY;
  const view = deriveAgentConfigTrust(checkouts);
  const serverTrusted = view.kind === 'foreign' && view.trusted;
  const submitted = fetcher.formData?.get('trusted');
  const isSubmitting = fetcher.state !== 'idle';
  const showSubmitted = isSubmitting && submitted != null;
  const trusted = showSubmitted ? submitted === 'true' : serverTrusted;
  const errorMessage = fetcher.data?.errorMessage ?? null;
  const hookCount = view.kind === 'foreign' ? view.hookCount : null;
  const serverCount = view.kind === 'foreign' ? view.mcpServerCount : null;
  const hasCounts = hookCount !== null && serverCount !== null;
  const hookTotal = hookCount ?? 0;
  const serverTotal = serverCount ?? 0;
  const hookWord = pluralSuffix(hookTotal, copy.hookSingular, copy.hookPlural);
  const serverWord = pluralSuffix(
    serverTotal,
    copy.serverSingular,
    copy.serverPlural,
  );
  const countsText = `${copy.wouldRunPrefix} ${hookTotal} ${hookWord} and ${serverTotal} ${serverWord}.`;
  const helpText = trusted ? copy.trustedHelp : copy.untrustedHelp;
  const buttonLabel = trusted ? copy.revokeButton : copy.trustButton;
  const buttonVariant = trusted ? 'secondary' : 'default';

  // Handlers
  const handleClick = (): void => {
    fetcher.submit(
      { repositoryId, trusted: String(!trusted) },
      { action: AGENT_CONFIG_TRUST_ACTION, method: 'post' },
    );
  };

  // Markup
  const alwaysTrusted = (
    <div className="space-y-2">
      <Badge variant="secondary">{copy.alwaysTrusted}</Badge>
      <p className="text-muted-foreground text-sm">{copy.alwaysTrustedHelp}</p>
    </div>
  );
  const trustedBadge = (
    <Badge variant="default">
      <ShieldCheckIcon aria-hidden={true} className="size-3" />
      {copy.trusted}
    </Badge>
  );
  const untrustedBadge = (
    <Badge variant="outline">
      <ShieldAlertIcon aria-hidden={true} className="size-3" />
      {copy.untrusted}
    </Badge>
  );
  const errorText = <p className="text-destructive text-xs">{errorMessage}</p>;
  const foreignState = (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-2">
        {trusted ? trustedBadge : untrustedBadge}
        <p className="text-sm" data-testid="RepositoryAgentConfigTrust-counts">
          {hasCounts ? countsText : copy.notScanned}
        </p>
        <p className="text-muted-foreground text-xs">{helpText}</p>
        {errorMessage == null ? null : errorText}
      </div>
      <Button
        className="shrink-0"
        data-testid="RepositoryAgentConfigTrust-action"
        disabled={isSubmitting}
        onClick={handleClick}
        size="xs"
        type="button"
        variant={buttonVariant}
      >
        {buttonLabel}
      </Button>
    </div>
  );

  // Life Cycle
  const revalidatedRef = React.useRef(false);
  React.useEffect(() => {
    // Refetch once a flip settles cleanly so the badge and checkouts reflect the persisted state.
    if (fetcher.state === 'idle' && fetcher.data != null) {
      if (!revalidatedRef.current && fetcher.data.errorMessage == null) {
        revalidatedRef.current = true;
        revalidator.revalidate();
      }
    } else {
      revalidatedRef.current = false;
    }
  }, [fetcher.state, fetcher.data, revalidator]);

  // 🔌 Short Circuit

  return (
    <Card data-testid="RepositoryAgentConfigTrust">
      <CardContent className="space-y-3">
        <h2 className="text-muted-foreground text-xs">{copy.heading}</h2>
        {view.kind === 'openthrottle' ? alwaysTrusted : foreignState}
      </CardContent>
    </Card>
  );
};
