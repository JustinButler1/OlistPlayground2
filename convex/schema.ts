import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

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
} from './model';

export default defineSchema(
  {
    workspace: defineTable({
      ownerId: v.optional(v.string()),
      slug: v.literal(MAIN_WORKSPACE_SLUG),
      recentSearches: v.array(v.string()),
      recentListIds: v.array(v.string()),
      recentActivityListIds: v.array(v.string()),
      continueEntryIds: v.array(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
      lastImportedAt: v.optional(v.number()),
    })
      .index('by_owner', ['ownerId'])
      .index('by_slug', ['slug'])
      .index('owned_by_slug', ['ownerId', 'slug']),

    onboardingProfile: defineTable({
      ownerId: v.optional(v.string()),
      workspaceSlug: v.literal(MAIN_WORKSPACE_SLUG),
      displayName: v.string(),
      birthDate: v.union(v.string(), v.null()),
      avatarStorageId: v.optional(v.id('_storage')),
      avatarUrl: v.optional(v.string()),
      interests: v.array(onboardingInterestValidator),
      completedAt: v.union(v.number(), v.null()),
      updatedAt: v.number(),
    })
      .index('by_owner', ['ownerId'])
      .index('by_workspaceSlug', ['workspaceSlug'])
      .index('owned_by_workspaceSlug', ['ownerId', 'workspaceSlug']),

    mediaAssets: defineTable({
      ownerId: v.optional(v.string()),
      workspaceSlug: v.literal(MAIN_WORKSPACE_SLUG),
      storageId: v.id('_storage'),
      kind: mediaKindValidator,
      mimeType: v.optional(v.string()),
      fileName: v.optional(v.string()),
      createdAt: v.number(),
      replacedAt: v.optional(v.number()),
    })
      .index('by_owner', ['ownerId'])
      .index('by_workspaceSlug', ['workspaceSlug'])
      .index('owned_by_workspaceSlug', ['ownerId', 'workspaceSlug'])
      .index('by_storageId', ['storageId'])
      .index('owned_by_storageId', ['ownerId', 'storageId']),

    lists: defineTable({
      ownerId: v.optional(v.string()),
      clientId: v.string(),
      title: v.string(),
      imageAssetId: v.optional(v.id('mediaAssets')),
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
      .index('by_owner', ['ownerId'])
      .index('by_clientId', ['clientId'])
      .index('owned_by_clientId', ['ownerId', 'clientId'])
      .index('by_deletedAt', ['deletedAt'])
      .index('owned_by_deletedAt', ['ownerId', 'deletedAt'])
      .index('by_parentListId', ['parentListId'])
      .index('owned_by_parentListId', ['ownerId', 'parentListId']),

    listEntries: defineTable({
      ...listEntryValidator.fields,
      ownerId: v.optional(v.string()),
    })
      .index('by_owner', ['ownerId'])
      .index('by_clientId', ['clientId'])
      .index('owned_by_clientId', ['ownerId', 'clientId'])
      .index('by_listClientId', ['listClientId'])
      .index('owned_by_listClientId', ['ownerId', 'listClientId'])
      .index('by_linkedListId', ['linkedListId'])
      .index('owned_by_linkedListId', ['ownerId', 'linkedListId']),

    savedTemplates: defineTable({
      ownerId: v.optional(v.string()),
      clientId: v.string(),
      title: v.string(),
      description: v.string(),
      preset: listPresetValidator,
      config: listConfigValidator,
      starterEntries: v.array(starterEntryValidator),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index('by_owner', ['ownerId'])
      .index('by_clientId', ['clientId'])
      .index('owned_by_clientId', ['ownerId', 'clientId']),

    itemUserData: defineTable({
      ...itemUserDataValidator.fields,
      ownerId: v.optional(v.string()),
    })
      .index('by_owner', ['ownerId'])
      .index('by_itemKey', ['itemKey'])
      .index('owned_by_itemKey', ['ownerId', 'itemKey']),
  },
  {
    // Preserve pre-auth legacy records until the separate migration is ready.
    schemaValidation: false,
  },
);
