import { v } from "convex/values";

import { mutation } from "./_generated/server";
import {
  ensureOnboardingProfileRecord,
  getMediaAssetByStorageId,
  maybeDeleteAssetIfUnreferenced,
  replaceOnboardingProfileRecord,
} from "./shared";

export const updateProfile = mutation({
  args: {
    displayName: v.optional(v.string()),
    birthDate: v.optional(v.union(v.string(), v.null())),
    interests: v.optional(v.array(v.string())),
    clearAvatar: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const profile = await ensureOnboardingProfileRecord(ctx);
    const previousAsset = args.clearAvatar
      ? await getMediaAssetByStorageId(ctx, profile.avatarStorageId)
      : null;
    await replaceOnboardingProfileRecord(ctx, profile, {
      displayName: args.displayName ?? profile.displayName,
      birthDate: args.birthDate ?? profile.birthDate,
      interests: args.interests ?? profile.interests,
      avatarStorageId: args.clearAvatar ? undefined : profile.avatarStorageId,
      avatarUrl: args.clearAvatar ? undefined : profile.avatarUrl,
      updatedAt: Date.now(),
    });

    if (previousAsset) {
      await maybeDeleteAssetIfUnreferenced(ctx, previousAsset._id);
    }
  },
});

export const complete = mutation({
  args: {},
  handler: async (ctx) => {
    const profile = await ensureOnboardingProfileRecord(ctx);
    await replaceOnboardingProfileRecord(ctx, profile, {
      completedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const reset = mutation({
  args: {},
  handler: async (ctx) => {
    const profile = await ensureOnboardingProfileRecord(ctx);
    const previousAvatarAsset = profile.avatarStorageId
      ? await ctx.db
          .query("mediaAssets")
          .withIndex("by_storageId", (q) => q.eq("storageId", profile.avatarStorageId))
          .unique()
      : null;

    await replaceOnboardingProfileRecord(ctx, profile, {
      displayName: "",
      birthDate: null,
      avatarStorageId: undefined,
      avatarUrl: undefined,
      interests: [],
      completedAt: null,
      updatedAt: Date.now(),
    });

    if (previousAvatarAsset) {
      await maybeDeleteAssetIfUnreferenced(ctx, previousAvatarAsset._id);
    }
  },
});
