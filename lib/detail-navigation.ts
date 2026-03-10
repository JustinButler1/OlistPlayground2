import type { Href } from 'expo-router';

export type DetailSeedImageVariant = 'avatar' | 'logo' | 'poster';

export interface DetailSeed {
  imageUrl?: null | string;
  imageVariant?: DetailSeedImageVariant;
  subtitle?: null | string;
  title?: null | string;
}

interface DetailSeedParams {
  seedImageUrl?: string | string[];
  seedImageVariant?: string | string[];
  seedSubtitle?: string | string[];
  seedTitle?: string | string[];
}

function getSeedParam(value: null | string | undefined) {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function buildSeededHref(pathname: string, seed?: DetailSeed): Href {
  const params = {
    seedTitle: getSeedParam(seed?.title),
    seedSubtitle: getSeedParam(seed?.subtitle),
    seedImageUrl: getSeedParam(seed?.imageUrl),
    seedImageVariant: seed?.imageVariant,
  };

  if (!Object.values(params).some(Boolean)) {
    return pathname as Href;
  }

  return {
    pathname: pathname as never,
    params,
  } as Href;
}

export function buildSeededDetailHref(detailPath: string, seed?: DetailSeed): Href {
  return buildSeededHref(`/${detailPath}`, seed);
}

export function readDetailSeed(params: DetailSeedParams) {
  const imageVariant = getSingleParam(params.seedImageVariant);

  return {
    title: getSingleParam(params.seedTitle),
    subtitle: getSingleParam(params.seedSubtitle),
    imageUrl: getSingleParam(params.seedImageUrl),
    imageVariant:
      imageVariant === 'avatar' || imageVariant === 'logo' || imageVariant === 'poster'
        ? imageVariant
        : undefined,
  };
}

export function isAbortError(error: unknown) {
  return error instanceof Error && error.name === 'AbortError';
}
