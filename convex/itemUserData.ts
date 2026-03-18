import { v } from "convex/values";

import { mutation } from "./_generated/server";
import {
  applyItemUserDataProgressToEntry,
  compact,
  getEntriesForList,
  getItemUserDataRecordByKey,
  isCurrentListRecord,
  normalizeItemUserDataDraft,
  parseItemKey,
  replaceEntryRecord,
  replaceItemUserDataRecord,
  touchContinueEntryIds,
  updateWorkspaceListsMetadata,
  ensureWorkspaceRecord,
  isEmptyItemUserData,
} from "./shared";
import type { ListEntry } from "../data/mock-lists";

export const setItemUserData = mutation({
  args: {
    itemKey: v.string(),
    value: v.any(),
    entryId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const trimmedKey = args.itemKey.trim();
    if (!trimmedKey) {
      return;
    }

    const normalized = normalizeItemUserDataDraft(args.value);
    const parsedItemKey = parseItemKey(trimmedKey);

    if (parsedItemKey) {
      const lists = (await ctx.db.query("lists").collect()).filter(isCurrentListRecord);
      for (const list of lists) {
        const entries = await getEntriesForList(ctx, list.clientId);
        for (const entry of entries) {
          const updatedEntry = applyItemUserDataProgressToEntry(
            {
              id: entry.clientId,
              title: entry.title,
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
              addedAt: entry.addedAt,
              updatedAt: entry.updatedAt,
              reminderAt: entry.reminderAt,
              coverAssetUri: entry.coverImageUrl,
              productUrl: entry.productUrl,
              price: entry.price,
              archivedAt: entry.archivedAt,
            },
            normalized,
            parsedItemKey
          );
          if (!updatedEntry) {
            continue;
          }

          await replaceEntryRecord(ctx, entry, {
            progress: updatedEntry.progress,
            updatedAt: updatedEntry.updatedAt,
          });
        }
      }
    }

    const workspace = await ensureWorkspaceRecord(ctx);
    const nextContinueEntryIds = args.entryId
      ? touchContinueEntryIds(workspace.continueEntryIds ?? [], args.entryId)
      : workspace.continueEntryIds ?? [];

    const existing = await getItemUserDataRecordByKey(ctx, trimmedKey);
    if (isEmptyItemUserData(normalized)) {
      if (existing) {
        await ctx.db.delete(existing._id);
      }
      if (args.entryId) {
        await updateWorkspaceListsMetadata(ctx, {
          continueEntryIds: nextContinueEntryIds,
        });
      }
      return;
    }

    if (existing) {
      await replaceItemUserDataRecord(ctx, existing, {
        tags: normalized.tags,
        notes: normalized.notes,
        rating: normalized.rating,
        progress: normalized.progress,
        customFields: normalized.customFields,
        updatedAt: normalized.updatedAt,
      });
      if (args.entryId) {
        await updateWorkspaceListsMetadata(ctx, {
          continueEntryIds: nextContinueEntryIds,
        });
      }
      return;
    }

    await ctx.db.insert("itemUserData", compact({
      itemKey: trimmedKey,
      tags: normalized.tags,
      notes: normalized.notes,
      rating: normalized.rating,
      progress: normalized.progress,
      customFields: normalized.customFields,
      updatedAt: normalized.updatedAt,
    }));
    if (args.entryId) {
      await updateWorkspaceListsMetadata(ctx, {
        continueEntryIds: nextContinueEntryIds,
      });
    }
  },
});
