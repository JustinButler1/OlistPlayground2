/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';
import { makeFunctionReference } from 'convex/server';
import schema from '../convex/schema';
import { api, internal } from '../convex/_generated/api';
import { createEmptyItemUserData } from '../data/mock-lists';

const modules = import.meta.glob('../convex/**/*.ts');
const tables = [
  'workspace',
  'onboardingProfile',
  'mediaAssets',
  'lists',
  'listEntries',
  'savedTemplates',
  'itemUserData',
] as const;
const identity = (subject: string) => ({
  subject,
  issuer: 'https://test.clerk.accounts.dev',
  tokenIdentifier: `https://test.clerk.accounts.dev|${subject}`,
});

async function setup() {
  const t = convexTest(schema, modules);
  const a = t.withIdentity(identity('A'));
  const b = t.withIdentity(identity('B'));
  const create = async (user: typeof a, label: string) => {
    await user.mutation(api.bootstrap.ensureWorkspace, {});
    const listId = (await user.mutation(api.lists.createList, {
      title: label,
    }))!;
    const entryId = (await user.mutation(api.lists.addEntry, {
      listId,
      draft: { title: label, type: 'custom' },
    }))!;
    const templateId = (await user.mutation(api.templates.saveListAsTemplate, {
      listId,
      title: label,
      description: '',
    }))!;
    await user.mutation(api.itemUserData.setItemUserData, {
      itemKey: 'custom:same',
      value: { ...createEmptyItemUserData(), notes: label },
      entryId,
    });
    const storageId = await t.run((ctx) =>
      ctx.storage.store(new Blob([label], { type: 'image/jpeg' })),
    );
    await t.mutation(internal.uploads.register, {
      ownerId: identity(label).tokenIdentifier,
      storageId,
    });
    const assetId = await t.run(
      async (ctx) =>
        (await ctx.db
          .query('mediaAssets')
          .withIndex('by_storageId', (q) => q.eq('storageId', storageId))
          .unique())!._id,
    );
    return { listId, entryId, templateId, storageId, assetId };
  };
  const A = await create(a, 'A');
  const B = await create(b, 'B');
  await t.run(async (ctx) => {
    // A preserved unowned fixture in every table, including media storage.
    for (const table of tables) {
      const doc = (await ctx.db.query(table).collect())[0]!;
      const { _id, _creationTime, ownerId, ...legacy } = doc;
      if ('clientId' in legacy) legacy.clientId = `legacy-${table}`;
      if ('listClientId' in legacy) legacy.listClientId = 'legacy-lists';
      if ('itemKey' in legacy) legacy.itemKey = 'legacy:item';
      if (table === 'mediaAssets' && 'storageId' in legacy) {
        legacy.storageId = await ctx.storage.store(
          new Blob(['legacy'], { type: 'image/jpeg' }),
        );
      }
      await ctx.db.insert(table, legacy as never);
    }
  });
  const dump = () =>
    t.run(async (ctx) => ({
      ...Object.fromEntries(
        await Promise.all(
          tables.map(async (table) => [
            table,
            await ctx.db.query(table).collect(),
          ]),
        ),
      ),
      _storage: await ctx.db.system.query('_storage').collect(),
    }));
  return { t, a, b, A, B, dump };
}

function operations(x: Awaited<ReturnType<typeof setup>>['A']) {
  const { listId, entryId, templateId, storageId, assetId } = x;
  return {
    'bootstrap:ensureWorkspace': {},
    'bootstrap:importLegacyLocalState': { listsState: { lists: [] } },
    'workspace:getSnapshot': {},
    'lists:getSnapshot': {},
    'lists:createList': { title: 'new' },
    'lists:createListFromTemplate': { templateId },
    'lists:updateList': { listId, updates: { title: 'changed' } },
    'lists:archiveList': { listId },
    'lists:restoreArchivedList': { listId },
    'lists:deleteList': { listId },
    'lists:restoreList': { listId },
    'lists:moveList': { listId, targetListId: listId },
    'lists:reorderLists': { orderedListIds: [listId] },
    'lists:setListPreferences': { listId, updates: {} },
    'lists:markListOpened': { listId },
    'lists:recordRecentSearch': { query: 'private' },
    'lists:convertTagToSublist': { listId, tag: 'test' },
    'lists:convertSublistToTag': { sublistId: listId },
    'lists:resetWorkspace': {},
    'lists:loadMockData': {},
    'lists:addEntry': { listId, draft: { title: 'new', type: 'custom' } },
    'lists:updateEntry': { entryId, updates: { title: 'changed' } },
    'lists:deleteEntry': { entryId },
    'lists:moveEntries': {
      sourceListId: listId,
      targetListId: listId,
      entryIds: [entryId],
    },
    'lists:reorderEntries': { listId, orderedEntryIds: [entryId] },
    'lists:setEntryChecked': { entryId, checked: true },
    'lists:setEntryStatus': { entryId, status: 'completed' },
    'lists:setEntryProgress': { entryId, progress: undefined },
    'lists:duplicateEntries': { listId, entryIds: [entryId] },
    'lists:archiveEntries': { entryIds: [entryId] },
    'templates:saveListAsTemplate': {
      listId,
      title: 'stolen',
      description: '',
    },
    'templates:deleteTemplate': { templateId },
    'itemUserData:setItemUserData': {
      itemKey: 'custom:same',
      value: { ...createEmptyItemUserData(), notes: 'changed' },
      entryId,
    },
    'onboarding:updateProfile': { displayName: 'changed' },
    'onboarding:complete': {},
    'onboarding:reset': {},
    'media:generateUploadUrl': {},
    'media:getResolvedUrl': { storageId },
    'media:attachAvatar': { storageId },
    'media:attachListImage': { listId, storageId },
    'media:attachEntryCover': { entryId, storageId },
    'media:replaceAsset': { target: 'list', targetId: listId, storageId },
    'media:deleteAssetIfUnreferenced': { assetId },
  };
}

function invoke(
  t: Pick<ReturnType<typeof convexTest>, 'query' | 'mutation'>,
  name: string,
  args: any,
) {
  return name === 'workspace:getSnapshot' || name === 'media:getResolvedUrl'
    ? t.query(makeFunctionReference<'query'>(name), args)
    : t.mutation(makeFunctionReference<'mutation'>(name), args);
}

describe('public authorization boundary', () => {
  it('covers every exported public operation and denies anonymous calls without changes', async () => {
    const { t, A, dump } = await setup();
    const before = await dump();
    const cases = operations(A);
    const discovered: string[] = [];
    for (const [path, load] of Object.entries(modules)) {
      if (path.includes('_generated')) continue;
      const module = (await load()) as Record<string, any>;
      for (const [name, fn] of Object.entries(module)) {
        if (fn?.isQuery || fn?.isMutation) {
          if (fn.isPublic)
            discovered.push(
              `${path.split('/').pop()!.replace('.ts', '')}:${name}`,
            );
        }
      }
    }
    expect(Object.keys(cases).sort()).toEqual(discovered.sort());
    for (const [name, args] of Object.entries(cases)) {
      await expect(invoke(t, name, args), name).rejects.toThrow(
        'Authentication required',
      );
    }
    expect(await dump()).toEqual(before);
    expect(await t.run((ctx) => ctx.storage.getUrl(A.storageId))).toBeTruthy();
  });

  it('rejects all cross-user data and media operations without changing either user or legacy records', async () => {
    const { b, A, dump } = await setup();
    const before = await dump();
    for (const [name, args] of Object.entries(operations(A))) {
      // Operations without resource arguments intentionally act on B's workspace.
      if (!Object.keys(args).some((key) => /Id|Ids/.test(key))) continue;
      await expect(invoke(b, name, args), name).rejects.toThrow(
        'Resource unavailable',
      );
      expect(await dump(), name).toEqual(before);
    }
  });

  it('rejects direct references to unowned legacy data and storage', async () => {
    const { t, a, dump } = await setup();
    const legacyAsset = await t.run(
      async (ctx) =>
        (await ctx.db.query('mediaAssets').collect()).find((d) => !d.ownerId)!,
    );
    const cases = operations({
      listId: 'legacy-lists',
      entryId: 'legacy-listEntries',
      templateId: 'legacy-savedTemplates',
      storageId: legacyAsset.storageId,
      assetId: legacyAsset._id,
    });
    const before = await dump();
    for (const [name, args] of Object.entries(cases)) {
      if (!Object.keys(args).some((key) => /Id|Ids/.test(key))) continue;
      await expect(invoke(a, name, args), name).rejects.toThrow(
        'Resource unavailable',
      );
      expect(await dump(), name).toEqual(before);
    }
  });

  it('derives ownership for all tables and hides legacy and other users from both snapshots', async () => {
    const { a, b, dump } = await setup();
    const rows = await dump();
    for (const table of tables) {
      expect(
        rows[table].some(
          (d: any) => d.ownerId === identity('A').tokenIdentifier,
        ),
        table,
      ).toBe(true);
      expect(
        rows[table].some(
          (d: any) => d.ownerId === identity('B').tokenIdentifier,
        ),
        table,
      ).toBe(true);
    }
    for (const user of [a, b]) {
      const snapshot = await user.query(api.workspace.getSnapshot, {});
      expect(snapshot.listsState.lists).toHaveLength(1);
      expect(snapshot.listsState.savedTemplates).toHaveLength(1);
      const label = user === a ? 'A' : 'B';
      expect(snapshot.listsState.lists[0].title).toBe(label);
      expect(snapshot.listsState.itemUserDataByKey['custom:same'].notes).toBe(
        label,
      );
      expect(await user.mutation(api.lists.getSnapshot, {})).toEqual(snapshot);
    }
  });

  it('keeps normal owner operations working through the authorization layer', async () => {
    const initial = await setup();
    const names = Object.keys(operations(initial.A)).filter(
      (name) =>
        ![
          'bootstrap:importLegacyLocalState',
          'lists:loadMockData',
          'media:generateUploadUrl',
        ].includes(name),
    );
    for (const name of names) {
      const { a, A } = await setup();
      await expect(
        invoke(
          a,
          name,
          operations(A)[name as keyof ReturnType<typeof operations>],
        ),
        name,
      ).resolves.not.toThrow();
    }
  });

  it('supports identical client identifiers in distinct owner indexes', async () => {
    const { t, a, b, A, B } = await setup();
    await t.run(async (ctx) => {
      for (const table of ['lists', 'listEntries', 'savedTemplates'] as const) {
        const docs = await ctx.db.query(table).collect();
        for (const doc of docs.filter((d) => d.ownerId))
          await ctx.db.patch(doc._id, { clientId: `same-${table}` });
      }
      const entries = await ctx.db.query('listEntries').collect();
      for (const entry of entries.filter((d) => d.ownerId))
        await ctx.db.patch(entry._id, { listClientId: 'same-lists' });
    });
    for (const [user, label] of [
      [a, 'A'],
      [b, 'B'],
    ] as const) {
      await user.mutation(api.lists.updateList, {
        listId: 'same-lists',
        updates: { title: `${label}-updated` },
      });
      await user.mutation(api.lists.updateEntry, {
        entryId: 'same-listEntries',
        updates: { title: `${label}-entry` },
      });
      const snapshot = await user.query(api.workspace.getSnapshot, {});
      expect(snapshot.listsState.lists[0].title).toBe(`${label}-updated`);
      expect(snapshot.listsState.lists[0].entries[0].title).toBe(
        `${label}-entry`,
      );
    }
    expect(A.listId).not.toBe(B.listId);
  });

  it('rejects forged owners, links, nested references, and stolen uploads atomically', async () => {
    const { b, A, B, dump } = await setup();
    const before = await dump();
    const attempts = [
      () =>
        b.mutation(api.lists.createList, {
          title: 'forged',
          options: { ownerId: identity('A').tokenIdentifier },
        }),
      () =>
        b.mutation(api.lists.updateList, {
          listId: B.listId,
          updates: { parentListId: A.listId },
        }),
      () =>
        b.mutation(api.lists.addEntry, {
          listId: B.listId,
          draft: { title: 'link', type: 'list', linkedListId: A.listId },
        }),
      () =>
        b.mutation(api.lists.updateEntry, {
          entryId: B.entryId,
          updates: {
            sourceRef: { source: 'custom', detailPath: `list/${A.listId}` },
          },
        }),
      () =>
        b.mutation(api.lists.createList, {
          title: 'stolen',
          options: { uploadedImage: { storageId: A.storageId } },
        }),
      () => b.mutation(api.media.attachAvatar, { storageId: A.storageId }),
      () =>
        b.mutation(api.media.replaceAsset, {
          target: 'avatar',
          storageId: A.storageId,
        }),
      () =>
        b.mutation(api.media.replaceAsset, {
          target: 'entry',
          targetId: B.entryId,
          storageId: A.storageId,
        }),
      () =>
        b.mutation(api.lists.moveEntries, {
          sourceListId: B.listId,
          targetListId: A.listId,
          entryIds: [B.entryId],
        }),
    ];
    for (const attempt of attempts) {
      await expect(attempt()).rejects.toThrow();
      expect(await dump()).toEqual(before);
    }
  });

  it('limits bootstrap/reset to the owner and disables legacy import and mock replacement', async () => {
    const { a, dump } = await setup();
    const before = await dump();
    await a.mutation(api.bootstrap.ensureWorkspace, {});
    expect(await dump()).toEqual(before);
    await expect(
      a.mutation(api.bootstrap.importLegacyLocalState, {
        listsState: { lists: [] },
      }),
    ).rejects.toThrow('disabled');
    await expect(a.mutation(api.lists.loadMockData, {})).rejects.toThrow(
      'disabled',
    );
    await a.mutation(api.lists.resetWorkspace, {});
    await a.mutation(api.onboarding.reset, {});
    const after = await dump();
    for (const table of tables) {
      expect(
        after[table].filter(
          (d: any) => d.ownerId !== identity('A').tokenIdentifier,
        ),
      ).toEqual(
        before[table].filter(
          (d: any) => d.ownerId !== identity('A').tokenIdentifier,
        ),
      );
    }
  });

  it('allows owned media retrieval, attachment, replacement, and deletion only when unreferenced', async () => {
    const { t, a, A } = await setup();
    expect(
      await a.query(api.media.getResolvedUrl, { storageId: A.storageId }),
    ).toBeTruthy();
    await a.mutation(api.media.attachAvatar, { storageId: A.storageId });
    expect(
      await a.mutation(api.media.deleteAssetIfUnreferenced, {
        assetId: A.assetId,
      }),
    ).toEqual({ deleted: false });
    await a.mutation(api.onboarding.updateProfile, { clearAvatar: true });
    expect(await t.run((ctx) => ctx.storage.getUrl(A.storageId))).toBeNull();
    await expect(
      a.query(api.media.getResolvedUrl, { storageId: A.storageId }),
    ).rejects.toThrow('Resource unavailable');
  });

  it('authenticates uploads before storing anything and registers server-derived ownership', async () => {
    const { t, a, dump } = await setup();
    const before = await dump();
    expect(
      (
        await t.fetch('/media/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'image/jpeg' },
          body: 'image',
        })
      ).status,
    ).toBe(401);
    expect(await dump()).toEqual(before);
    const response = await a.fetch('/media/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'image/jpeg' },
      body: 'image',
    });
    expect(response.status).toBe(200);
    const { storageId } = await response.json();
    expect(await a.query(api.media.getResolvedUrl, { storageId })).toBeTruthy();
  });
});
