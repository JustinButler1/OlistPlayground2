import { useAuth } from '@clerk/expo';
import { useConvex } from 'convex/react';
import { useCallback } from 'react';
import { api } from '@/convex/_generated/api';
import { useSessionScope } from '@/contexts/session-context';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

import type { Id } from '@/convex/_generated/dataModel';

export interface UploadedStorageFile {
  storageId: Id<'_storage'>;
  url: string;
  mimeType: string;
  fileName: string;
}

function buildUploadFileName(uri: string): string {
  const fileName = uri.split('/').pop()?.trim();
  if (fileName && /\.[A-Za-z0-9]+$/.test(fileName)) {
    return fileName.replace(/\.[A-Za-z0-9]+$/, '.jpg');
  }

  return `upload-${Date.now()}.jpg`;
}

export async function uploadImageToConvex(args: {
  uri: string;
  getToken: () => Promise<string | null>;
  signal: AbortSignal;
  resolveUrl: (storageId: Id<'_storage'>) => Promise<string | null>;
  maxWidth?: number;
}): Promise<UploadedStorageFile> {
  if (!process.env.EXPO_PUBLIC_CONVEX_SITE_URL) {
    throw new Error('Media upload is not configured.');
  }
  const manipulated = await manipulateAsync(
    args.uri,
    [{ resize: { width: args.maxWidth ?? 1600 } }],
    {
      compress: 0.82,
      format: SaveFormat.JPEG,
    },
  );

  const token = await args.getToken();
  if (!token || args.signal.aborted) throw new Error('Session ended');
  const uploadUrl = `${process.env.EXPO_PUBLIC_CONVEX_SITE_URL}/media/upload`;
  const fileResponse = await fetch(manipulated.uri, { signal: args.signal });
  const body = await fileResponse.blob();
  const uploadResponse = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'image/jpeg',
      Authorization: `Bearer ${token}`,
    },
    body,
    signal: args.signal,
  });

  if (!uploadResponse.ok) {
    throw new Error('upload_failed');
  }

  const payload = (await uploadResponse.json()) as {
    storageId: Id<'_storage'>;
  };
  if (args.signal.aborted) throw new Error('Session ended');
  const resolvedUrl = await args.resolveUrl(payload.storageId);
  if (args.signal.aborted) throw new Error('Session ended');

  return {
    storageId: payload.storageId,
    url: resolvedUrl ?? manipulated.uri,
    mimeType: 'image/jpeg',
    fileName: buildUploadFileName(manipulated.uri),
  };
}

export function useImageUpload() {
  const { getToken } = useAuth();
  const convex = useConvex();
  const scope = useSessionScope();
  return useCallback(
    (uri: string) =>
      scope.run(() =>
        uploadImageToConvex({
          uri,
          getToken: () => getToken({ template: 'convex' }),
          signal: scope.signal,
          resolveUrl: (storageId) =>
            convex.query(api.media.getResolvedUrl, { storageId }),
        }),
      ),
    [convex, getToken, scope],
  );
}
