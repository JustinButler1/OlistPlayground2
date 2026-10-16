import { v } from 'convex/values';
import { internalMutation } from './_generated/server';
import { MAIN_WORKSPACE_SLUG } from './model';

// Only the authenticated HTTP action can register a newly stored blob.
export const register = internalMutation({
  args: { ownerId: v.string(), storageId: v.id('_storage') },
  handler: async (ctx, args) => {
    await ctx.db.insert('mediaAssets', {
      ...args,
      workspaceSlug: MAIN_WORKSPACE_SLUG,
      kind: 'entry-cover',
      createdAt: Date.now(),
    });
  },
});
