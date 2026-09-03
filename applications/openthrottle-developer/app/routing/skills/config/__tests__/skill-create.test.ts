import { AGENT_ASSET_SLUG_PATTERN } from '@openthrottle/openthrottle-skills';
import { describe, expect, it } from 'vitest';
import {
  SKILL_CREATE_DESTINATIONS,
  SKILL_CREATE_SLUG_PATTERN,
  isSkillCreateDestination,
  isSkillCreateDestinationAvailable,
} from '~/routing/skills/config/skill-create';

describe('SKILL_CREATE_SLUG_PATTERN', () => {
  it('matches the package pattern it deliberately mirrors', () => {
    expect(SKILL_CREATE_SLUG_PATTERN.source).toBe(
      AGENT_ASSET_SLUG_PATTERN.source,
    );
    expect(SKILL_CREATE_SLUG_PATTERN.flags).toBe(
      AGENT_ASSET_SLUG_PATTERN.flags,
    );
  });
});

describe('isSkillCreateDestination', () => {
  it('accepts each of the three destinations', () => {
    expect(isSkillCreateDestination(SKILL_CREATE_DESTINATIONS.custom)).toBe(
      true,
    );
    expect(
      isSkillCreateDestination(SKILL_CREATE_DESTINATIONS.openthrottle),
    ).toBe(true);
    expect(isSkillCreateDestination(SKILL_CREATE_DESTINATIONS.personal)).toBe(
      true,
    );
  });

  // Refused, never defaulted: a malformed POST must not silently pick one.
  it.each([['repo'], [''], ['garbage'], [null], [undefined], [1]])(
    'refuses %o',
    (value) => {
      expect(isSkillCreateDestination(value)).toBe(false);
    },
  );
});

describe('isSkillCreateDestinationAvailable', () => {
  it('gates only the OpenThrottle catalog', () => {
    expect(
      isSkillCreateDestinationAvailable(
        SKILL_CREATE_DESTINATIONS.openthrottle,
        false,
      ),
    ).toBe(false);
    expect(
      isSkillCreateDestinationAvailable(
        SKILL_CREATE_DESTINATIONS.openthrottle,
        true,
      ),
    ).toBe(true);
  });

  it.each([
    [SKILL_CREATE_DESTINATIONS.custom],
    [SKILL_CREATE_DESTINATIONS.personal],
  ])('leaves %s available in both flag states', (destination) => {
    expect(isSkillCreateDestinationAvailable(destination, false)).toBe(true);
    expect(isSkillCreateDestinationAvailable(destination, true)).toBe(true);
  });
});
