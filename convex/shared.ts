import {
  applyAutomationBlocks,
  createListConfig,
  createPowerUserMockSeed,
  DEFAULT_LIST_PREFERENCES,
  derivePresetFromConfig,
  sanitizeListPreferencesForConfig,
  type EntrySourceRef,
  type ItemUserData,
  type ListAutomationBlock,
  type ListConfig,
  type ListEntry,
  type ListFieldDefinition,
  type ListPreferences,
  type ListTemplate,
  type TrackerList,
} from "../data/mock-lists";
import { normalizeProgress, normalizeRating } from "../lib/tracker-metadata";
import { MAIN_WORKSPACE_SLUG } from "./model";

const ENTRY_SORT_STEP = 1_000;

export interface EntryDraftLike
  extends Partial<
    Omit<
      ListEntry,
      "id" | "addedAt" | "updatedAt" | "checked" | "status" | "tags" | "sourceRef"
    >
  > {
  title: string;
  type: ListEntry["type"];
  checked?: ListEntry["checked"];
  status?: ListEntry["status"];
  tags?: string[];
  sourceRef?: EntrySourceRef;
}

export interface SnapshotPayload {
  workspace: {
    slug: string;
    recentSearches: string[];
    recentListIds: string[];
    createdAt: number;
    updatedAt: number;
    lastImportedAt?: number;
  };
  onboardingState: {
    version: 1;
    profile: {
      displayName: string;
      birthDate: string | null;
      avatarUri: string | null;
      interests: string[];
    };
    completedAt: number | null;
  };
  listsState: {
    version: 5;
    lists: TrackerList[];
    deletedLists: TrackerList[];
    savedTemplates: ListTemplate[];
    itemUserDataByKey: Record<string, ItemUserData>;
    recentSearches: string[];
    recentListIds: string[];
  };
  isEmpty: boolean;
}

export function createListId(): string {
  return `list-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createEntryId(): string {
  return `entry-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createTemplateId(): string {
  return `template-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function touchRecentListIds(currentIds: string[], listId: string): string[] {
  return [listId, ...currentIds.filter((id) => id !== listId)].slice(0, 10);
}

export function normalizeTags(tags?: string[]): string[] {
  if (!tags) {
    return [];
  }

  return Array.from(
    new Set(
      tags
        .map((tag) => tag.trim())
        .filter(Boolean)
    )
  );
}

export function addTag(tags: string[], tag: string): string[] {
  return normalizeTags([...tags, tag]);
}

export function removeTag(tags: string[], tag: string): string[] {
  return normalizeTags(tags.filter((value) => value !== tag));
}

export function parseItemKey(itemKey: string): { source: string; externalId: string } | null {
  const separatorIndex = itemKey.indexOf(":");
  if (separatorIndex <= 0 || separatorIndex === itemKey.length - 1) {
    return null;
  }

  return {
    source: itemKey.slice(0, separatorIndex),
    externalId: itemKey.slice(separatorIndex + 1),
  };
}

export function normalizeItemUserDataDraft(value: ItemUserData): ItemUserData {
  return {
    tags: value.tags
      .map((tag) => tag.trim())
      .filter(Boolean),
    notes: value.notes?.trim() || undefined,
    rating: normalizeRating(value.rating),
    progress: normalizeProgress(value.progress),
    customFields: value.customFields
      .map((field) => ({
        title: field.title.trim(),
        value: field.value.trim(),
        format: field.format === "numbers" ? ("numbers" as const) : ("text" as const),
      }))
      .filter((field) => field.title || field.value),
    updatedAt: Date.now(),
  };
}

export function isEmptyItemUserData(value: ItemUserData): boolean {
  return (
    value.tags.length === 0 &&
    !value.notes &&
    value.rating === undefined &&
    value.progress === undefined &&
    value.customFields.length === 0
  );
}

export function createEntryFromDraft(draft: EntryDraftLike, config?: ListConfig): ListEntry {
  const timestamp = Date.now();
  const canonicalUrl =
    draft.sourceRef?.canonicalUrl ??
    draft.productUrl ??
    (draft.type === "link" ? draft.productUrl : undefined);
  const hasToggle = config?.addons.includes("toggle") ?? false;
  const hasStatus = config?.addons.includes("status") ?? false;

  return {
    id: createEntryId(),
    title: draft.title.trim(),
    type: draft.type,
    imageUrl: draft.imageUrl,
    detailPath: draft.detailPath,
    notes: draft.notes,
    customFields: draft.customFields,
    displayVariant: draft.displayVariant,
    totalEpisodes: draft.totalEpisodes,
    totalChapters: draft.totalChapters,
    totalVolumes: draft.totalVolumes,
    linkedEntryId: draft.linkedEntryId,
    linkedListId: draft.linkedListId,
    checked: hasToggle ? draft.checked ?? false : draft.checked,
    status: hasStatus ? draft.status ?? "planned" : draft.status,
    rating: normalizeRating(draft.rating),
    tags: normalizeTags(draft.tags),
    progress: normalizeProgress(
      draft.progress
        ? {
            ...draft.progress,
            updatedAt: draft.progress.updatedAt ?? timestamp,
          }
        : undefined
    ),
    sourceRef:
      draft.sourceRef ??
      ({
        source:
          draft.type === "game" || draft.type === "list" ? "custom" : draft.type,
        externalId: draft.detailPath?.split("/").pop(),
        detailPath: draft.detailPath,
        canonicalUrl,
      } satisfies EntrySourceRef),
    addedAt: timestamp,
    updatedAt: timestamp,
    reminderAt: draft.reminderAt,
    coverAssetUri: draft.coverAssetUri,
    productUrl: draft.productUrl,
    price: draft.price,
    archivedAt: draft.archivedAt,
  };
}

export function createLinkedListEntry(
  title: string,
  linkedListId: string,
  tags: string[] = []
): ListEntry {
  return createEntryFromDraft({
    title,
    type: "list",
    detailPath: `list/${linkedListId}`,
    linkedListId,
    tags,
    sourceRef: {
      source: "custom",
      detailPath: `list/${linkedListId}`,
    },
  });
}

export function isLocalAssetUri(uri?: string | null): boolean {
  if (!uri) {
    return false;
  }

  return (
    uri.startsWith("file://") ||
    uri.startsWith("content://") ||
    uri.startsWith("blob:") ||
    uri.startsWith("data:")
  );
}

export function isRemoteUrl(uri?: string | null): boolean {
  if (!uri) {
    return false;
  }

  return /^https?:\/\//i.test(uri);
}

export function compact<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined)
  ) as T;
}

export function withoutSystemFields<T extends { _id: unknown; _creationTime: unknown }>(
  value: T
): Omit<T, "_id" | "_creationTime"> {
  const { _id, _creationTime, ...rest } = value;
  return rest;
}

export function isCurrentListRecord(value: any): value is {
  _id: any;
  _creationTime: number;
  clientId: string;
  title: string;
  tags: string[];
  preset: "blank" | "tracking";
  config: ListConfig;
  preferences: ListPreferences;
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
  imageAssetId?: any;
  imageUrl?: string;
  description?: string;
  templateId?: string;
  parentListId?: string;
  archivedAt?: number;
  deletedAt?: number;
} {
  return (
    !!value &&
    typeof value === "object" &&
    typeof value.clientId === "string" &&
    typeof value.title === "string" &&
    Array.isArray(value.tags) &&
    (value.preset === "blank" || value.preset === "tracking") &&
    typeof value.config === "object" &&
    typeof value.preferences === "object" &&
    typeof value.pinned === "boolean" &&
    typeof value.createdAt === "number" &&
    typeof value.updatedAt === "number"
  );
}

export function isCurrentEntryRecord(value: any): value is {
  _id: any;
  _creationTime: number;
  listClientId: string;
  clientId: string;
  title: string;
  type: string;
  tags: string[];
  sourceRef: EntrySourceRef;
  addedAt: number;
  updatedAt: number;
  sortOrder: number;
  imageUrl?: string;
  detailPath?: string;
  notes?: string;
  customFields?: ListEntry["customFields"];
  displayVariant?: ListEntry["displayVariant"];
  totalEpisodes?: number;
  totalChapters?: number;
  totalVolumes?: number;
  linkedEntryId?: string;
  linkedListId?: string;
  checked?: boolean;
  status?: ListEntry["status"];
  rating?: number;
  progress?: ListEntry["progress"];
  reminderAt?: number;
  coverAssetId?: any;
  coverImageUrl?: string;
  productUrl?: string;
  price?: string;
  archivedAt?: number;
} {
  return (
    !!value &&
    typeof value === "object" &&
    typeof value.listClientId === "string" &&
    typeof value.clientId === "string" &&
    typeof value.title === "string" &&
    Array.isArray(value.tags) &&
    typeof value.sourceRef === "object" &&
    typeof value.addedAt === "number" &&
    typeof value.updatedAt === "number" &&
    typeof value.sortOrder === "number"
  );
}

export function isCurrentTemplateRecord(value: any): value is {
  _id: any;
  _creationTime: number;
  clientId: string;
  title: string;
  description: string;
  preset: "blank" | "tracking";
  config: ListConfig;
  starterEntries: ListTemplate["starterEntries"];
  createdAt: number;
  updatedAt: number;
} {
  return (
    !!value &&
    typeof value === "object" &&
    typeof value.clientId === "string" &&
    typeof value.title === "string" &&
    typeof value.description === "string" &&
    (value.preset === "blank" || value.preset === "tracking") &&
    typeof value.config === "object" &&
    Array.isArray(value.starterEntries) &&
    typeof value.createdAt === "number" &&
    typeof value.updatedAt === "number"
  );
}

export function isCurrentItemUserDataRecord(value: any): value is {
  _id: any;
  _creationTime: number;
  itemKey: string;
  tags: string[];
  customFields: ItemUserData["customFields"];
  updatedAt: number;
  notes?: string;
  rating?: number;
  progress?: ItemUserData["progress"];
} {
  return (
    !!value &&
    typeof value === "object" &&
    typeof value.itemKey === "string" &&
    Array.isArray(value.tags) &&
    Array.isArray(value.customFields) &&
    typeof value.updatedAt === "number"
  );
}

export async function getWorkspaceRecord(ctx: any) {
  return await ctx.db
    .query("workspace")
    .withIndex("by_slug", (q: any) => q.eq("slug", MAIN_WORKSPACE_SLUG))
    .unique();
}

export async function ensureWorkspaceRecord(ctx: any) {
  const existing = await getWorkspaceRecord(ctx);
  if (existing) {
    return existing;
  }

  const now = Date.now();
  const id = await ctx.db.insert("workspace", {
    slug: MAIN_WORKSPACE_SLUG,
    recentSearches: [],
    recentListIds: [],
    createdAt: now,
    updatedAt: now,
  });

  return await ctx.db.get(id);
}

export async function getOnboardingProfileRecord(ctx: any) {
  return await ctx.db
    .query("onboardingProfile")
    .withIndex("by_workspaceSlug", (q: any) => q.eq("workspaceSlug", MAIN_WORKSPACE_SLUG))
    .unique();
}

export async function ensureOnboardingProfileRecord(ctx: any) {
  const existing = await getOnboardingProfileRecord(ctx);
  if (existing) {
    return existing;
  }

  const now = Date.now();
  const id = await ctx.db.insert("onboardingProfile", {
    workspaceSlug: MAIN_WORKSPACE_SLUG,
    displayName: "",
    birthDate: null,
    interests: [],
    completedAt: null,
    updatedAt: now,
  });

  return await ctx.db.get(id);
}

export async function getListRecordByClientId(ctx: any, clientId: string) {
  return await ctx.db
    .query("lists")
    .withIndex("by_clientId", (q: any) => q.eq("clientId", clientId))
    .unique();
}

export async function getTemplateRecordByClientId(ctx: any, clientId: string) {
  return await ctx.db
    .query("savedTemplates")
    .withIndex("by_clientId", (q: any) => q.eq("clientId", clientId))
    .unique();
}

export async function getItemUserDataRecordByKey(ctx: any, itemKey: string) {
  return await ctx.db
    .query("itemUserData")
    .withIndex("by_itemKey", (q: any) => q.eq("itemKey", itemKey))
    .unique();
}

export async function getEntryRecordByClientId(ctx: any, clientId: string) {
  return await ctx.db
    .query("listEntries")
    .withIndex("by_clientId", (q: any) => q.eq("clientId", clientId))
    .unique();
}

export async function getEntriesForList(ctx: any, listClientId: string) {
  const entries = await ctx.db
    .query("listEntries")
    .withIndex("by_listClientId", (q: any) => q.eq("listClientId", listClientId))
    .collect();

  return [...entries].filter(isCurrentEntryRecord).sort((left, right) => left.sortOrder - right.sortOrder);
}

export function buildEntryInsert(
  entry: ListEntry,
  listClientId: string,
  sortOrder: number
) {
  return compact({
    listClientId,
    clientId: entry.id,
    title: entry.title,
    type: entry.type,
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
    tags: normalizeTags(entry.tags),
    progress: entry.progress,
    sourceRef: entry.sourceRef,
    addedAt: entry.addedAt,
    updatedAt: entry.updatedAt,
    reminderAt: entry.reminderAt,
    coverImageUrl: entry.coverAssetUri,
    productUrl: entry.productUrl,
    price: entry.price,
    archivedAt: entry.archivedAt,
    sortOrder,
  });
}

export async function replaceListRecord(ctx: any, doc: any, updates: Record<string, unknown>) {
  await ctx.db.replace(doc._id, compact({ ...withoutSystemFields(doc), ...updates }));
  return await ctx.db.get(doc._id);
}

export async function replaceEntryRecord(ctx: any, doc: any, updates: Record<string, unknown>) {
  await ctx.db.replace(doc._id, compact({ ...withoutSystemFields(doc), ...updates }));
  return await ctx.db.get(doc._id);
}

export async function replaceTemplateRecord(ctx: any, doc: any, updates: Record<string, unknown>) {
  await ctx.db.replace(doc._id, compact({ ...withoutSystemFields(doc), ...updates }));
  return await ctx.db.get(doc._id);
}

export async function replaceOnboardingProfileRecord(
  ctx: any,
  doc: any,
  updates: Record<string, unknown>
) {
  await ctx.db.replace(doc._id, compact({ ...withoutSystemFields(doc), ...updates }));
  return await ctx.db.get(doc._id);
}

export async function replaceWorkspaceRecord(ctx: any, doc: any, updates: Record<string, unknown>) {
  await ctx.db.replace(doc._id, compact({ ...withoutSystemFields(doc), ...updates }));
  return await ctx.db.get(doc._id);
}

export async function replaceItemUserDataRecord(
  ctx: any,
  doc: any,
  updates: Record<string, unknown>
) {
  await ctx.db.replace(doc._id, compact({ ...withoutSystemFields(doc), ...updates }));
  return await ctx.db.get(doc._id);
}

export async function getMediaAssetById(ctx: any, assetId: any) {
  return assetId ? await ctx.db.get(assetId) : null;
}

export async function getMediaAssetByStorageId(ctx: any, storageId: any) {
  if (!storageId) {
    return null;
  }

  return await ctx.db
    .query("mediaAssets")
    .withIndex("by_storageId", (q: any) => q.eq("storageId", storageId))
    .unique();
}

export async function createMediaAssetRecord(
  ctx: any,
  args: {
    storageId: any;
    kind: "avatar" | "list-image" | "entry-cover";
    mimeType?: string;
    fileName?: string;
  }
) {
  const now = Date.now();
  const id = await ctx.db.insert(
    "mediaAssets",
    compact({
      workspaceSlug: MAIN_WORKSPACE_SLUG,
      storageId: args.storageId,
      kind: args.kind,
      mimeType: args.mimeType,
      fileName: args.fileName,
      createdAt: now,
    })
  );
  return await ctx.db.get(id);
}

export async function maybeDeleteAssetIfUnreferenced(ctx: any, assetId: any) {
  if (!assetId) {
    return { deleted: false };
  }

  const asset = await ctx.db.get(assetId);
  if (!asset) {
    return { deleted: false };
  }

  const onboardingProfile = await getOnboardingProfileRecord(ctx);
  if (onboardingProfile?.avatarStorageId === asset.storageId) {
    return { deleted: false };
  }

  const listRef = await ctx.db
    .query("lists")
    .filter((q: any) => q.eq(q.field("imageAssetId"), assetId))
    .first();
  if (listRef) {
    return { deleted: false };
  }

  const entryRef = await ctx.db
    .query("listEntries")
    .filter((q: any) => q.eq(q.field("coverAssetId"), assetId))
    .first();
  if (entryRef) {
    return { deleted: false };
  }

  await ctx.storage.delete(asset.storageId);
  await ctx.db.delete(assetId);
  return { deleted: true };
}

export async function resolveStorageUrl(ctx: any, storageId?: any) {
  if (!storageId) {
    return null;
  }

  return (await ctx.storage.getUrl(storageId)) ?? null;
}

export async function importListStateIntoWorkspace(
  ctx: any,
  state: {
    lists: TrackerList[];
    deletedLists: TrackerList[];
    savedTemplates: ListTemplate[];
    itemUserDataByKey: Record<string, ItemUserData>;
    recentSearches: string[];
    recentListIds: string[];
  }
) {
  for (const existing of await ctx.db.query("listEntries").collect()) {
    await ctx.db.delete(existing._id);
  }
  for (const existing of await ctx.db.query("lists").collect()) {
    await ctx.db.delete(existing._id);
  }
  for (const existing of await ctx.db.query("savedTemplates").collect()) {
    await ctx.db.delete(existing._id);
  }
  for (const existing of await ctx.db.query("itemUserData").collect()) {
    await ctx.db.delete(existing._id);
  }

  const allLists = [...state.lists, ...state.deletedLists];
  for (const list of allLists) {
    await ctx.db.insert(
      "lists",
      compact({
        clientId: list.id,
        title: list.title,
        imageUrl: list.imageUrl,
        description: list.description,
        tags: normalizeTags(list.tags),
        preset: list.preset,
        config: createListConfig(list.config),
        preferences: sanitizeListPreferencesForConfig(
          list.preferences,
          createListConfig(list.config)
        ),
        pinned: list.pinned,
        createdAt: list.createdAt,
        updatedAt: list.updatedAt,
        templateId: list.templateId,
        parentListId: list.parentListId,
        archivedAt: list.archivedAt,
        deletedAt: list.deletedAt,
      })
    );

    for (const [entryIndex, entry] of list.entries.entries()) {
      await ctx.db.insert(
        "listEntries",
        buildEntryInsert(entry, list.id, entryIndex * ENTRY_SORT_STEP)
      );
    }
  }

  for (const template of state.savedTemplates) {
    await ctx.db.insert("savedTemplates", {
      clientId: template.id,
      title: template.title,
      description: template.description,
      preset: template.preset,
      config: createListConfig(template.config),
      starterEntries: template.starterEntries.map((entry) =>
        compact({
          title: entry.title,
          type: entry.type,
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
          tags: normalizeTags(entry.tags),
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
  }

  for (const [itemKey, value] of Object.entries(state.itemUserDataByKey)) {
    const normalized = normalizeItemUserDataDraft(value);
    if (isEmptyItemUserData(normalized)) {
      continue;
    }

    await ctx.db.insert("itemUserData", {
      itemKey,
      tags: normalized.tags,
      notes: normalized.notes,
      rating: normalized.rating,
      progress: normalized.progress,
      customFields: normalized.customFields,
      updatedAt: normalized.updatedAt,
    });
  }

  const workspace = await ensureWorkspaceRecord(ctx);
  await replaceWorkspaceRecord(ctx, workspace, {
    recentSearches: state.recentSearches.slice(0, 8),
    recentListIds: state.recentListIds.slice(0, 10),
    updatedAt: Date.now(),
    lastImportedAt: Date.now(),
  });
}

export async function createMockWorkspaceState(ctx: any) {
  const seed = createPowerUserMockSeed();
  await importListStateIntoWorkspace(ctx, {
    lists: seed.lists,
    deletedLists: seed.deletedLists,
    savedTemplates: seed.savedTemplates,
    itemUserDataByKey: seed.itemUserDataByKey,
    recentSearches: seed.recentSearches,
    recentListIds: seed.recentListIds,
  });
}

export async function collectSnapshot(ctx: any): Promise<SnapshotPayload> {
  const workspace = await ensureWorkspaceRecord(ctx);
  const onboardingProfile = await ensureOnboardingProfileRecord(ctx);
  const listDocs = (await ctx.db.query("lists").collect()).filter(isCurrentListRecord);
  const entryDocs = (await ctx.db.query("listEntries").collect()).filter(isCurrentEntryRecord);
  const templateDocs = (await ctx.db.query("savedTemplates").collect()).filter(
    isCurrentTemplateRecord
  );
  const itemUserDataDocs = (await ctx.db.query("itemUserData").collect()).filter(
    isCurrentItemUserDataRecord
  );
  const listImageAssets = new Map();
  const entryCoverAssets = new Map();

  for (const listDoc of listDocs) {
    if (listDoc.imageAssetId && !listImageAssets.has(listDoc.imageAssetId)) {
      listImageAssets.set(listDoc.imageAssetId, await getMediaAssetById(ctx, listDoc.imageAssetId));
    }
  }
  for (const entryDoc of entryDocs) {
    if (entryDoc.coverAssetId && !entryCoverAssets.has(entryDoc.coverAssetId)) {
      entryCoverAssets.set(entryDoc.coverAssetId, await getMediaAssetById(ctx, entryDoc.coverAssetId));
    }
  }

  const entriesByListId = new Map<string, ListEntry[]>();
  for (const entryDoc of [...entryDocs].sort((left, right) => left.sortOrder - right.sortOrder)) {
    const coverAsset = entryDoc.coverAssetId ? entryCoverAssets.get(entryDoc.coverAssetId) : null;
    const resolvedCoverUrl =
      (coverAsset ? await resolveStorageUrl(ctx, coverAsset.storageId) : null) ??
      entryDoc.coverImageUrl ??
      null;
    const normalizedEntry = compact({
      id: entryDoc.clientId,
      title: entryDoc.title,
      type: entryDoc.type,
      imageUrl: entryDoc.imageUrl,
      detailPath: entryDoc.detailPath,
      notes: entryDoc.notes,
      customFields: entryDoc.customFields,
      displayVariant: entryDoc.displayVariant,
      totalEpisodes: entryDoc.totalEpisodes,
      totalChapters: entryDoc.totalChapters,
      totalVolumes: entryDoc.totalVolumes,
      linkedEntryId: entryDoc.linkedEntryId,
      linkedListId: entryDoc.linkedListId,
      checked: entryDoc.checked,
      status: entryDoc.status,
      rating: entryDoc.rating,
      tags: entryDoc.tags,
      progress: entryDoc.progress,
      sourceRef: entryDoc.sourceRef,
      addedAt: entryDoc.addedAt,
      updatedAt: entryDoc.updatedAt,
      reminderAt: entryDoc.reminderAt,
      coverAssetUri: resolvedCoverUrl ?? undefined,
      productUrl: entryDoc.productUrl,
      price: entryDoc.price,
      archivedAt: entryDoc.archivedAt,
    }) as ListEntry;
    const currentEntries = entriesByListId.get(entryDoc.listClientId) ?? [];
    currentEntries.push(normalizedEntry);
    entriesByListId.set(entryDoc.listClientId, currentEntries);
  }

  const normalizedLists = await Promise.all(
    listDocs.map(async (listDoc: any) => {
      const imageAsset = listDoc.imageAssetId ? listImageAssets.get(listDoc.imageAssetId) : null;
      const resolvedImageUrl =
        (imageAsset ? await resolveStorageUrl(ctx, imageAsset.storageId) : null) ??
        listDoc.imageUrl ??
        null;

      return compact({
        id: listDoc.clientId,
        title: listDoc.title,
        imageUrl: resolvedImageUrl ?? undefined,
        description: listDoc.description,
        tags: listDoc.tags,
        preset: listDoc.preset,
        config: createListConfig(listDoc.config),
        entries: entriesByListId.get(listDoc.clientId) ?? [],
        preferences: sanitizeListPreferencesForConfig(
          listDoc.preferences,
          createListConfig(listDoc.config)
        ),
        pinned: listDoc.pinned,
        createdAt: listDoc.createdAt,
        updatedAt: listDoc.updatedAt,
        templateId: listDoc.templateId,
        parentListId: listDoc.parentListId,
        archivedAt: listDoc.archivedAt,
        deletedAt: listDoc.deletedAt,
      }) as TrackerList;
    })
  );

  const activeLists = normalizedLists.filter((list) => !list.deletedAt);
  const deletedLists = normalizedLists
    .filter((list) => !!list.deletedAt)
    .sort((left, right) => (right.deletedAt ?? 0) - (left.deletedAt ?? 0));

  const avatarUrl = onboardingProfile.avatarStorageId
    ? (await resolveStorageUrl(ctx, onboardingProfile.avatarStorageId)) ??
      onboardingProfile.avatarUrl ??
      null
    : onboardingProfile.avatarUrl ?? null;

  const itemUserDataByKey = Object.fromEntries(
    itemUserDataDocs.map((doc: any) => [
      doc.itemKey,
      compact({
        tags: doc.tags,
        notes: doc.notes,
        rating: doc.rating,
        progress: doc.progress,
        customFields: doc.customFields,
        updatedAt: doc.updatedAt,
      }),
    ])
  ) as Record<string, ItemUserData>;

  const savedTemplates = templateDocs.map((doc: any) => ({
    id: doc.clientId,
    title: doc.title,
    description: doc.description,
    source: "user" as const,
    preset: doc.preset,
    config: createListConfig(doc.config),
    starterEntries: doc.starterEntries,
  }));

  const isEmpty =
    activeLists.length === 0 &&
    deletedLists.length === 0 &&
    savedTemplates.length === 0 &&
    Object.keys(itemUserDataByKey).length === 0 &&
    !onboardingProfile.displayName.trim() &&
    !onboardingProfile.birthDate &&
    onboardingProfile.interests.length === 0 &&
    !onboardingProfile.avatarStorageId &&
    !onboardingProfile.completedAt;

  return {
    workspace: compact({
      slug: workspace.slug,
      recentSearches: workspace.recentSearches,
      recentListIds: workspace.recentListIds,
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt,
      lastImportedAt: workspace.lastImportedAt,
    }),
    onboardingState: {
      version: 1,
      profile: {
        displayName: onboardingProfile.displayName,
        birthDate: onboardingProfile.birthDate,
        avatarUri: avatarUrl,
        interests: onboardingProfile.interests,
      },
      completedAt: onboardingProfile.completedAt,
    },
    listsState: {
      version: 5,
      lists: activeLists,
      deletedLists,
      savedTemplates,
      itemUserDataByKey,
      recentSearches: workspace.recentSearches,
      recentListIds: workspace.recentListIds,
    },
    isEmpty,
  };
}

export function nextAppendSortOrder(entries: Array<{ sortOrder: number }>): number {
  return entries.length ? entries[entries.length - 1]!.sortOrder + ENTRY_SORT_STEP : ENTRY_SORT_STEP;
}

export function buildFrontSortOrders(count: number, currentMin?: number | null): number[] {
  const baseline = currentMin ?? ENTRY_SORT_STEP;
  return Array.from({ length: count }, (_, index) => baseline - ENTRY_SORT_STEP * (count - index));
}

export async function resequenceListEntries(ctx: any, listClientId: string, orderedClientIds: string[]) {
  const currentEntries = await getEntriesForList(ctx, listClientId);
  const entryById = new Map(currentEntries.map((entry) => [entry.clientId, entry]));
  const orderedEntries = orderedClientIds
    .map((clientId) => entryById.get(clientId))
    .filter(Boolean);
  const remainingEntries = currentEntries.filter((entry) => !orderedClientIds.includes(entry.clientId));
  const nextEntries = [...orderedEntries, ...remainingEntries];

  for (const [index, entry] of nextEntries.entries()) {
    await replaceEntryRecord(ctx, entry, {
      sortOrder: (index + 1) * ENTRY_SORT_STEP,
    });
  }
}

export async function updateWorkspaceListsMetadata(
  ctx: any,
  updates: Partial<{ recentListIds: string[]; recentSearches: string[]; lastImportedAt: number }>
) {
  const workspace = await ensureWorkspaceRecord(ctx);
  await replaceWorkspaceRecord(ctx, workspace, {
    recentListIds: updates.recentListIds ?? workspace.recentListIds,
    recentSearches: updates.recentSearches ?? workspace.recentSearches,
    lastImportedAt: updates.lastImportedAt ?? workspace.lastImportedAt,
    updatedAt: Date.now(),
  });
}

export function mergeListPreferences(
  currentPreferences: ListPreferences,
  config: ListConfig,
  updates: Partial<ListPreferences>
) {
  return sanitizeListPreferencesForConfig(
    {
      ...currentPreferences,
      ...updates,
    },
    config
  );
}

export function applyItemUserDataProgressToEntry(
  entry: ListEntry,
  normalized: ItemUserData,
  parsedItemKey: { source: string; externalId: string }
) {
  if (
    entry.sourceRef.source !== parsedItemKey.source ||
    entry.sourceRef.externalId !== parsedItemKey.externalId
  ) {
    return null;
  }

  const nextProgress =
    normalized.progress !== undefined
      ? normalizeProgress({
          ...(entry.progress ?? {}),
          ...normalized.progress,
          total: normalized.progress.total ?? entry.progress?.total,
          unit: normalized.progress.unit ?? entry.progress?.unit ?? "item",
          label: normalized.progress.label ?? entry.progress?.label,
          updatedAt: normalized.progress.updatedAt ?? Date.now(),
        })
      : entry.progress
        ? normalizeProgress({
            ...entry.progress,
            current: undefined,
            updatedAt: Date.now(),
          })
        : undefined;

  const progressChanged =
    JSON.stringify(nextProgress ?? null) !== JSON.stringify(entry.progress ?? null);
  if (!progressChanged) {
    return null;
  }

  return {
    ...entry,
    progress: nextProgress,
    updatedAt: Date.now(),
  };
}

export function buildListRecordFromTemplate(
  template: ListTemplate,
  overrides?: Partial<
    Pick<TrackerList, "title" | "description" | "imageUrl" | "pinned" | "tags" | "parentListId">
  >
) {
  const timestamp = Date.now();
  const clientId = createListId();
  const listConfig = createListConfig(template.config);
  const entries = template.starterEntries.map((entry) =>
    createEntryFromDraft(
      {
        ...entry,
        title: entry.title,
        type: entry.type,
        checked: entry.checked,
        status: entry.status,
        tags: entry.tags ?? [],
        sourceRef:
          entry.sourceRef ??
          ({
            source:
              entry.type === "game" || entry.type === "list" ? "custom" : entry.type,
            detailPath: entry.detailPath,
            canonicalUrl: entry.productUrl,
          } satisfies EntrySourceRef),
      },
      listConfig
    )
  );

  return {
    list: compact({
      id: clientId,
      title: overrides?.title?.trim() || template.title,
      imageUrl: overrides?.imageUrl,
      description: overrides?.description?.trim() || template.description,
      tags: normalizeTags(overrides?.tags),
      preset: template.preset,
      config: listConfig,
      entries,
      preferences: sanitizeListPreferencesForConfig(DEFAULT_LIST_PREFERENCES, listConfig),
      pinned: overrides?.pinned ?? false,
      createdAt: timestamp,
      updatedAt: timestamp,
      templateId: template.id,
      parentListId: overrides?.parentListId,
    }) as TrackerList,
    clientId,
  };
}

export function createBlankListRecord(args: {
  title: string;
  preset?: TrackerList["preset"];
  config?: Partial<ListConfig>;
  description?: string;
  imageUrl?: string;
  pinned?: boolean;
  templateId?: string;
  tags?: string[];
  parentListId?: string;
}) {
  const timestamp = Date.now();
  const listConfig = createListConfig(
    args.config ??
      (args.preset === "tracking"
        ? {
            addons: ["status", "progress", "rating", "tags", "notes", "reminders", "cover"],
            automationBlocks: [] as ListAutomationBlock[],
            fieldDefinitions: [] as ListFieldDefinition[],
            defaultEntryType: "custom",
          }
        : undefined)
  );
  const clientId = createListId();

  return compact({
    id: clientId,
    title: args.title.trim(),
    imageUrl: args.imageUrl,
    description: args.description?.trim() || undefined,
    tags: normalizeTags(args.tags),
    preset: args.preset ?? derivePresetFromConfig(listConfig),
    config: listConfig,
    entries: [],
    preferences: sanitizeListPreferencesForConfig(DEFAULT_LIST_PREFERENCES, listConfig),
    pinned: args.pinned ?? false,
    createdAt: timestamp,
    updatedAt: timestamp,
    templateId: args.templateId,
    parentListId: args.parentListId,
  }) as TrackerList;
}

export function applyCheckedAutomation(config: ListConfig, checked: boolean) {
  return applyAutomationBlocks(config, {
    addonId: "toggle",
    field: "checked",
    value: checked,
  });
}
