import { v } from "convex/values";

import {
  BUILT_IN_LIST_TEMPLATES,
  createListConfig,
  DEFAULT_LIST_PREFERENCES,
  derivePresetFromConfig,
  sanitizeListPreferencesForConfig,
  type ListEntry,
} from "../data/mock-lists";
import { normalizeProgress, normalizeRating } from "../lib/tracker-metadata";
import { mutation } from "./_generated/server";
import {
  addTag,
  applyCheckedAutomation,
  buildEntryInsert,
  buildFrontSortOrders,
  buildListRecordFromTemplate,
  collectSnapshot,
  compact,
  createBlankListRecord,
  createMediaAssetRecord,
  createLinkedListEntry,
  createMockWorkspaceState,
  createEntryFromDraft,
  ensureWorkspaceRecord,
  getEntriesForList,
  getEntryRecordByClientId,
  getListRecordByClientId,
  LIST_SORT_STEP,
  getTemplateRecordByClientId,
  maybeDeleteAssetIfUnreferenced,
  mergeListPreferences,
  nextAppendSortOrder,
  normalizeTags,
  removeTag,
  replaceEntryRecord,
  replaceListRecord,
  resequenceListEntries,
  resolveStorageUrl,
  touchContinueEntryIds,
  touchRecentListIds,
  updateWorkspaceListsMetadata,
} from "./shared";

async function insertListWithEntries(ctx: any, list: any) {
  await ctx.db.insert("lists", compact({
    clientId: list.id,
    title: list.title,
    imageUrl: list.imageUrl,
    description: list.description,
    tags: list.tags,
    privacy: list.privacy ?? "public",
    preset: list.preset,
    config: list.config,
    preferences: list.preferences,
    pinned: list.pinned,
    pinnedToProfile: list.pinnedToProfile,
    createdAt: list.createdAt,
    updatedAt: list.updatedAt,
    sortOrder: list.sortOrder,
    templateId: list.templateId,
    showInMyLists: list.showInMyLists,
    parentListId: list.parentListId,
    archivedAt: list.archivedAt,
    deletedAt: list.deletedAt,
  }));

  for (const [index, entry] of list.entries.entries()) {
    await ctx.db.insert("listEntries", buildEntryInsert(entry, list.id, (index + 1) * 1_000));
  }
}

function getLinkedListId(value: { linkedListId?: string; detailPath?: string }) {
  if (value.linkedListId) {
    return value.linkedListId;
  }

  if (value.detailPath?.startsWith("list/")) {
    return value.detailPath.slice("list/".length) || undefined;
  }

  return undefined;
}

async function attachLinkedListToParent(
  ctx: any,
  linkedListId: string | undefined,
  parentListId: string
) {
  if (!linkedListId || linkedListId === parentListId) {
    return;
  }

  const linkedList = await getListRecordByClientId(ctx, linkedListId);
  if (!linkedList) {
    return;
  }

  if (linkedList.parentListId === parentListId) {
    return;
  }

  await replaceListRecord(ctx, linkedList, {
    parentListId: parentListId,
    updatedAt: Date.now(),
  });
}

async function detachLinkedListFromParentIfUnlinked(
  ctx: any,
  linkedListId: string | undefined,
  parentListId: string
) {
  if (!linkedListId) {
    return;
  }

  const parentEntries = await getEntriesForList(ctx, parentListId);
  const stillLinked = parentEntries.some((entry) => getLinkedListId(entry) === linkedListId);
  if (stillLinked) {
    return;
  }

  const linkedList = await getListRecordByClientId(ctx, linkedListId);
  if (!linkedList || linkedList.parentListId !== parentListId) {
    return;
  }

  await replaceListRecord(ctx, linkedList, {
    parentListId: undefined,
    updatedAt: Date.now(),
  });
}

async function listReferencesTarget(
  ctx: any,
  listId: string,
  targetListId: string | undefined
) {
  let pointer = targetListId;

  while (pointer) {
    if (pointer === listId) {
      return true;
    }

    const parent = await getListRecordByClientId(ctx, pointer);
    pointer = parent?.parentListId;
  }

  return false;
}

export const createList = mutation({
  args: {
    title: v.string(),
    options: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const list = createBlankListRecord({
      title: args.title,
      preset: args.options?.preset,
      config: args.options?.config,
      description: args.options?.description,
      imageUrl: args.options?.imageUrl,
      pinned: args.options?.pinned,
      pinnedToProfile: args.options?.pinnedToProfile,
      templateId: args.options?.templateId,
      tags: args.options?.tags,
      showInMyLists: args.options?.showInMyLists,
      parentListId: args.options?.parentListId,
    });

    await insertListWithEntries(ctx, list);
    if (args.options?.uploadedImage?.storageId) {
      const listRecord = await getListRecordByClientId(ctx, list.id);
      if (listRecord) {
        const asset = await createMediaAssetRecord(ctx, {
          storageId: args.options.uploadedImage.storageId,
          kind: "list-image",
          mimeType: args.options.uploadedImage.mimeType,
          fileName: args.options.uploadedImage.fileName,
        });
        const imageUrl =
          (await resolveStorageUrl(ctx, args.options.uploadedImage.storageId)) ??
          args.options.uploadedImage.url ??
          undefined;
        await replaceListRecord(ctx, listRecord, {
          imageAssetId: asset?._id ?? undefined,
          imageUrl,
          updatedAt: Date.now(),
        });
      }
    }
    const workspace = await ensureWorkspaceRecord(ctx);
    await updateWorkspaceListsMetadata(ctx, {
      recentListIds: touchRecentListIds(workspace.recentListIds, list.id),
      recentActivityListIds: touchRecentListIds(workspace.recentActivityListIds ?? [], list.id),
    });

    return list.id;
  },
});

export const createListFromTemplate = mutation({
  args: {
    templateId: v.string(),
    overrides: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const savedTemplate = await getTemplateRecordByClientId(ctx, args.templateId);
    const template =
      BUILT_IN_LIST_TEMPLATES.find((item) => item.id === args.templateId) ??
      (savedTemplate
        ? {
            id: savedTemplate.clientId,
            title: savedTemplate.title,
            description: savedTemplate.description,
            source: "user" as const,
            preset: savedTemplate.preset,
            config: savedTemplate.config,
            starterEntries: savedTemplate.starterEntries,
          }
        : null);
    if (!template) {
      return null;
    }

    const { list } = buildListRecordFromTemplate(template, args.overrides);
    await insertListWithEntries(ctx, list);
    if (args.overrides?.uploadedImage?.storageId) {
      const listRecord = await getListRecordByClientId(ctx, list.id);
      if (listRecord) {
        const asset = await createMediaAssetRecord(ctx, {
          storageId: args.overrides.uploadedImage.storageId,
          kind: "list-image",
          mimeType: args.overrides.uploadedImage.mimeType,
          fileName: args.overrides.uploadedImage.fileName,
        });
        const imageUrl =
          (await resolveStorageUrl(ctx, args.overrides.uploadedImage.storageId)) ??
          args.overrides.uploadedImage.url ??
          undefined;
        await replaceListRecord(ctx, listRecord, {
          imageAssetId: asset?._id ?? undefined,
          imageUrl,
          updatedAt: Date.now(),
        });
      }
    }
    const workspace = await ensureWorkspaceRecord(ctx);
    await updateWorkspaceListsMetadata(ctx, {
      recentListIds: touchRecentListIds(workspace.recentListIds, list.id),
      recentActivityListIds: touchRecentListIds(workspace.recentActivityListIds ?? [], list.id),
    });
    return list.id;
  },
});

export const updateList = mutation({
  args: {
    listId: v.string(),
    updates: v.any(),
  },
  handler: async (ctx, args) => {
    const list = await getListRecordByClientId(ctx, args.listId);
    if (!list) {
      return;
    }

    const nextConfig = args.updates?.config ? createListConfig(args.updates.config) : list.config;
    await replaceListRecord(ctx, list, {
      title: typeof args.updates?.title === "string" ? args.updates.title : list.title,
      description:
        "description" in (args.updates ?? {})
          ? args.updates.description?.trim() || undefined
          : list.description,
      imageUrl:
        "imageUrl" in (args.updates ?? {}) ? args.updates.imageUrl || undefined : list.imageUrl,
      pinned:
        typeof args.updates?.pinned === "boolean" ? args.updates.pinned : list.pinned,
      pinnedToProfile:
        typeof args.updates?.pinnedToProfile === "boolean"
          ? args.updates.pinnedToProfile
          : (list.pinnedToProfile ?? false),
      privacy:
        "privacy" in (args.updates ?? {})
          ? args.updates.privacy ?? "public"
          : (list.privacy ?? "public"),
      config: nextConfig,
      preset: derivePresetFromConfig(nextConfig),
      preferences: sanitizeListPreferencesForConfig(
        list.preferences,
        nextConfig
      ),
      templateId:
        "templateId" in (args.updates ?? {}) ? args.updates.templateId || undefined : list.templateId,
      tags: "tags" in (args.updates ?? {}) ? normalizeTags(args.updates.tags) : list.tags,
      showInMyLists:
        "showInMyLists" in (args.updates ?? {})
          ? !!args.updates.showInMyLists
          : (list.showInMyLists ?? !list.parentListId),
      parentListId:
        "parentListId" in (args.updates ?? {})
          ? args.updates.parentListId || undefined
          : list.parentListId,
      updatedAt: Date.now(),
    });

    const workspace = await ensureWorkspaceRecord(ctx);
    await updateWorkspaceListsMetadata(ctx, {
      recentActivityListIds: touchRecentListIds(workspace.recentActivityListIds ?? [], args.listId),
    });
  },
});

export const archiveList = mutation({
  args: { listId: v.string() },
  handler: async (ctx, args) => {
    const list = await getListRecordByClientId(ctx, args.listId);
    if (!list) {
      return;
    }

    await replaceListRecord(ctx, list, {
      archivedAt: Date.now(),
      updatedAt: Date.now(),
    });

    const workspace = await ensureWorkspaceRecord(ctx);
    await updateWorkspaceListsMetadata(ctx, {
      recentActivityListIds: touchRecentListIds(workspace.recentActivityListIds ?? [], args.listId),
    });
  },
});

export const restoreArchivedList = mutation({
  args: { listId: v.string() },
  handler: async (ctx, args) => {
    const list = await getListRecordByClientId(ctx, args.listId);
    if (!list) {
      return;
    }

    await replaceListRecord(ctx, list, {
      archivedAt: undefined,
      updatedAt: Date.now(),
    });

    const workspace = await ensureWorkspaceRecord(ctx);
    await updateWorkspaceListsMetadata(ctx, {
      recentActivityListIds: touchRecentListIds(workspace.recentActivityListIds ?? [], args.listId),
    });
  },
});

export const deleteList = mutation({
  args: { listId: v.string() },
  handler: async (ctx, args) => {
    const list = await getListRecordByClientId(ctx, args.listId);
    if (!list) {
      return;
    }

    await replaceListRecord(ctx, list, {
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });

    const workspace = await ensureWorkspaceRecord(ctx);
    await updateWorkspaceListsMetadata(ctx, {
      recentListIds: workspace.recentListIds.filter((id: string) => id !== args.listId),
      recentActivityListIds: (workspace.recentActivityListIds ?? []).filter(
        (id: string) => id !== args.listId
      ),
    });
  },
});

export const restoreList = mutation({
  args: { listId: v.string() },
  handler: async (ctx, args) => {
    const list = await getListRecordByClientId(ctx, args.listId);
    if (!list) {
      return;
    }

    await replaceListRecord(ctx, list, {
      deletedAt: undefined,
      updatedAt: Date.now(),
    });

    const workspace = await ensureWorkspaceRecord(ctx);
    await updateWorkspaceListsMetadata(ctx, {
      recentListIds: touchRecentListIds(workspace.recentListIds, args.listId),
      recentActivityListIds: touchRecentListIds(
        workspace.recentActivityListIds ?? [],
        args.listId
      ),
    });
  },
});

export const moveList = mutation({
  args: {
    listId: v.string(),
    targetListId: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.listId === args.targetListId) {
      return;
    }

    const list = await getListRecordByClientId(ctx, args.listId);
    const targetList = await getListRecordByClientId(ctx, args.targetListId);
    if (!list || !targetList || list.deletedAt || targetList.deletedAt) {
      return;
    }

    if (
      list.parentListId === args.targetListId ||
      (await listReferencesTarget(ctx, args.listId, args.targetListId))
    ) {
      return;
    }

    const timestamp = Date.now();
    const previousParentListId = list.parentListId;

    if (previousParentListId && previousParentListId !== args.targetListId) {
      const previousParentEntries = await getEntriesForList(ctx, previousParentListId);
      const placeholderEntry = previousParentEntries.find(
        (entry) =>
          entry.linkedListId === args.listId || entry.detailPath === `list/${args.listId}`
      );

      if (placeholderEntry) {
        await ctx.db.delete(placeholderEntry._id);
        await resequenceListEntries(
          ctx,
          previousParentListId,
          previousParentEntries
            .filter((entry) => entry.clientId !== placeholderEntry.clientId)
            .map((entry) => entry.clientId)
        );
      }

      const previousParentList = await getListRecordByClientId(ctx, previousParentListId);
      if (previousParentList) {
        await replaceListRecord(ctx, previousParentList, {
          updatedAt: timestamp,
        });
      }
    }

    const targetEntries = await getEntriesForList(ctx, args.targetListId);
    const targetAlreadyLinksList = targetEntries.some(
      (entry) => entry.linkedListId === args.listId || entry.detailPath === `list/${args.listId}`
    );
    if (!targetAlreadyLinksList) {
      await ctx.db.insert(
        "listEntries",
        buildEntryInsert(
          createLinkedListEntry(list.title, args.listId),
          args.targetListId,
          nextAppendSortOrder(targetEntries)
        )
      );
    }

    await replaceListRecord(ctx, list, {
      parentListId: args.targetListId,
      showInMyLists: false,
      updatedAt: timestamp,
    });
    await replaceListRecord(ctx, targetList, {
      updatedAt: timestamp,
    });

    const workspace = await ensureWorkspaceRecord(ctx);
    await updateWorkspaceListsMetadata(ctx, {
      recentListIds: touchRecentListIds(
        touchRecentListIds(workspace.recentListIds, args.targetListId),
        args.listId
      ),
      recentActivityListIds: [previousParentListId, args.targetListId, args.listId].reduce(
        (ids, currentListId) => (currentListId ? touchRecentListIds(ids, currentListId) : ids),
        workspace.recentActivityListIds ?? []
      ),
    });
  },
});

export const setListPreferences = mutation({
  args: {
    listId: v.string(),
    updates: v.any(),
  },
  handler: async (ctx, args) => {
    const list = await getListRecordByClientId(ctx, args.listId);
    if (!list) {
      return;
    }

    await replaceListRecord(ctx, list, {
      preferences: mergeListPreferences(list.preferences, list.config, args.updates ?? {}),
      updatedAt: Date.now(),
    });

    const workspace = await ensureWorkspaceRecord(ctx);
    await updateWorkspaceListsMetadata(ctx, {
      recentActivityListIds: touchRecentListIds(workspace.recentActivityListIds ?? [], args.listId),
    });
  },
});

export const reorderLists = mutation({
  args: {
    orderedListIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.orderedListIds.length) {
      return;
    }

    const timestamp = Date.now();

    for (const [index, listId] of args.orderedListIds.entries()) {
      const list = await getListRecordByClientId(ctx, listId);
      if (!list || list.deletedAt) {
        continue;
      }

      await replaceListRecord(ctx, list, {
        sortOrder: (index + 1) * LIST_SORT_STEP,
        updatedAt: timestamp,
      });
    }

    const workspace = await ensureWorkspaceRecord(ctx);
    await updateWorkspaceListsMetadata(ctx, {
      recentActivityListIds: touchRecentListIds(
        workspace.recentActivityListIds ?? [],
        args.orderedListIds[0]!
      ),
    });
  },
});

export const markListOpened = mutation({
  args: { listId: v.string() },
  handler: async (ctx, args) => {
    const workspace = await ensureWorkspaceRecord(ctx);
    if (workspace.recentListIds[0] === args.listId) {
      return;
    }
    await updateWorkspaceListsMetadata(ctx, {
      recentListIds: touchRecentListIds(workspace.recentListIds, args.listId),
    });
  },
});

export const recordRecentSearch = mutation({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const trimmedQuery = args.query.trim();
    if (!trimmedQuery) {
      return;
    }

    const workspace = await ensureWorkspaceRecord(ctx);
    await updateWorkspaceListsMetadata(ctx, {
      recentSearches: [
        trimmedQuery,
        ...workspace.recentSearches.filter((value: string) => value !== trimmedQuery),
      ].slice(0, 8),
    });
  },
});

export const convertTagToSublist = mutation({
  args: {
    listId: v.string(),
    tag: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedTag = args.tag.trim();
    if (!normalizedTag) {
      return null;
    }

    const parentList = await getListRecordByClientId(ctx, args.listId);
    if (!parentList) {
      return null;
    }

    const parentEntries = await getEntriesForList(ctx, args.listId);
    const matchingEntries = parentEntries.filter((entry) => entry.tags.includes(normalizedTag));
    if (!matchingEntries.length) {
      return null;
    }

    const sublistId = createBlankListRecord({
      title: normalizedTag,
      preset: derivePresetFromConfig(parentList.config),
      config: createListConfig(parentList.config),
      tags: [normalizedTag],
      parentListId: args.listId,
    }).id;
    const timestamp = Date.now();
    const matchingEntryIds = new Set(matchingEntries.map((entry) => entry.clientId));
    const insertIndex = parentEntries.findIndex((entry) => matchingEntryIds.has(entry.clientId));

    await ctx.db.insert("lists", compact({
      clientId: sublistId,
      title: normalizedTag,
      description: undefined,
      tags: [normalizedTag],
      preset: derivePresetFromConfig(parentList.config),
      config: createListConfig(parentList.config),
      preferences: DEFAULT_LIST_PREFERENCES,
      pinned: false,
      createdAt: timestamp,
      updatedAt: timestamp,
      sortOrder: timestamp,
      templateId: undefined,
      showInMyLists: false,
      parentListId: args.listId,
    }));

    for (const [index, entry] of matchingEntries.entries()) {
      await replaceEntryRecord(ctx, entry, {
        listClientId: sublistId,
        tags: removeTag(entry.tags, normalizedTag),
        updatedAt: timestamp,
        sortOrder: (index + 1) * 1_000,
      });
    }

    const movedChildListIds = new Set(
      matchingEntries
        .map((entry) => entry.linkedListId)
        .filter((linkedListId): linkedListId is string => !!linkedListId)
    );
    for (const childListId of movedChildListIds) {
      const childList = await getListRecordByClientId(ctx, childListId);
      if (!childList) {
        continue;
      }
      await replaceListRecord(ctx, childList, {
        parentListId: sublistId,
        tags: addTag(childList.tags, normalizedTag),
        updatedAt: timestamp,
      });
    }

    const placeholderEntry = createLinkedListEntry(normalizedTag, sublistId, [normalizedTag]);
    await ctx.db.insert(
      "listEntries",
      buildEntryInsert(placeholderEntry, args.listId, 0)
    );

    const remainingIds = parentEntries
      .filter((entry) => !matchingEntryIds.has(entry.clientId))
      .map((entry) => entry.clientId);
    remainingIds.splice(insertIndex >= 0 ? insertIndex : 0, 0, placeholderEntry.id);
    await resequenceListEntries(ctx, args.listId, remainingIds);

    const workspace = await ensureWorkspaceRecord(ctx);
    await updateWorkspaceListsMetadata(ctx, {
      recentListIds: touchRecentListIds(workspace.recentListIds, args.listId),
      recentActivityListIds: touchRecentListIds(workspace.recentActivityListIds ?? [], args.listId),
    });

    return sublistId;
  },
});

export const convertSublistToTag = mutation({
  args: {
    sublistId: v.string(),
  },
  handler: async (ctx, args) => {
    const sublist = await getListRecordByClientId(ctx, args.sublistId);
    if (!sublist?.parentListId) {
      return null;
    }

    const normalizedTag = sublist.title.trim();
    if (!normalizedTag) {
      return null;
    }

    const parentId = sublist.parentListId;
    const parentEntries = await getEntriesForList(ctx, parentId);
    const sublistEntries = await getEntriesForList(ctx, args.sublistId);
    const placeholder = parentEntries.find(
      (entry) =>
        entry.linkedListId === args.sublistId || entry.detailPath === `list/${args.sublistId}`
    );
    const placeholderIndex = placeholder
      ? parentEntries.findIndex((entry) => entry.clientId === placeholder.clientId)
      : parentEntries.length;
    const timestamp = Date.now();

    for (const entry of sublistEntries) {
      await replaceEntryRecord(ctx, entry, {
        listClientId: parentId,
        tags: addTag(entry.tags, normalizedTag),
        updatedAt: timestamp,
        sortOrder: 0,
      });
    }

    const linkedChildListIds = new Set(
      sublistEntries
        .map((entry) => entry.linkedListId)
        .filter((linkedListId): linkedListId is string => !!linkedListId)
    );
    for (const childListId of linkedChildListIds) {
      const childList = await getListRecordByClientId(ctx, childListId);
      if (!childList) {
        continue;
      }

      await replaceListRecord(ctx, childList, {
        parentListId: parentId,
        tags: addTag(childList.tags, normalizedTag),
        updatedAt: timestamp,
      });
    }

    if (placeholder) {
      await ctx.db.delete(placeholder._id);
    }
    await ctx.db.delete(sublist._id);

    const remainingIds = parentEntries
      .filter((entry) => entry.clientId !== placeholder?.clientId)
      .map((entry) => entry.clientId);
    remainingIds.splice(
      placeholderIndex >= 0 ? placeholderIndex : remainingIds.length,
      0,
      ...sublistEntries.map((entry) => entry.clientId)
    );
    await resequenceListEntries(ctx, parentId, remainingIds);

    const workspace = await ensureWorkspaceRecord(ctx);
    await updateWorkspaceListsMetadata(ctx, {
      recentListIds: touchRecentListIds(
        workspace.recentListIds.filter((id: string) => id !== args.sublistId),
        parentId
      ),
      recentActivityListIds: touchRecentListIds(
        (workspace.recentActivityListIds ?? []).filter((id: string) => id !== args.sublistId),
        parentId
      ),
    });

    return normalizedTag;
  },
});

export const resetWorkspace = mutation({
  args: {},
  handler: async (ctx) => {
    for (const entry of await ctx.db.query("listEntries").collect()) {
      await ctx.db.delete(entry._id);
    }
    for (const list of await ctx.db.query("lists").collect()) {
      await ctx.db.delete(list._id);
    }
    for (const template of await ctx.db.query("savedTemplates").collect()) {
      await ctx.db.delete(template._id);
    }
    for (const itemUserData of await ctx.db.query("itemUserData").collect()) {
      await ctx.db.delete(itemUserData._id);
    }

    const workspace = await ensureWorkspaceRecord(ctx);
    await updateWorkspaceListsMetadata(ctx, {
      recentListIds: [],
      recentSearches: [],
      recentActivityListIds: [],
      continueEntryIds: [],
      lastImportedAt: workspace.lastImportedAt,
    });
  },
});

export const loadMockData = mutation({
  args: {},
  handler: async (ctx) => {
    await createMockWorkspaceState(ctx);
  },
});

export const addEntry = mutation({
  args: {
    listId: v.string(),
    draft: v.any(),
  },
  handler: async (ctx, args) => {
    const list = await getListRecordByClientId(ctx, args.listId);
    if (!list) {
      return null;
    }

    const entries = await getEntriesForList(ctx, args.listId);
    const entry = createEntryFromDraft(args.draft, list.config);
    let coverAssetId;
    let coverImageUrl = entry.coverAssetUri;
    if (args.draft?.uploadedCover?.storageId) {
      const asset = await createMediaAssetRecord(ctx, {
        storageId: args.draft.uploadedCover.storageId,
        kind: "entry-cover",
        mimeType: args.draft.uploadedCover.mimeType,
        fileName: args.draft.uploadedCover.fileName,
      });
      coverAssetId = asset?._id;
      coverImageUrl =
        (await resolveStorageUrl(ctx, args.draft.uploadedCover.storageId)) ??
        args.draft.uploadedCover.url ??
        undefined;
    }
    await ctx.db.insert(
      "listEntries",
      compact({
        ...buildEntryInsert(entry, args.listId, nextAppendSortOrder(entries)),
        coverAssetId,
        coverImageUrl,
      })
    );
    await attachLinkedListToParent(ctx, getLinkedListId(entry), args.listId);
    await replaceListRecord(ctx, list, {
      updatedAt: Date.now(),
    });

    const workspace = await ensureWorkspaceRecord(ctx);
    await updateWorkspaceListsMetadata(ctx, {
      recentListIds: touchRecentListIds(workspace.recentListIds, args.listId),
      recentActivityListIds: touchRecentListIds(workspace.recentActivityListIds ?? [], args.listId),
    });

    return entry.id;
  },
});

export const updateEntry = mutation({
  args: {
    entryId: v.string(),
    updates: v.any(),
  },
  handler: async (ctx, args) => {
    const entry = await getEntryRecordByClientId(ctx, args.entryId);
    if (!entry) {
      return;
    }

    const nextSourceRef =
      args.updates?.sourceRef !== undefined
        ? { ...entry.sourceRef, ...args.updates.sourceRef }
        : entry.sourceRef;
    await replaceEntryRecord(ctx, entry, {
      title: "title" in (args.updates ?? {}) ? args.updates.title : entry.title,
      type: "type" in (args.updates ?? {}) ? args.updates.type : entry.type,
      imageUrl: "imageUrl" in (args.updates ?? {}) ? args.updates.imageUrl : entry.imageUrl,
      detailPath:
        "detailPath" in (args.updates ?? {}) ? args.updates.detailPath : entry.detailPath,
      notes: "notes" in (args.updates ?? {}) ? args.updates.notes : entry.notes,
      customFields:
        "customFields" in (args.updates ?? {}) ? args.updates.customFields : entry.customFields,
      displayVariant:
        "displayVariant" in (args.updates ?? {})
          ? args.updates.displayVariant
          : entry.displayVariant,
      totalEpisodes:
        "totalEpisodes" in (args.updates ?? {})
          ? args.updates.totalEpisodes
          : entry.totalEpisodes,
      totalChapters:
        "totalChapters" in (args.updates ?? {})
          ? args.updates.totalChapters
          : entry.totalChapters,
      totalVolumes:
        "totalVolumes" in (args.updates ?? {})
          ? args.updates.totalVolumes
          : entry.totalVolumes,
      linkedEntryId:
        "linkedEntryId" in (args.updates ?? {})
          ? args.updates.linkedEntryId
          : entry.linkedEntryId,
      linkedListId:
        "linkedListId" in (args.updates ?? {})
          ? args.updates.linkedListId
          : entry.linkedListId,
      checked: "checked" in (args.updates ?? {}) ? args.updates.checked : entry.checked,
      status: "status" in (args.updates ?? {}) ? args.updates.status : entry.status,
      rating:
        "rating" in (args.updates ?? {})
          ? normalizeRating(args.updates.rating)
          : entry.rating,
      tags: "tags" in (args.updates ?? {}) ? normalizeTags(args.updates.tags) : entry.tags,
      progress:
        "progress" in (args.updates ?? {})
          ? normalizeProgress(args.updates.progress)
          : entry.progress,
      sourceRef: nextSourceRef,
      reminderAt:
        "reminderAt" in (args.updates ?? {}) ? args.updates.reminderAt : entry.reminderAt,
      coverImageUrl:
        "coverAssetUri" in (args.updates ?? {})
          ? args.updates.coverAssetUri
          : entry.coverImageUrl,
      productUrl:
        "productUrl" in (args.updates ?? {}) ? args.updates.productUrl : entry.productUrl,
      price: "price" in (args.updates ?? {}) ? args.updates.price : entry.price,
      archivedAt:
        "archivedAt" in (args.updates ?? {}) ? args.updates.archivedAt : entry.archivedAt,
      updatedAt: Date.now(),
    });
    const list = await getListRecordByClientId(ctx, entry.listClientId);
    if (list) {
      await replaceListRecord(ctx, list, {
        updatedAt: Date.now(),
      });
    }

    const workspace = await ensureWorkspaceRecord(ctx);
    await updateWorkspaceListsMetadata(ctx, {
      recentListIds: touchRecentListIds(workspace.recentListIds, entry.listClientId),
      recentActivityListIds: touchRecentListIds(
        workspace.recentActivityListIds ?? [],
        entry.listClientId
      ),
      continueEntryIds: touchContinueEntryIds(workspace.continueEntryIds ?? [], args.entryId),
    });
  },
});

export const deleteEntry = mutation({
  args: {
    entryId: v.string(),
  },
  handler: async (ctx, args) => {
    const entry = await getEntryRecordByClientId(ctx, args.entryId);
    if (!entry) {
      return;
    }

    const linkedListId = getLinkedListId(entry);
    const previousAssetId = entry.coverAssetId;
    await ctx.db.delete(entry._id);
    await detachLinkedListFromParentIfUnlinked(ctx, linkedListId, entry.listClientId);
    await maybeDeleteAssetIfUnreferenced(ctx, previousAssetId);
    const list = await getListRecordByClientId(ctx, entry.listClientId);
    if (list) {
      await replaceListRecord(ctx, list, {
        updatedAt: Date.now(),
      });
    }

    const workspace = await ensureWorkspaceRecord(ctx);
    await updateWorkspaceListsMetadata(ctx, {
      recentActivityListIds: touchRecentListIds(
        workspace.recentActivityListIds ?? [],
        entry.listClientId
      ),
      continueEntryIds: (workspace.continueEntryIds ?? []).filter(
        (id: string) => id !== args.entryId
      ),
    });
  },
});

export const moveEntries = mutation({
  args: {
    sourceListId: v.string(),
    targetListId: v.string(),
    entryIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.entryIds.length || args.sourceListId === args.targetListId) {
      return;
    }

    const sourceEntries = await getEntriesForList(ctx, args.sourceListId);
    const targetEntries = await getEntriesForList(ctx, args.targetListId);
    const movingEntries = sourceEntries.filter((entry) => args.entryIds.includes(entry.clientId));
    if (!movingEntries.length) {
      return;
    }

    for (const entry of movingEntries) {
      await replaceEntryRecord(ctx, entry, {
        listClientId: args.targetListId,
        updatedAt: Date.now(),
        sortOrder: 0,
      });
    }

    await resequenceListEntries(
      ctx,
      args.sourceListId,
      sourceEntries
        .filter((entry) => !args.entryIds.includes(entry.clientId))
        .map((entry) => entry.clientId)
    );
    await resequenceListEntries(ctx, args.targetListId, [
      ...movingEntries.map((entry) => entry.clientId),
      ...targetEntries.map((entry) => entry.clientId),
    ]);

    const movedLinkedListIds = Array.from(
      new Set(movingEntries.map((entry) => getLinkedListId(entry)).filter(Boolean))
    ) as string[];
    for (const linkedListId of movedLinkedListIds) {
      await attachLinkedListToParent(ctx, linkedListId, args.targetListId);
      await detachLinkedListFromParentIfUnlinked(ctx, linkedListId, args.sourceListId);
    }

    const sourceList = await getListRecordByClientId(ctx, args.sourceListId);
    if (sourceList) {
      await replaceListRecord(ctx, sourceList, {
        updatedAt: Date.now(),
      });
    }
    const targetList = await getListRecordByClientId(ctx, args.targetListId);
    if (targetList) {
      await replaceListRecord(ctx, targetList, {
        updatedAt: Date.now(),
      });
    }

    const workspace = await ensureWorkspaceRecord(ctx);
    await updateWorkspaceListsMetadata(ctx, {
      recentListIds: touchRecentListIds(workspace.recentListIds, args.targetListId),
      recentActivityListIds: touchRecentListIds(
        touchRecentListIds(workspace.recentActivityListIds ?? [], args.sourceListId),
        args.targetListId
      ),
    });
  },
});

export const reorderEntries = mutation({
  args: {
    listId: v.string(),
    orderedEntryIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    await resequenceListEntries(ctx, args.listId, args.orderedEntryIds);

    const list = await getListRecordByClientId(ctx, args.listId);
    if (list) {
      await replaceListRecord(ctx, list, {
        updatedAt: Date.now(),
      });
    }

    const workspace = await ensureWorkspaceRecord(ctx);
    await updateWorkspaceListsMetadata(ctx, {
      recentActivityListIds: touchRecentListIds(workspace.recentActivityListIds ?? [], args.listId),
    });
  },
});

export const setEntryChecked = mutation({
  args: {
    entryId: v.string(),
    checked: v.boolean(),
  },
  handler: async (ctx, args) => {
    const entry = await getEntryRecordByClientId(ctx, args.entryId);
    if (!entry) {
      return;
    }

    const list = await getListRecordByClientId(ctx, entry.listClientId);
    if (!list?.config.addons.includes("toggle")) {
      return;
    }

    await replaceEntryRecord(ctx, entry, {
      checked: args.checked,
      ...applyCheckedAutomation(list.config, args.checked),
      updatedAt: Date.now(),
    });
    await replaceListRecord(ctx, list, {
      updatedAt: Date.now(),
    });

    const workspace = await ensureWorkspaceRecord(ctx);
    await updateWorkspaceListsMetadata(ctx, {
      recentListIds: touchRecentListIds(workspace.recentListIds, entry.listClientId),
      recentActivityListIds: touchRecentListIds(
        workspace.recentActivityListIds ?? [],
        entry.listClientId
      ),
      continueEntryIds: touchContinueEntryIds(workspace.continueEntryIds ?? [], args.entryId),
    });
  },
});

export const setEntryStatus = mutation({
  args: {
    entryId: v.string(),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const entry = await getEntryRecordByClientId(ctx, args.entryId);
    if (!entry) {
      return;
    }

    await replaceEntryRecord(ctx, entry, {
      status: args.status,
      updatedAt: Date.now(),
    });

    const list = await getListRecordByClientId(ctx, entry.listClientId);
    if (list) {
      await replaceListRecord(ctx, list, {
        updatedAt: Date.now(),
      });
    }

    const workspace = await ensureWorkspaceRecord(ctx);
    await updateWorkspaceListsMetadata(ctx, {
      recentActivityListIds: touchRecentListIds(
        workspace.recentActivityListIds ?? [],
        entry.listClientId
      ),
      continueEntryIds: touchContinueEntryIds(workspace.continueEntryIds ?? [], args.entryId),
    });
  },
});

export const setEntryProgress = mutation({
  args: {
    entryId: v.string(),
    progress: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const entry = await getEntryRecordByClientId(ctx, args.entryId);
    if (!entry) {
      return;
    }

    await replaceEntryRecord(ctx, entry, {
      progress: args.progress ? normalizeProgress(args.progress) : undefined,
      updatedAt: Date.now(),
    });

    const list = await getListRecordByClientId(ctx, entry.listClientId);
    if (list) {
      await replaceListRecord(ctx, list, {
        updatedAt: Date.now(),
      });
    }

    const workspace = await ensureWorkspaceRecord(ctx);
    await updateWorkspaceListsMetadata(ctx, {
      recentActivityListIds: touchRecentListIds(
        workspace.recentActivityListIds ?? [],
        entry.listClientId
      ),
      continueEntryIds: touchContinueEntryIds(workspace.continueEntryIds ?? [], args.entryId),
    });
  },
});

export const duplicateEntries = mutation({
  args: {
    listId: v.string(),
    entryIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.entryIds.length) {
      return;
    }

    const entries = await getEntriesForList(ctx, args.listId);
    const duplicates = entries
      .filter((entry) => args.entryIds.includes(entry.clientId))
      .map((entry) => ({
        clientId: `entry-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        title: `${entry.title} (Copy)`,
        type: entry.type as ListEntry["type"],
        imageUrl: entry.imageUrl,
        detailPath: entry.detailPath,
        notes: entry.notes,
        customFields: entry.customFields,
        displayVariant: entry.displayVariant,
        totalEpisodes: entry.totalEpisodes,
        totalChapters: entry.totalChapters,
        totalVolumes: entry.totalVolumes,
        linkedEntryId: entry.linkedEntryId,
        linkedListId: entry.linkedListId,
        checked: entry.checked,
        status: entry.status,
        rating: entry.rating,
        tags: entry.tags,
        progress: entry.progress,
        sourceRef: entry.sourceRef,
        addedAt: Date.now(),
        updatedAt: Date.now(),
        reminderAt: entry.reminderAt,
        coverAssetId: entry.coverAssetId,
        coverImageUrl: entry.coverImageUrl,
        productUrl: entry.productUrl,
        price: entry.price,
        archivedAt: entry.archivedAt,
      }));

    const sortOrders = buildFrontSortOrders(
      duplicates.length,
      entries.length ? entries[0]!.sortOrder : null
    );
    for (const [index, entry] of duplicates.entries()) {
      await ctx.db.insert("listEntries", compact({
        ...entry,
        listClientId: args.listId,
        sortOrder: sortOrders[index]!,
      }));
    }

    await resequenceListEntries(ctx, args.listId, [
      ...duplicates.map((entry) => entry.clientId),
      ...entries.map((entry) => entry.clientId),
    ]);
    const list = await getListRecordByClientId(ctx, args.listId);
    if (list) {
      await replaceListRecord(ctx, list, {
        updatedAt: Date.now(),
      });
    }

    const workspace = await ensureWorkspaceRecord(ctx);
    await updateWorkspaceListsMetadata(ctx, {
      recentListIds: touchRecentListIds(workspace.recentListIds, args.listId),
      recentActivityListIds: touchRecentListIds(workspace.recentActivityListIds ?? [], args.listId),
    });
  },
});

export const archiveEntries = mutation({
  args: {
    entryIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.entryIds.length) {
      return;
    }

    const touchedListIds = new Set<string>();

    for (const entryId of args.entryIds) {
      const entry = await getEntryRecordByClientId(ctx, entryId);
      if (!entry) {
        continue;
      }

      await replaceEntryRecord(ctx, entry, {
        archivedAt: Date.now(),
        updatedAt: Date.now(),
      });
      touchedListIds.add(entry.listClientId);
    }

    if (!touchedListIds.size) {
      return;
    }

    for (const listId of touchedListIds) {
      const list = await getListRecordByClientId(ctx, listId);
      if (!list) {
        continue;
      }

      await replaceListRecord(ctx, list, {
        updatedAt: Date.now(),
      });
    }

    const workspace = await ensureWorkspaceRecord(ctx);
    await updateWorkspaceListsMetadata(ctx, {
      recentActivityListIds: Array.from(touchedListIds).reduce(
        (ids, listId) => touchRecentListIds(ids, listId),
        workspace.recentActivityListIds ?? []
      ),
      continueEntryIds: (workspace.continueEntryIds ?? []).filter(
        (id: string) => !args.entryIds.includes(id)
      ),
    });
  },
});

export const getSnapshot = mutation({
  args: {},
  handler: async (ctx) => {
    return await collectSnapshot(ctx);
  },
});
