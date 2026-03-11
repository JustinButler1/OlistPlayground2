import { Image } from "expo-image";
import React, { useState, forwardRef } from "react";
import { ImageStyle, StyleProp } from "react-native";

export const PLACEHOLDER_THUMBNAIL = require("../assets/images/placeholder-thumbnail.png");

interface ThumbnailImageProps {
  imageUrl?: string | null;
  style?: StyleProp<ImageStyle>;
  contentFit?: "contain" | "cover" | "fill" | "none";
}

/**
 * Renders a thumbnail with automatic fallback to placeholder when:
 * - imageUrl is null, undefined, or empty/whitespace
 * - The remote image fails to load (onError)
 */
export const ThumbnailImage = forwardRef<Image, ThumbnailImageProps>(
  ({ imageUrl, style, contentFit = "cover" }, ref) => {
    const [loadFailed, setLoadFailed] = useState(false);
    const hasValidUrl =
      typeof imageUrl === "string" && imageUrl.trim().length > 0 && !loadFailed;
    const source = hasValidUrl
      ? { uri: imageUrl!.trim() }
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
