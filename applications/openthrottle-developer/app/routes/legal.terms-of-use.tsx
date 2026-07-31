import * as React from 'react';
import {
  GlobalHeading,
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { BookOpenIcon } from 'lucide-react';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/legal.terms-of-use';
import { Link } from 'react-router';
import {
  OPENTHROTTLE_CONTACT_PORTFOLIO,
  OPENTHROTTLE_CONTACT_PORTFOLIO_REF,
} from '@openthrottle/react-router-utils';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Terms of use',
  links: (_match) => [{ children: 'Legal', to: '/legal' }],
};

export const loader = async (_args: Route.LoaderArgs) => {
  return {};
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta = (_args: Route.MetaArgs) => {
  return [{ title: `Terms of use | ${SITE_TITLE}` }];
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
          title="Terms of use"
        />

        <div className="text-muted-foreground max-w-3xl space-y-4 text-sm md:space-y-8">
          <h2 className="text-foreground font-medium">Acceptance of terms</h2>
          <p>
            By accessing or using this site you agree to these terms of use. If
            you do not agree, please do not use the site. These terms may be
            updated from time to time, and continued use after an update
            constitutes acceptance of the revised terms.
          </p>

          <h2 className="text-foreground font-medium">About this site</h2>
          <p>
            OpenThrottle is an open-source product, built and stewarded by
            Matthew Scholta, and this site is its Developer application. It is
            offered free of charge, on an as-is basis. That as-is footing is a
            deliberate stance for an actively developed, open-core product — not
            a measure of how seriously it is built: there is no service-level
            agreement, uptime guarantee, or commitment to maintain any
            particular feature, and the software may change as the product
            evolves.
          </p>

          <h2 className="text-foreground font-medium">Acceptable use</h2>
          <p>
            You agree to use the site only for lawful, personal, and
            non-disruptive purposes. You agree not to: scrape or harvest content
            at a volume or rate that interferes with normal operation, attempt
            to reverse engineer, probe, or exploit non-public endpoints, run
            automated attacks of any kind (including denial of service,
            credential stuffing, or vulnerability scanning without permission),
            upload or transmit malicious code, or otherwise attempt to gain
            unauthorized access to the site, its infrastructure, or related
            systems.
          </p>

          <h2 className="text-foreground font-medium">
            Intellectual property and source code
          </h2>
          <p>
            The OpenThrottle core that powers this site — its applications,
            packages, and tooling — is open source, licensed under the Apache
            License, Version 2.0. OpenThrottle is open-core: commercial and
            enterprise modules are reserved under a separate license, and none
            exist today, so all current first-party code is Apache-2.0. You can
            read the full terms at{' '}
            <Link
              className="hover:text-foreground underline underline-offset-4 transition-colors"
              to="/legal/license"
            >
              /legal/license
            </Link>
            . Any rights and obligations relating to the source code are
            governed by that license. Site copy, written content, and any
            non-code assets remain the property of their respective authors and
            are not implicitly licensed by these terms.
          </p>

          <h2 className="text-foreground font-medium">Third-party links</h2>
          <p>
            The site may link to or embed content from third parties such as
            GitHub, the hosting and content delivery provider, and other
            external services. Those services are operated independently and
            have their own terms and privacy practices. Following an external
            link or interacting with embedded third-party content is treated as
            leaving this site, and no endorsement of any linked party is
            implied.
          </p>

          <h2 className="text-foreground font-medium">
            Disclaimer of warranties
          </h2>
          <p>
            THE SITE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot;
            WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT
            LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
            PARTICULAR PURPOSE, AND NONINFRINGEMENT. NO WARRANTY IS MADE THAT
            THE SITE WILL BE UNINTERRUPTED, ERROR-FREE, SECURE, OR FREE FROM
            HARMFUL COMPONENTS.
          </p>

          <h2 className="text-foreground font-medium">
            Limitation of liability
          </h2>
          <p>
            IN NO EVENT SHALL THE AUTHORS, MAINTAINERS, OR COPYRIGHT HOLDERS BE
            LIABLE FOR ANY CLAIM, DAMAGES, OR OTHER LIABILITY, WHETHER IN AN
            ACTION OF CONTRACT, TORT, OR OTHERWISE, ARISING FROM, OUT OF, OR IN
            CONNECTION WITH THE SITE, ITS CONTENT, OR THE USE OR OTHER DEALINGS
            WITH THE SITE. To the maximum extent permitted by applicable law,
            your sole remedy for dissatisfaction with the site is to stop using
            it.
          </p>

          <h2 className="text-foreground font-medium">
            Changes to these terms
          </h2>
          <p>
            These terms may be revised over time as the site evolves. Updates
            take effect when published on this page. It is your responsibility
            to review the terms periodically. Continued use of the site after an
            update constitutes acceptance of the revised terms.
          </p>

          <h2 className="text-foreground font-medium">Governing law</h2>
          <p>
            These terms are governed by the laws of the United States, without
            regard to conflict of law principles. Any disputes that cannot be
            resolved informally shall be brought in a court of competent
            jurisdiction in the United States.
          </p>

          <h2 className="text-foreground font-medium">Contact</h2>
          <p>
            Questions or concerns about these terms can be directed to the
            maintainer at{' '}
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
