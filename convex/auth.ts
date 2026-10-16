import {
  mutation as baseMutation,
  query as baseQuery,
} from './_generated/server';
import { BUILT_IN_LIST_TEMPLATES } from '../data/mock-lists';

// All public data functions use these builders. The original indexes remain for
// legacy migration; application queries always use their owner-prefixed versions.
export async function requireIdentity(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error('Authentication required');
  return identity.tokenIdentifier as string;
}

export function scopedDatabase(db: any, ownerId: string) {
  const changed = new Set<string>();
  const owned = async (id: any) => {
    const doc = await db.get(id);
    if (!doc || doc.ownerId !== ownerId)
      throw new Error('Resource unavailable');
    return doc;
  };
  const query = (table: string) => {
    const initial = db.query(table);
    const scoped = initial.withIndex('by_owner', (q: any) =>
      q.eq('ownerId', ownerId),
    );
    return new Proxy(scoped, {
      get(target, key) {
        if (key === 'withIndex')
          return (index: string, range?: any) =>
            initial.withIndex(`owned_${index}`, (q: any) => {
              const ownerRange = q.eq('ownerId', ownerId);
              return range ? range(ownerRange) : ownerRange;
            });
        if (key === 'withSearchIndex' || key === 'fullTableScan') {
          return () => {
            throw new Error('Unscoped query disabled');
          };
        }
        const value = Reflect.get(target, key);
        return typeof value === 'function' ? value.bind(target) : value;
      },
    });
  };
  const checkOwner = (value: any) => {
    if (value.ownerId !== undefined && value.ownerId !== ownerId) {
      throw new Error('Invalid ownership');
    }
  };
  const scoped = {
    query,
    get: owned,
    normalizeId: db.normalizeId.bind(db),
    insert: async (table: string, value: any) => {
      checkOwner(value);
      const id = await db.insert(table, { ...value, ownerId });
      changed.add(id);
      return id;
    },
    patch: async (id: any, value: any) => {
      await owned(id);
      checkOwner(value);
      await db.patch(id, { ...value, ownerId });
      changed.add(id);
    },
    replace: async (id: any, value: any) => {
      await owned(id);
      checkOwner(value);
      await db.replace(id, { ...value, ownerId });
      changed.add(id);
    },
    delete: async (id: any) => {
      await owned(id);
      await db.delete(id);
      changed.delete(id);
    },
  };
  const storageAsset = async (storageId: any) => {
    const asset = await query('mediaAssets')
      .withIndex('by_storageId', (q: any) => q.eq('storageId', storageId))
      .unique();
    if (!asset) throw new Error('Resource unavailable');
    return asset;
  };
  const validateReferences = async () => {
    const clientRef = async (table: string, clientId: string) => {
      const doc = await query(table)
        .withIndex('by_clientId', (q: any) => q.eq('clientId', clientId))
        .unique();
      if (!doc) throw new Error('Resource unavailable');
    };
    const validate = async (value: any): Promise<void> => {
      if (!value || typeof value !== 'object') return;
      for (const [key, ref] of Object.entries(value)) {
        if (!ref) continue;
        if (['parentListId', 'linkedListId', 'listClientId'].includes(key))
          await clientRef('lists', ref as string);
        if (key === 'linkedEntryId')
          await clientRef('listEntries', ref as string);
        if (key === 'imageAssetId' || key === 'coverAssetId') await owned(ref);
        if (key === 'storageId' || key === 'avatarStorageId')
          await storageAsset(ref);
        if (key === 'detailPath' && typeof ref === 'string') {
          if (ref.startsWith('list/')) await clientRef('lists', ref.slice(5));
          if (ref.startsWith('list-entry/'))
            await clientRef('listEntries', ref.slice(11));
        }
        if (typeof ref === 'object') await validate(ref);
      }
    };
    // Validate after the handler so bulk inserts can reference later inserts.
    // A failure aborts the entire Convex transaction, including storage deletes.
    for (const id of changed) await validate(await owned(id));
  };
  const validateArgs = async (value: any): Promise<void> => {
    if (!value || typeof value !== 'object') return;
    const clientRef = async (table: string, id: any) => {
      if (
        !(await query(table)
          .withIndex('by_clientId', (q: any) => q.eq('clientId', id))
          .unique())
      ) {
        throw new Error('Resource unavailable');
      }
    };
    for (const [key, ref] of Object.entries(value)) {
      if (key === 'ownerId') throw new Error('Ownership is server-derived');
      if (!ref) continue;
      if (
        [
          'listId',
          'sourceListId',
          'targetListId',
          'sublistId',
          'parentListId',
          'linkedListId',
        ].includes(key)
      )
        await clientRef('lists', ref);
      if (['entryId', 'linkedEntryId'].includes(key))
        await clientRef('listEntries', ref);
      if (['entryIds', 'orderedEntryIds'].includes(key))
        for (const id of ref as string[]) await clientRef('listEntries', id);
      if (key === 'orderedListIds')
        for (const id of ref as string[]) await clientRef('lists', id);
      if (
        key === 'templateId' &&
        !BUILT_IN_LIST_TEMPLATES.some((t) => t.id === ref)
      )
        await clientRef('savedTemplates', ref);
      if (key === 'targetId')
        await clientRef(value.target === 'list' ? 'lists' : 'listEntries', ref);
      if (['assetId', 'imageAssetId', 'coverAssetId'].includes(key))
        await owned(ref);
      if (key === 'storageId' || key === 'avatarStorageId')
        await storageAsset(ref);
      if (typeof ref === 'object') await validateArgs(ref);
    }
  };
  return { db: scoped, storageAsset, validateReferences, validateArgs };
}

function authenticatedBuilder(builder: any) {
  return (definition: any) =>
    builder({
      ...definition,
      handler: async (ctx: any, args: any) => {
        const ownerId = await requireIdentity(ctx);
        const scope = scopedDatabase(ctx.db, ownerId);
        await scope.validateArgs(args);
        const storage = {
          getUrl: async (id: any) => {
            await scope.storageAsset(id);
            return ctx.storage.getUrl(id);
          },
          delete: async (id: any) => {
            await scope.storageAsset(id);
            return ctx.storage.delete(id);
          },
          generateUploadUrl: async () => {
            throw new Error('Use authenticated media upload');
          },
        };
        const result = await definition.handler(
          { ...ctx, db: scope.db, storage },
          args,
        );
        if (builder === baseMutation) await scope.validateReferences();
        return result;
      },
    });
}

export const query: typeof baseQuery = authenticatedBuilder(baseQuery);
export const mutation: typeof baseMutation = authenticatedBuilder(baseMutation);
