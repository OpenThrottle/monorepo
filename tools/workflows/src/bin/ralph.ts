#!/usr/bin/env node

/**
 * @description Links the squash commit (after PR merge) to a Cortex plan. Run after merging a PR so commit_links stores the one SHA on main. Option A: no pre-merge linking; activity-by-date reflects only landed commits.
 */

export const main = async (): Promise<void> => {
  console.log('🔴 🔴 🔴 ralph');
};

if (require.main === module) {
  main().catch((_error) => {
    process.exit(1);
  });
}
