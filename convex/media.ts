import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import {
  createMediaAssetRecord,
  getEntryRecordByClientId,
  getListRecordByClientId,
  getMediaAssetById,
  maybeDeleteAssetIfUnreferenced,
  replaceEntryRecord,
  replaceListRecord,
  replaceOnboardingProfileRecord,
  resolveStorageUrl,
  ensureOnboardingProfileRecord,
} from "./shared";

async function replaceAssetRecord(ctx: any, previousAssetId: any, nextAssetId: any) {
  if (!previousAssetId || previousAssetId === nextAssetId) {
    return;
  }

  const previousAsset = await getMediaAssetById(ctx, previousAssetId);
  if (previousAsset) {
    await ctx.db.replace(previousAsset._id, {
      workspaceSlug: previousAsset.workspaceSlug,
      storageId: previousAsset.storageId,
      kind: previousAsset.kind,
      mimeType: previousAsset.mimeType,
      fileName: previousAsset.fileName,
      createdAt: previousAsset.createdAt,
      replacedAt: Date.now(),
    });
  }

  await maybeDeleteAssetIfUnreferenced(ctx, previousAssetId);
}

async function attachAvatarImpl(
  ctx: any,
  args: { storageId: any; mimeType?: string; fileName?: string }
) {
  const profile = await ensureOnboardingProfileRecord(ctx);
  const asset = await createMediaAssetRecord(ctx, {
    storageId: args.storageId,
    kind: "avatar",
    mimeType: args.mimeType,
    fileName: args.fileName,
  });
  const avatarUrl = await resolveStorageUrl(ctx, args.storageId);
  const previousAssetId = profile.avatarStorageId
    ? await ctx.db
        .query("mediaAssets")
        .filter((q: any) => q.eq(q.field("storageId"), profile.avatarStorageId))
        .first()
    : null;

  await replaceOnboardingProfileRecord(ctx, profile, {
    avatarStorageId: args.storageId,
    avatarUrl: avatarUrl ?? undefined,
    updatedAt: Date.now(),
  });

  await replaceAssetRecord(ctx, previousAssetId?._id, asset?._id);

  return {
    assetId: asset?._id ?? null,
    url: avatarUrl,
  };
}

async function attachListImageImpl(
  ctx: any,
  args: { listId: string; storageId: any; mimeType?: string; fileName?: string }
) {
  const list = await getListRecordByClientId(ctx, args.listId);
  if (!list) {
    return null;
  }

  const asset = await createMediaAssetRecord(ctx, {
    storageId: args.storageId,
    kind: "list-image",
    mimeType: args.mimeType,
    fileName: args.fileName,
  });
  const imageUrl = await resolveStorageUrl(ctx, args.storageId);
  const previousAssetId = list.imageAssetId;

  await replaceListRecord(ctx, list, {
    imageAssetId: asset?._id ?? undefined,
    imageUrl: imageUrl ?? undefined,
    updatedAt: Date.now(),
  });

  await replaceAssetRecord(ctx, previousAssetId, asset?._id);

  return {
    assetId: asset?._id ?? null,
    url: imageUrl,
  };
}

async function attachEntryCoverImpl(
  ctx: any,
  args: { entryId: string; storageId: any; mimeType?: string; fileName?: string }
) {
  const entry = await getEntryRecordByClientId(ctx, args.entryId);
  if (!entry) {
    return null;
  }

  const asset = await createMediaAssetRecord(ctx, {
    storageId: args.storageId,
    kind: "entry-cover",
    mimeType: args.mimeType,
    fileName: args.fileName,
  });
  const coverUrl = await resolveStorageUrl(ctx, args.storageId);
  const previousAssetId = entry.coverAssetId;

  await replaceEntryRecord(ctx, entry, {
    coverAssetId: asset?._id ?? undefined,
    coverImageUrl: coverUrl ?? undefined,
    updatedAt: Date.now(),
  });

  await replaceAssetRecord(ctx, previousAssetId, asset?._id);

  return {
    assetId: asset?._id ?? null,
    url: coverUrl,
  };
}

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const getResolvedUrl = query({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    return await resolveStorageUrl(ctx, args.storageId);
  },
});

export const attachAvatar = mutation({
  args: {
    storageId: v.id("_storage"),
    mimeType: v.optional(v.string()),
    fileName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await attachAvatarImpl(ctx, args);
  },
});

export const attachListImage = mutation({
  args: {
    listId: v.string(),
    storageId: v.id("_storage"),
    mimeType: v.optional(v.string()),
    fileName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await attachListImageImpl(ctx, args);
  },
});

export const attachEntryCover = mutation({
  args: {
    entryId: v.string(),
    storageId: v.id("_storage"),
    mimeType: v.optional(v.string()),
    fileName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await attachEntryCoverImpl(ctx, args);
  },
});

export const replaceAsset = mutation({
  args: {
    target: v.union(v.literal("avatar"), v.literal("list"), v.literal("entry")),
    targetId: v.optional(v.string()),
    storageId: v.id("_storage"),
    mimeType: v.optional(v.string()),
    fileName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.target === "avatar") {
      return await attachAvatarImpl(ctx, {
        storageId: args.storageId,
        mimeType: args.mimeType,
        fileName: args.fileName,
      });
    }

    if (!args.targetId) {
      return null;
    }

    if (args.target === "list") {
      return await attachListImageImpl(ctx, {
        listId: args.targetId,
        storageId: args.storageId,
        mimeType: args.mimeType,
        fileName: args.fileName,
      });
    }

    return await attachEntryCoverImpl(ctx, {
      entryId: args.targetId,
      storageId: args.storageId,
      mimeType: args.mimeType,
      fileName: args.fileName,
    });
  },
});

export const deleteAssetIfUnreferenced = mutation({
  args: {
    assetId: v.id("mediaAssets"),
  },
  handler: async (ctx, args) => {
    return await maybeDeleteAssetIfUnreferenced(ctx, args.assetId);
  },
});
