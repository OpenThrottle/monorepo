import * as React from 'react';
import {
  GlobalHeading,
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { BookOpenIcon } from 'lucide-react';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/legal.privacy-policy';
import { Link } from 'react-router';
import {
  OPENTHROTTLE_CONTACT_PORTFOLIO,
  OPENTHROTTLE_CONTACT_PORTFOLIO_REF,
} from '@openthrottle/react-router-utils';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Privacy policy',
  links: (_match) => [{ children: 'Legal', to: '/legal' }],
};

export const loader = async (_args: Route.LoaderArgs) => {
  return {};
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta = (_args: Route.MetaArgs) => {
  return [{ title: `Privacy policy | ${SITE_TITLE}` }];
};

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData: _a, loaderData: _l, matches: _m, params: _p } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen>
      <div>
        <GlobalHeading
          className="mb-4"
          heading="h1"
          icon={BookOpenIcon}
          title="Privacy policy"
        />

        <div className="text-muted-foreground max-w-3xl space-y-4 text-sm md:space-y-8">
          <p>
            OpenThrottle is an open-source product, built and stewarded by
            Matthew Scholta, and this site is its Developer application.
            Collecting as little as possible is a deliberate design choice:
            there are no accounts and no cross-site tracking. This policy
            describes, in plain terms, what is and is not collected when you
            visit, and how that information is used. The site is provided as is,
            and this policy may evolve as the product evolves.
          </p>

          <h2 className="text-foreground font-medium">Information collected</h2>
          <p>
            No accounts, sign-ups, or personally identifying information are
            required to browse this site. The site does not ask for your name,
            email address, phone number, or payment details, and does not
            maintain a user database. Standard server and platform logs (such as
            IP address, user agent, referrer, requested URL, and timestamp) may
            be recorded by the hosting provider for security, abuse prevention,
            and basic operational metrics. Aggregate, non-identifying analytics
            may also be collected to understand which pages are visited.
          </p>

          <h2 className="text-foreground font-medium">
            Cookies and local storage
          </h2>
          <p>
            The site uses a minimal set of cookies and browser local storage to
            remember preferences such as theme selection and to keep the
            interface working correctly. These are not used to track you across
            other sites. You can clear cookies and local storage at any time
            from your browser settings; the site will continue to function with
            reduced personalization.
          </p>

          <h2 className="text-foreground font-medium">Third-party services</h2>
          <p>
            Pages may load resources from or link out to third-party services,
            including GitHub (for source code, avatars, and discussions), the
            hosting and content delivery provider that serves this site, and,
            where enabled, a privacy-respecting analytics provider. Each of
            these services has its own privacy practices, and any data they
            collect when you interact with them is governed by their own
            policies. Following an external link is treated as leaving this
            site.
          </p>

          <h2 className="text-foreground font-medium">
            Data retention and your rights
          </h2>
          <p>
            Operational logs and aggregate analytics are retained only as long
            as needed for security and basic reporting, and are then rotated or
            deleted by the underlying providers. Because the site does not
            maintain user accounts, there is generally no personal profile to
            access, correct, or delete. If you believe information related to
            you has been recorded and you would like it reviewed or removed, you
            can request access or deletion by contacting the maintainer using
            the link below.
          </p>

          <h2 className="text-foreground font-medium">
            Children&apos;s privacy
          </h2>
          <p>
            This site is not directed to children under the age of 13, and it
            does not knowingly collect personal information from children. If
            you believe a child has provided personal information through this
            site, please get in touch so it can be removed.
          </p>

          <h2 className="text-foreground font-medium">
            Changes to this policy
          </h2>
          <p>
            This policy may be updated from time to time to reflect changes to
            the site, the tools it uses, or applicable best practices. Updates
            take effect when published on this page. Continued use of the site
            after an update constitutes acceptance of the revised policy.
          </p>

          <h2 className="text-foreground font-medium">Contact</h2>
          <p>
            Questions, requests, or concerns about this privacy policy can be
            directed to the maintainer at{' '}
            <Link
              className="hover:text-foreground underline underline-offset-4 transition-colors"
              target="_blank"
              to={OPENTHROTTLE_CONTACT_PORTFOLIO_REF}
            >
              {OPENTHROTTLE_CONTACT_PORTFOLIO}
            </Link>
            .
          </p>
        </div>
      </div>
    </GlobalScreen>
  );
}

export const action = async (_args: Route.ActionArgs) => {
  return {};
};

export const ErrorBoundary = GlobalErrorBoundary;
