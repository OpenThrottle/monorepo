import * as React from 'react';
import { Link } from 'react-router';
import { SpeedometerIcon } from '@phosphor-icons/react/dist/ssr/Speedometer';
import {
  OPEN_THROTTLE_GITHUB_URL,
  OPEN_THROTTLE_GITHUB_URL_DISCUSSIONS,
} from '@openthrottle/react-router-utils';

interface GlobalFooterProps {}

export const GlobalFooter = (_props: GlobalFooterProps): React.ReactElement => {
  // const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <footer
      className="border-t border-border bg-card py-12 px-4 sm:px-6 lg:px-8"
      data-testid="GlobalFooter"
    >
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <SpeedometerIcon className="w-5 h-5 text-accent" />
              <span className="font-bold">OpenThrottle</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Context-driven AI for developers.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Product</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link
                  className="hover:text-accent transition"
                  to="/#features"
                  viewTransition={true}
                >
                  Features
                </Link>
              </li>
              <li>
                <Link
                  className="hover:text-accent transition"
                  to="/pricing"
                  viewTransition={true}
                >
                  Pricing
                </Link>
              </li>
              <li>
                <Link
                  className="hover:text-accent transition"
                  to="/case-studies"
                  viewTransition={true}
                >
                  Case Studies
                </Link>
              </li>
              <li>
                <Link className="hover:text-accent transition" to="#">
                  Docs
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Community</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link
                  className="hover:text-accent transition"
                  target="_blank"
                  to={OPEN_THROTTLE_GITHUB_URL}
                >
                  GitHub
                </Link>
              </li>
              <li>
                <Link
                  className="hover:text-accent transition"
                  target="_blank"
                  to={OPEN_THROTTLE_GITHUB_URL_DISCUSSIONS}
                >
                  Discussions
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link
                  className="hover:text-accent transition"
                  to="/legal/privacy-policy"
                  viewTransition={true}
                >
                  Privacy
                </Link>
              </li>
              <li>
                <Link
                  className="hover:text-accent transition"
                  to="/legal/terms-of-use"
                  viewTransition={true}
                >
                  Terms
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border pt-8 text-center text-sm text-muted-foreground">
          <p>Built by engineers. Open source. No lock-in.</p>
        </div>
      </div>
    </footer>
  );
};
