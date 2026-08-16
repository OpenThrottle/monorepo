import * as React from 'react';
import { SwatchBookIcon } from 'lucide-react';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';
import { AppearancePreview } from '~/routing/settings/components/AppearancePreview';
import { AppearanceSection } from '~/routing/settings/components/AppearanceSection';
import { APPEARANCE_SECTIONS } from '~/routing/settings/data/data.appearance';
import { APPEARANCE_COPY } from '~/routing/settings/data/data.copy';

export interface AppearancePanelProps {}

/**
 * @description Settings → Appearance. Renders the `APPEARANCE_SECTIONS`
 * registry and nothing else, so groups are added, reordered, or removed by
 * editing that array rather than this JSX.
 */
export const AppearancePanel = (
  _props: AppearancePanelProps,
): React.ReactElement => {
  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div>
      <GlobalHeading
        className="mb-4"
        heading="h2"
        icon={SwatchBookIcon}
        title={APPEARANCE_COPY.title}
      />
      <p className="text-muted-foreground mb-4 text-sm">
        {APPEARANCE_COPY.intro}
      </p>

      <div className="space-y-6">
        <AppearancePreview />

        {APPEARANCE_SECTIONS.map((section) => (
          <AppearanceSection
            description={section.description}
            id={section.id}
            key={section.id}
            title={section.title}
          >
            {section.Components.map((Component, index) => (
              <Component key={index} />
            ))}
          </AppearanceSection>
        ))}
      </div>
    </div>
  );
};
