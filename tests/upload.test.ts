import { afterEach, beforeEach, expect, it, vi } from 'vitest';

vi.mock('@clerk/expo', () => ({ useAuth: vi.fn() }));
vi.mock('convex/react', () => ({ useConvex: vi.fn(), useMutation: vi.fn() }));
vi.mock('expo-image-manipulator', () => ({
  manipulateAsync: vi.fn(async () => ({ uri: 'file://prepared.jpg' })),
  SaveFormat: { JPEG: 'jpeg' },
}));
import { uploadImageToConvex } from '../lib/convex-upload';
import { SessionScope } from '../lib/session-scope';

beforeEach(() => {
  process.env.EXPO_PUBLIC_CONVEX_SITE_URL = 'https://fixture.convex.site';
});
afterEach(() => vi.unstubAllGlobals());

it('uploads with the verified session token and abort signal, then resolves the owned media URL', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce({ blob: async () => new Blob(['image']) })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ storageId: 'owned-storage' }),
    });
  vi.stubGlobal('fetch', fetch);
  const scope = new SessionScope();
  const resolveUrl = vi.fn(async () => 'https://fixture/owned-image');
  const result = await uploadImageToConvex({
    uri: 'file://image.jpg',
    getToken: async () => 'fixture-token',
    signal: scope.signal,
    resolveUrl,
  });
  expect(fetch).toHaveBeenLastCalledWith(
    'https://fixture.convex.site/media/upload',
    expect.objectContaining({
      headers: {
        'Content-Type': 'image/jpeg',
        Authorization: 'Bearer fixture-token',
      },
      signal: scope.signal,
    }),
  );
  expect(result.url).toBe('https://fixture/owned-image');
});

it('does not upload after sign-out while the token request is pending', async () => {
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  const scope = new SessionScope();
  let release!: (token: string) => void;
  const getToken = vi.fn(
    () =>
      new Promise<string>((r) => {
        release = r;
      }),
  );
  const upload = uploadImageToConvex({
    uri: 'file://image.jpg',
    getToken,
    signal: scope.signal,
    resolveUrl: vi.fn(),
  });
  await vi.waitFor(() => expect(getToken).toHaveBeenCalled());
  scope.dispose();
  release('old-A-token');
  await expect(upload).rejects.toThrow('Session ended');
  expect(fetch).not.toHaveBeenCalled();
});

it('discards an upload response arriving after sign-out without resolving or attaching it', async () => {
  let release!: (value: any) => void;
  const fetch = vi
    .fn()
    .mockResolvedValueOnce({ blob: async () => new Blob(['image']) })
    .mockImplementationOnce(
      () =>
        new Promise((r) => {
          release = r;
        }),
    );
  vi.stubGlobal('fetch', fetch);
  const scope = new SessionScope();
  const resolveUrl = vi.fn();
  const upload = uploadImageToConvex({
    uri: 'file://image.jpg',
    getToken: async () => 'old-A-token',
    signal: scope.signal,
    resolveUrl,
  });
  await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  scope.dispose();
  release({ ok: true, json: async () => ({ storageId: 'late-A-image' }) });
  await expect(upload).rejects.toThrow('Session ended');
  expect(resolveUrl).not.toHaveBeenCalled();
});
