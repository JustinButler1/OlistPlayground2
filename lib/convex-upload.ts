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
  generateUploadUrl: () => Promise<string>;
  resolveUrl: (storageId: Id<'_storage'>) => Promise<string | null>;
  maxWidth?: number;
}): Promise<UploadedStorageFile> {
  const manipulated = await manipulateAsync(
    args.uri,
    [{ resize: { width: args.maxWidth ?? 1600 } }],
    {
      compress: 0.82,
      format: SaveFormat.JPEG,
    }
  );

  const uploadUrl = await args.generateUploadUrl();
  const fileResponse = await fetch(manipulated.uri);
  const body = await fileResponse.blob();
  const uploadResponse = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'image/jpeg',
    },
    body,
  });

  if (!uploadResponse.ok) {
    throw new Error('upload_failed');
  }

  const payload = (await uploadResponse.json()) as { storageId: Id<'_storage'> };
  const resolvedUrl = await args.resolveUrl(payload.storageId);

  return {
    storageId: payload.storageId,
    url: resolvedUrl ?? manipulated.uri,
    mimeType: 'image/jpeg',
    fileName: buildUploadFileName(manipulated.uri),
  };
}
