import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

import {
  MAIN_WORKSPACE_SLUG,
  itemUserDataValidator,
  listConfigValidator,
  listEntryValidator,
  listPreferencesValidator,
  listPrivacyValidator,
  listPresetValidator,
  mediaKindValidator,
  onboardingInterestValidator,
  starterEntryValidator,
} from "./model";

export default defineSchema(
  {
    workspace: defineTable({
    slug: v.literal(MAIN_WORKSPACE_SLUG),
    recentSearches: v.array(v.string()),
    recentListIds: v.array(v.string()),
    recentActivityListIds: v.array(v.string()),
    continueEntryIds: v.array(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastImportedAt: v.optional(v.number()),
  }).index("by_slug", ["slug"]),

    onboardingProfile: defineTable({
    workspaceSlug: v.literal(MAIN_WORKSPACE_SLUG),
    displayName: v.string(),
    birthDate: v.union(v.string(), v.null()),
    avatarStorageId: v.optional(v.id("_storage")),
    avatarUrl: v.optional(v.string()),
    interests: v.array(onboardingInterestValidator),
    completedAt: v.union(v.number(), v.null()),
    updatedAt: v.number(),
  }).index("by_workspaceSlug", ["workspaceSlug"]),

    mediaAssets: defineTable({
    workspaceSlug: v.literal(MAIN_WORKSPACE_SLUG),
    storageId: v.id("_storage"),
    kind: mediaKindValidator,
    mimeType: v.optional(v.string()),
    fileName: v.optional(v.string()),
    createdAt: v.number(),
    replacedAt: v.optional(v.number()),
  })
    .index("by_workspaceSlug", ["workspaceSlug"])
    .index("by_storageId", ["storageId"]),

    lists: defineTable({
    clientId: v.string(),
    title: v.string(),
    imageAssetId: v.optional(v.id("mediaAssets")),
    imageUrl: v.optional(v.string()),
    description: v.optional(v.string()),
    tags: v.array(v.string()),
    privacy: v.optional(listPrivacyValidator),
    preset: listPresetValidator,
    config: listConfigValidator,
    preferences: listPreferencesValidator,
    pinned: v.boolean(),
    pinnedToProfile: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
    sortOrder: v.optional(v.number()),
    templateId: v.optional(v.string()),
    showInMyLists: v.optional(v.boolean()),
    parentListId: v.optional(v.string()),
    archivedAt: v.optional(v.number()),
    deletedAt: v.optional(v.number()),
  })
    .index("by_clientId", ["clientId"])
    .index("by_deletedAt", ["deletedAt"])
    .index("by_parentListId", ["parentListId"]),

    listEntries: defineTable(listEntryValidator)
    .index("by_clientId", ["clientId"])
    .index("by_listClientId", ["listClientId"])
    .index("by_linkedListId", ["linkedListId"]),

    savedTemplates: defineTable({
    clientId: v.string(),
    title: v.string(),
    description: v.string(),
    preset: listPresetValidator,
    config: listConfigValidator,
    starterEntries: v.array(starterEntryValidator),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_clientId", ["clientId"]),

    itemUserData: defineTable(itemUserDataValidator).index("by_itemKey", ["itemKey"]),
  },
  {
    // Temporary compatibility to let bootstrap delete legacy documents
    // that predate the current tracker schema.
    schemaValidation: false,
  }
);
