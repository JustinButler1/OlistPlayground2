import { v } from "convex/values";

import { ONBOARDING_INTEREST_IDS } from "../constants/onboarding";

export const MAIN_WORKSPACE_SLUG = "main";

export const entrySourceTypeValidator = v.union(
  v.literal("anime"),
  v.literal("manga"),
  v.literal("book"),
  v.literal("movie"),
  v.literal("tv"),
  v.literal("link"),
  v.literal("custom")
);

export const listEntryTypeValidator = v.union(
  entrySourceTypeValidator,
  v.literal("game"),
  v.literal("list")
);

export const entryStatusValidator = v.union(
  v.literal("planned"),
  v.literal("active"),
  v.literal("paused"),
  v.literal("completed"),
  v.literal("dropped")
);

export const entryProgressUnitValidator = v.union(
  v.literal("episode"),
  v.literal("chapter"),
  v.literal("volume"),
  v.literal("item"),
  v.literal("percent")
);

export const listPresetValidator = v.union(v.literal("blank"), v.literal("tracking"));

export const listViewModeValidator = v.union(
  v.literal("list"),
  v.literal("grid"),
  v.literal("compare"),
  v.literal("tier")
);

export const listSortModeValidator = v.union(
  v.literal("manual"),
  v.literal("updated-desc"),
  v.literal("title-asc"),
  v.literal("rating-desc"),
  v.literal("status")
);

export const listFilterModeValidator = v.union(
  v.literal("all"),
  v.literal("active"),
  v.literal("planned"),
  v.literal("completed"),
  v.literal("paused"),
  v.literal("dropped"),
  v.literal("archived")
);

export const listGroupModeValidator = v.union(
  v.literal("none"),
  v.literal("status"),
  v.literal("tag")
);

export const listAddonValidator = v.union(
  v.literal("toggle"),
  v.literal("status"),
  v.literal("progress"),
  v.literal("rating"),
  v.literal("tags"),
  v.literal("notes"),
  v.literal("reminders"),
  v.literal("cover"),
  v.literal("links"),
  v.literal("custom-fields"),
  v.literal("sublists"),
  v.literal("compare"),
  v.literal("tier")
);

export const listFieldKindValidator = v.union(
  v.literal("text"),
  v.literal("number"),
  v.literal("url")
);

export const displayVariantValidator = v.union(
  v.literal("simple"),
  v.literal("checkbox"),
  v.literal("details"),
  v.literal("checkbox-details")
);

export const mediaKindValidator = v.union(
  v.literal("avatar"),
  v.literal("list-image"),
  v.literal("entry-cover")
);

export const onboardingInterestValidator = v.union(
  ...ONBOARDING_INTEREST_IDS.map((interestId) => v.literal(interestId))
);

export const entrySourceRefValidator = v.object({
  source: entrySourceTypeValidator,
  externalId: v.optional(v.string()),
  detailPath: v.optional(v.string()),
  canonicalUrl: v.optional(v.string()),
});

export const customFieldValidator = v.object({
  title: v.string(),
  value: v.string(),
  format: v.optional(v.union(v.literal("text"), v.literal("numbers"))),
});

export const entryProgressValidator = v.object({
  current: v.optional(v.number()),
  total: v.optional(v.number()),
  unit: entryProgressUnitValidator,
  label: v.optional(v.string()),
  updatedAt: v.number(),
});

export const listAutomationBlockValidator = v.object({
  id: v.string(),
  kind: v.literal("if-then"),
  sourceAddonId: v.literal("toggle"),
  sourceField: v.literal("checked"),
  operator: v.literal("equals"),
  sourceValue: v.boolean(),
  targetAddonId: v.literal("status"),
  targetField: v.literal("status"),
  operation: v.literal("set"),
  targetValue: entryStatusValidator,
});

export const listFieldDefinitionValidator = v.object({
  id: v.string(),
  label: v.string(),
  kind: listFieldKindValidator,
});

export const listConfigValidator = v.object({
  addons: v.array(listAddonValidator),
  automationBlocks: v.array(listAutomationBlockValidator),
  fieldDefinitions: v.array(listFieldDefinitionValidator),
  defaultEntryType: v.union(
    v.literal("anime"),
    v.literal("manga"),
    v.literal("book"),
    v.literal("movie"),
    v.literal("tv"),
    v.literal("link"),
    v.literal("custom")
  ),
});

export const listPreferencesValidator = v.object({
  viewMode: listViewModeValidator,
  sortMode: listSortModeValidator,
  filterMode: listFilterModeValidator,
  groupMode: listGroupModeValidator,
  showCompleted: v.boolean(),
});

export const listEntryValidator = v.object({
  listClientId: v.string(),
  clientId: v.string(),
  title: v.string(),
  type: listEntryTypeValidator,
  imageUrl: v.optional(v.string()),
  detailPath: v.optional(v.string()),
  notes: v.optional(v.string()),
  customFields: v.optional(v.array(customFieldValidator)),
  displayVariant: v.optional(displayVariantValidator),
  totalEpisodes: v.optional(v.number()),
  totalChapters: v.optional(v.number()),
  totalVolumes: v.optional(v.number()),
  linkedEntryId: v.optional(v.string()),
  linkedListId: v.optional(v.string()),
  checked: v.optional(v.boolean()),
  status: v.optional(entryStatusValidator),
  rating: v.optional(v.number()),
  tags: v.array(v.string()),
  progress: v.optional(entryProgressValidator),
  sourceRef: entrySourceRefValidator,
  addedAt: v.number(),
  updatedAt: v.number(),
  reminderAt: v.optional(v.number()),
  coverAssetId: v.optional(v.id("mediaAssets")),
  coverImageUrl: v.optional(v.string()),
  productUrl: v.optional(v.string()),
  price: v.optional(v.string()),
  archivedAt: v.optional(v.number()),
  sortOrder: v.number(),
});

export const starterEntryValidator = v.object({
  title: v.string(),
  type: listEntryTypeValidator,
  imageUrl: v.optional(v.string()),
  detailPath: v.optional(v.string()),
  notes: v.optional(v.string()),
  customFields: v.optional(v.array(customFieldValidator)),
  displayVariant: v.optional(displayVariantValidator),
  totalEpisodes: v.optional(v.number()),
  totalChapters: v.optional(v.number()),
  totalVolumes: v.optional(v.number()),
  linkedEntryId: v.optional(v.string()),
  linkedListId: v.optional(v.string()),
  checked: v.optional(v.boolean()),
  status: v.optional(entryStatusValidator),
  rating: v.optional(v.number()),
  tags: v.optional(v.array(v.string())),
  progress: v.optional(entryProgressValidator),
  sourceRef: v.optional(entrySourceRefValidator),
  reminderAt: v.optional(v.number()),
  productUrl: v.optional(v.string()),
  price: v.optional(v.string()),
  archivedAt: v.optional(v.number()),
});

export const itemUserDataValidator = v.object({
  itemKey: v.string(),
  tags: v.array(v.string()),
  notes: v.optional(v.string()),
  rating: v.optional(v.number()),
  progress: v.optional(entryProgressValidator),
  customFields: v.array(customFieldValidator),
  updatedAt: v.number(),
});
