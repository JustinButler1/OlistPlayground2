import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import React, { forwardRef, useEffect, useMemo, useState } from "react";
import { ImageStyle, StyleProp } from "react-native";

import type { EntrySourceRef } from "@/data/mock-lists";
import { enqueueJikan } from "@/lib/jikan-queue";
import { apiQueryKeys } from "@/services/api-query-keys";

export const PLACEHOLDER_THUMBNAIL = require("../assets/images/placeholder-thumbnail.png");
const JIKAN_API = "https://api.jikan.moe/v4";

interface ThumbnailImageProps {
  imageUrl?: string | null;
  sourceRef?: Pick<EntrySourceRef, "source" | "externalId">;
  detailPath?: string | null;
  style?: StyleProp<ImageStyle>;
  contentFit?: "contain" | "cover" | "fill" | "none" | "scale-down";
}

function getCatalogLookupId(
  sourceRef?: Pick<EntrySourceRef, "source" | "externalId">,
  detailPath?: string | null
): number | null {
  const rawExternalId =
    sourceRef?.externalId ??
    (detailPath && sourceRef?.source && detailPath.startsWith(`${sourceRef.source}/`)
      ? detailPath.slice(sourceRef.source.length + 1)
      : undefined);
  const numericId = Number(rawExternalId);

  return Number.isInteger(numericId) && numericId > 0 ? numericId : null;
}

function getJikanThumbnailSource(
  sourceRef?: Pick<EntrySourceRef, "source" | "externalId">
): "anime" | "manga" | null {
  if (sourceRef?.source === "anime" || sourceRef?.source === "manga") {
    return sourceRef.source;
  }

  return null;
}

/**
 * Renders a thumbnail with automatic fallback to placeholder when:
 * - imageUrl is null, undefined, or empty/whitespace
 * - The remote image fails to load (onError)
 */
export const ThumbnailImage = forwardRef<Image, ThumbnailImageProps>(
  ({ imageUrl, sourceRef, detailPath, style, contentFit = "cover" }, ref) => {
    const [loadFailed, setLoadFailed] = useState(false);
    const trimmedImageUrl = typeof imageUrl === "string" ? imageUrl.trim() : "";
    const jikanThumbnailSource = getJikanThumbnailSource(sourceRef);
    const jikanImageId = getCatalogLookupId(sourceRef, detailPath);
    const shouldFetchJikanImage =
      trimmedImageUrl.length === 0 &&
      !loadFailed &&
      jikanThumbnailSource !== null &&
      jikanImageId !== null;
    const jikanImageQuery = useQuery({
      queryKey: jikanThumbnailSource && jikanImageId
          ? apiQueryKeys.jikan.image(jikanThumbnailSource, jikanImageId)
          : ["jikan", "image", "disabled", detailPath ?? "unknown"],
      queryFn: ({ signal }) =>
        enqueueJikan(async () => {
          const response = await fetch(`${JIKAN_API}/${jikanThumbnailSource}/${jikanImageId}`, {
            signal,
          });
          if (!response.ok) {
            throw new Error("thumbnail_fetch_failed");
          }

          const json = await response.json();
          return (
            json.data?.images?.jpg?.large_image_url ??
            json.data?.images?.jpg?.image_url ??
            json.data?.images?.webp?.large_image_url ??
            json.data?.images?.webp?.image_url ??
            null
          );
        }),
      enabled: shouldFetchJikanImage,
      staleTime: 1000 * 60 * 60,
      retry: 1,
    });
    const resolvedImageUrl = useMemo(() => {
      if (trimmedImageUrl.length > 0) {
        return trimmedImageUrl;
      }

      const fetchedUrl =
        typeof jikanImageQuery.data === "string" ? jikanImageQuery.data.trim() : "";
      return fetchedUrl.length > 0 ? fetchedUrl : null;
    }, [jikanImageQuery.data, trimmedImageUrl]);

    useEffect(() => {
      setLoadFailed(false);
    }, [resolvedImageUrl]);

    const hasValidUrl = typeof resolvedImageUrl === "string" && resolvedImageUrl.length > 0 && !loadFailed;
    const source = hasValidUrl
      ? { uri: resolvedImageUrl }
      : PLACEHOLDER_THUMBNAIL;

    return (
      <Image
        ref={ref}
        source={source}
        style={style}
        contentFit={contentFit}
        onError={() => setLoadFailed(true)}
      />
    );
  }
);
ThumbnailImage.displayName = "ThumbnailImage";
