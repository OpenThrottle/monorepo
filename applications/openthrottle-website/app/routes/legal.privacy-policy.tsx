import { Link } from 'react-router';
import { OPEN_THROTTLE_CONTACT_EMAIL } from '@openthrottle/react-router-utils';
import { GlobalErrorBoundary } from '~/global/components/GlobalErrorBoundary';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/_index';

// export const loader = async (_args: Route.LoaderArgs) => {
//   return {};
// };

export const meta = (_args: Route.MetaArgs) => {
  return [{ title: SITE_TITLE }];
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
    <div className="p-12 relative h-full flex flex-col items-center justify-center flex-1">
      <h1 className="text-2xl my-4">Privacy Policy</h1>

      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-bold mt-4">1. Information We Collect</h2>
        <p className="text-muted-foreground">
          We may collect personal information such as your name, email address,
          and browsing behavior when you visit our website, sign up for our
          newsletter, or make a purchase.
        </p>
        <h2 className="text-xl font-bold mt-4">
          2. How We Use Your Information
        </h2>
        <p className="text-muted-foreground">We use this information to:</p>
        <ul className="text-muted-foreground list-disc list-inside">
          <li>Operate and maintain our website.</li>
          <li>Improve user experience.</li>
          <li>
            Send periodic emails regarding your order or other
            products/services.
          </li>
        </ul>
        <h2 className="text-xl font-bold mt-4">3. Data Security</h2>
        <p className="text-muted-foreground">
          We implement security measures to maintain the safety of your personal
          information.
        </p>
        <h2 className="text-xl font-bold mt-4">4. Third-Party Sharing</h2>
        <p className="text-muted-foreground">
          We do not sell, trade, or rent your personal information to third
          parties. We may share information with trusted service providers who
          assist us in operating our website, provided they agree to keep this
          information confidential.
        </p>
        <h2 className="text-xl font-bold mt-4">5. Cookies</h2>
        <p className="text-muted-foreground">
          Our website uses "cookies" to enhance user experience. You can choose
          to set your web browser to refuse cookies, but this may affect website
          functionality.
        </p>
        <h2 className="text-xl font-bold mt-4">6. User Rights</h2>
        <p className="text-muted-foreground">
          You have the right to request access to, correction of, or deletion of
          your personal data.
        </p>
        <h2 className="text-xl font-bold mt-4">7. Contact Us</h2>
        <p className="text-muted-foreground">
          If you have any questions regarding this privacy policy, please
          contact <Link to={OPEN_THROTTLE_CONTACT_EMAIL}>us online</Link>
        </p>
      </div>
    </div>
  );
}

// export const action = async (_args: Route.ActionArgs) => {
//   return {};
// };

export const ErrorBoundary = GlobalErrorBoundary;
