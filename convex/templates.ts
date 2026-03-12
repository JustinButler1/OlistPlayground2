import { v } from "convex/values";

import { mutation } from "./_generated/server";
import {
  compact,
  createTemplateId,
  getEntriesForList,
  getListRecordByClientId,
  getTemplateRecordByClientId,
} from "./shared";

export const saveListAsTemplate = mutation({
  args: {
    listId: v.string(),
    title: v.string(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const list = await getListRecordByClientId(ctx, args.listId);
    if (!list) {
      return null;
    }

    const entries = await getEntriesForList(ctx, args.listId);
    const templateId = createTemplateId();

    await ctx.db.insert("savedTemplates", {
      clientId: templateId,
      title: args.title.trim(),
      description: args.description.trim(),
      preset: list.preset,
      config: list.config,
      starterEntries: entries.map((entry) =>
        compact({
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
          reminderAt: entry.reminderAt,
          productUrl: entry.productUrl,
          price: entry.price,
          archivedAt: entry.archivedAt,
        })
      ),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return templateId;
  },
});

export const deleteTemplate = mutation({
  args: {
    templateId: v.string(),
  },
  handler: async (ctx, args) => {
    const template = await getTemplateRecordByClientId(ctx, args.templateId);
    if (!template) {
      return;
    }

    await ctx.db.delete(template._id);
  },
});
import type { ListEntry } from "../data/mock-lists";
