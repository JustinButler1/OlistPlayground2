import { v } from 'convex/values';

import { mutation } from './auth';
import { ensureWorkspaceRecord, ensureOnboardingProfileRecord } from './shared';

export const ensureWorkspace = mutation({
  args: {},
  handler: async (ctx) => {
    const workspace = await ensureWorkspaceRecord(ctx);
    const onboardingProfile = await ensureOnboardingProfileRecord(ctx);
    const cleanedLegacyLists = 0;

    return {
      workspaceId: workspace?._id ?? null,
      onboardingProfileId: onboardingProfile?._id ?? null,
      cleanedLegacyLists,
    };
  },
});

export const importLegacyLocalState = mutation({
  args: {
    listsState: v.optional(v.any()),
    onboardingState: v.optional(v.any()),
  },
  handler: async () => {
    throw new Error('Legacy import is disabled pending migration.');
  },
});
