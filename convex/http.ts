import { httpRouter } from 'convex/server';
import { httpAction } from './_generated/server';
import { internal } from './_generated/api';
import { requireIdentity } from './auth';

const http = httpRouter();
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
http.route({
  path: '/media/upload',
  method: 'OPTIONS',
  handler: httpAction(async () => new Response(null, { status: 204, headers })),
});
http.route({
  path: '/media/upload',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    let ownerId: string;
    try {
      ownerId = await requireIdentity(ctx);
    } catch {
      return new Response('Authentication required', { status: 401, headers });
    }
    if (request.headers.get('Content-Type') !== 'image/jpeg') {
      return new Response('JPEG required', { status: 415, headers });
    }
    const blob = await request.blob();
    if (blob.size > 10 * 1024 * 1024)
      return new Response('Image too large', { status: 413, headers });
    const storageId = await ctx.storage.store(blob);
    try {
      await ctx.runMutation(internal.uploads.register, { ownerId, storageId });
    } catch (error) {
      await ctx.storage.delete(storageId);
      throw error;
    }
    return Response.json({ storageId }, { headers });
  }),
});
export default http;
