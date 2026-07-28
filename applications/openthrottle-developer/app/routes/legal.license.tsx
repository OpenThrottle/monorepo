import * as React from 'react';
import {
  GlobalHeading,
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { BookOpenIcon } from 'lucide-react';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/legal.license';
import { Link } from 'react-router';
import {
  OPENTHROTTLE_CONTACT_PORTFOLIO,
  OPENTHROTTLE_CONTACT_PORTFOLIO_REF,
} from '@openthrottle/react-router-utils';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'License',
  links: (_match) => [{ children: 'Legal', to: '/legal' }],
};

export const loader = async (_args: Route.LoaderArgs) => {
  return {};
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta = (_args: Route.MetaArgs) => {
  return [{ title: `License | ${SITE_TITLE}` }];
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
          title="License"
        />

        <div className="text-muted-foreground max-w-3xl space-y-4 text-sm md:space-y-8">
          <p>
            Copyright (c) 2026 Matthew Scholta -{' '}
            <Link
              className="hover:text-foreground underline underline-offset-4 transition-colors"
              target="_blank"
              to={OPENTHROTTLE_CONTACT_PORTFOLIO_REF}
            >
              {OPENTHROTTLE_CONTACT_PORTFOLIO}
            </Link>
          </p>
          <p>
            OpenThrottle is{' '}
            <strong className="text-foreground">open core</strong>. The
            OpenThrottle core — its applications, packages, and tooling — is
            licensed under the{' '}
            <strong className="text-foreground">
              Apache License, Version 2.0
            </strong>
            . Commercial and enterprise modules are reserved under a separate
            End User License Agreement (EULA); none exist today, so all current
            first-party code is Apache-2.0.
          </p>

          <h2 className="text-foreground font-medium">
            What the Apache-2.0 license grants
          </h2>
          <p>
            You may use, copy, modify, and distribute the core — including for
            commercial and production purposes — free of charge, subject to the
            terms of the Apache License, Version 2.0. The license includes an
            express patent grant from contributors, and requires that copies
            retain the license and applicable notices.
          </p>

          <h2 className="text-foreground font-medium">Trademarks</h2>
          <p>
            The license does not grant permission to use the OpenThrottle name,
            logo, or other marks, except as required to describe the origin of
            the software (Apache-2.0 §6). You are free to fork the code; the
            brand remains reserved.
          </p>

          <h2 className="text-foreground font-medium">Contributions</h2>
          <p>
            Contributions are welcome and, while the project is early-stage,
            scoped to smaller targeted fixes; discuss anything larger in an
            issue first. Contributors sign off under the Developer Certificate
            of Origin (a "Signed-off-by" line, added with git commit -s), and
            contributed core code is redistributed under Apache-2.0.
          </p>

          <h2 className="text-foreground font-medium">
            Third-party components
          </h2>
          <p>
            OpenThrottle incorporates or depends upon third-party and
            open-source components governed by their own license terms. Nothing
            here limits Your rights under, or grants rights that supersede, the
            license terms of any such component.
          </p>

          <h2 className="text-foreground font-medium">
            Disclaimer of warranty and liability
          </h2>
          <p>
            Unless required by applicable law or agreed to in writing, the
            software is provided on an "AS IS" BASIS, WITHOUT WARRANTIES OR
            CONDITIONS OF ANY KIND, either express or implied, including any
            warranties of TITLE, NON-INFRINGEMENT, MERCHANTABILITY, or FITNESS
            FOR A PARTICULAR PURPOSE. In no event shall any contributor be
            liable for any damages arising out of the use or inability to use
            the software. See the Apache License, Version 2.0 for the governing
            terms.
          </p>

          <p>
            The full license text lives in the LICENSE file at the repository
            root, and the open-core boundary is described in LICENSING.md. For
            commercial licensing or questions, contact{' '}
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
