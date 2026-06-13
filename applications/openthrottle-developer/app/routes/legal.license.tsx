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
          title="End User License Agreement"
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
            IMPORTANT — READ CAREFULLY. This End User License Agreement
            ("Agreement") is a legal agreement between you ("You") and Matthew
            Scholta ("Licensor") for the OpenThrottle software, including its
            source code, documentation, and associated assets (the "Software").
            By accessing, downloading, installing, or using the Software, You
            agree to be bound by this Agreement. If You do not agree, do not
            access or use the Software.
          </p>

          <h2 className="text-foreground font-medium">License grant</h2>
          <p>
            Subject to Your compliance with this Agreement, Licensor grants You
            a limited, non-exclusive, non-transferable, non-sublicensable,
            revocable license to view and study the Software's source code; to
            download, install, and run the Software on systems You own or
            control, solely for personal, non-commercial, and evaluation
            purposes; and to modify the Software solely for those purposes. Any
            use beyond this scope — including any production, commercial, or
            revenue-generating use — requires a separate written agreement with
            Licensor.
          </p>

          <h2 className="text-foreground font-medium">Restrictions</h2>
          <p>
            Except as expressly permitted above or by applicable law, You shall
            not use the Software for any commercial purpose; copy, distribute,
            publish, sell, rent, lease, lend, or otherwise transfer the Software
            to any third party; sublicense the Software or offer it as a hosted
            or managed service; remove or obscure proprietary notices; use the
            Licensor's name or trademarks to endorse derived products without
            permission; or represent the Software as Your own work.
          </p>

          <h2 className="text-foreground font-medium">Ownership</h2>
          <p>
            The Software is licensed, not sold. Licensor retains all right,
            title, and interest in and to the Software, including all
            intellectual property rights. No rights are granted other than those
            expressly set forth in this Agreement.
          </p>

          <h2 className="text-foreground font-medium">
            Third-party components
          </h2>
          <p>
            The Software incorporates or depends upon third-party and
            open-source components governed by their own license terms. Nothing
            in this Agreement limits Your rights under, or grants rights that
            supersede, the license terms of any such component.
          </p>

          <h2 className="text-foreground font-medium">Contributions</h2>
          <p>
            If You submit code, documentation, or other materials to the
            Software's repository, You grant Licensor a perpetual, worldwide,
            irrevocable, royalty-free license to use, reproduce, modify,
            distribute, and relicense those contributions as part of the
            Software.
          </p>

          <h2 className="text-foreground font-medium">
            Disclaimer of warranty
          </h2>
          <p>
            THE SOFTWARE IS PROVIDED "AS IS" AND "AS AVAILABLE", WITHOUT
            WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED
            TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
            PURPOSE, TITLE, AND NON-INFRINGEMENT. LICENSOR DOES NOT WARRANT THAT
            THE SOFTWARE WILL BE ERROR-FREE OR THAT ITS OPERATION WILL BE
            UNINTERRUPTED.
          </p>

          <h2 className="text-foreground font-medium">
            Limitation of liability
          </h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL
            LICENSOR BE LIABLE FOR ANY CLAIM, DAMAGES, OR OTHER LIABILITY —
            WHETHER IN AN ACTION OF CONTRACT, TORT, OR OTHERWISE — ARISING FROM,
            OUT OF, OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
            DEALINGS IN THE SOFTWARE, INCLUDING ANY DIRECT, INDIRECT,
            INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR EXEMPLARY DAMAGES.
          </p>

          <h2 className="text-foreground font-medium">Governing law</h2>
          <p>
            This Agreement is governed by and construed in accordance with the
            laws of the State of California, USA, without regard to its conflict
            of law provisions. Any dispute arising under this Agreement is
            subject to the exclusive jurisdiction of the state and federal
            courts located in California.
          </p>

          <p>
            For commercial licensing or questions regarding this Agreement,
            contact Licensor at{' '}
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
