import { v } from "convex/values";

import { mutation } from "./_generated/server";
import {
  ensureOnboardingProfileRecord,
  ensureWorkspaceRecord,
  importListStateIntoWorkspace,
  isCurrentEntryRecord,
  isCurrentItemUserDataRecord,
  isCurrentListRecord,
  isCurrentTemplateRecord,
  isLocalAssetUri,
  isRemoteUrl,
  replaceOnboardingProfileRecord,
} from "./shared";

async function cleanupLegacyTrackerDocuments(ctx: any) {
  const legacyListIds: string[] = [];
  const lists = await ctx.db.query("lists").collect();
  for (const list of lists) {
    if (!isCurrentListRecord(list)) {
      legacyListIds.push(list._id);
      await ctx.db.delete(list._id);
    }
  }

  const entries = await ctx.db.query("listEntries").collect();
  for (const entry of entries) {
    if (!isCurrentEntryRecord(entry)) {
      await ctx.db.delete(entry._id);
    }
  }

  const templates = await ctx.db.query("savedTemplates").collect();
  for (const template of templates) {
    if (!isCurrentTemplateRecord(template)) {
      await ctx.db.delete(template._id);
    }
  }

  const itemUserData = await ctx.db.query("itemUserData").collect();
  for (const item of itemUserData) {
    if (!isCurrentItemUserDataRecord(item)) {
      await ctx.db.delete(item._id);
    }
  }

  return legacyListIds.length;
}

export const ensureWorkspace = mutation({
  args: {},
  handler: async (ctx) => {
    const workspace = await ensureWorkspaceRecord(ctx);
    const onboardingProfile = await ensureOnboardingProfileRecord(ctx);
    const cleanedLegacyLists = await cleanupLegacyTrackerDocuments(ctx);

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
  handler: async (ctx, args) => {
    await ensureWorkspaceRecord(ctx);
    const onboardingProfile = await ensureOnboardingProfileRecord(ctx);
    const migrationNotes: string[] = [];

    if (args.listsState) {
      const listsState = args.listsState as {
        lists: any[];
        deletedLists: any[];
        savedTemplates: any[];
        itemUserDataByKey: Record<string, any>;
        recentSearches: string[];
        recentListIds: string[];
      };

      for (const list of [...(listsState.lists ?? []), ...(listsState.deletedLists ?? [])]) {
        if (isLocalAssetUri(list.imageUrl)) {
          migrationNotes.push(`Skipped non-migratable local list image for "${list.title}".`);
          list.imageUrl = undefined;
        }

        for (const entry of list.entries ?? []) {
          if (isLocalAssetUri(entry.coverAssetUri)) {
            migrationNotes.push(`Skipped non-migratable local entry cover for "${entry.title}".`);
            entry.coverAssetUri = undefined;
          }
          if (entry.imageUrl && !isRemoteUrl(entry.imageUrl) && isLocalAssetUri(entry.imageUrl)) {
            migrationNotes.push(`Skipped non-migratable local entry image for "${entry.title}".`);
            entry.imageUrl = undefined;
          }
        }
      }

      await importListStateIntoWorkspace(ctx, listsState);
    }

    if (args.onboardingState) {
      const onboardingState = args.onboardingState as {
        profile?: {
          displayName?: string;
          birthDate?: string | null;
          avatarUri?: string | null;
          interests?: string[];
        };
        completedAt?: number | null;
      };
      const avatarUri =
        onboardingState.profile?.avatarUri && isRemoteUrl(onboardingState.profile.avatarUri)
          ? onboardingState.profile.avatarUri
          : null;

      if (onboardingState.profile?.avatarUri && !avatarUri) {
        migrationNotes.push("Skipped non-migratable local onboarding avatar.");
      }

      await replaceOnboardingProfileRecord(ctx, onboardingProfile, {
        displayName: onboardingState.profile?.displayName ?? "",
        birthDate: onboardingState.profile?.birthDate ?? null,
        avatarUrl: avatarUri ?? undefined,
        avatarStorageId: undefined,
        interests: onboardingState.profile?.interests ?? [],
        completedAt: onboardingState.completedAt ?? null,
        updatedAt: Date.now(),
      });
    }

    return {
      imported: !!args.listsState || !!args.onboardingState,
      migrationNotes,
    };
  },
});
