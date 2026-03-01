/**
 * Product Link Import UI - Phase 1
 * TextInput, Import button, result card, debug accordion, error states.
 */

import { useCallback, useState } from "react";
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import { ThemedText } from "@/components/themed-text";
import { ThumbnailImage } from "@/components/thumbnail-image";
import { IconSymbol } from "@/components/ui/icon-symbol";
import {
  importProductFromUrl,
  type ProductPreview,
  type ImportError,
  type ErrorCode,
  type FieldSource,
} from "@/lib/product-link-import";

const ERROR_MESSAGES: Record<ErrorCode, string> = {
  invalid_url: "Invalid URL. Use http or https only.",
  fetch_failed: "Failed to fetch the page. Check your connection.",
  timeout: "Request timed out. The site may be slow.",
  blocked:
    "This site blocked in-app importing. Try opening the product in your browser and copying the share text, or try a different retailer.",
  not_html: "The URL did not return an HTML page.",
  too_large: "The page is too large to process.",
  parse_failed: "Failed to parse the page content.",
  no_product_data: "Could not find product data on this page.",
};

function getErrorMessage(err: ImportError): string {
  return err.message ?? ERROR_MESSAGES[err.code] ?? "An error occurred.";
}

function sourceBadgeLabel(source: FieldSource | undefined): string {
  switch (source) {
    case "og":
      return "OG";
    case "jsonld":
      return "JSON-LD";
    case "title":
      return "TITLE";
    case "meta":
      return "META";
    case "h1":
      return "H1";
    case "heuristic":
      return "HEURISTIC";
    case "canonical":
      return "CANONICAL";
    default:
      return "—";
  }
}

interface ProductLinkImportProps {
  onImportSuccess?: (preview: ProductPreview) => void;
  onReset?: () => void;
  compact?: boolean;
}

export function ProductLinkImport({
  onImportSuccess,
  onReset,
  compact = false,
}: ProductLinkImportProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    ok: true;
    preview: ProductPreview;
    finalUrl: string;
  } | null>(null);
  const [error, setError] = useState<ImportError | null>(null);
  const [debugOpen, setDebugOpen] = useState(false);

  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const { width } = useWindowDimensions();

  const handleImport = useCallback(async () => {
    const trimmed = url.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    setResult(null);

    const output = await importProductFromUrl(trimmed);

    setLoading(false);

    if (output.ok) {
      setResult(output);
      onImportSuccess?.(output.preview);
    } else {
      setError(output);
    }
  }, [url, onImportSuccess]);

  const reset = useCallback(() => {
    setUrl("");
    setResult(null);
    setError(null);
    setDebugOpen(false);
    onReset?.();
  }, [onReset]);

  const formatPrice = (preview: ProductPreview) => {
    if (preview.price == null) return null;
    const curr = preview.currency ?? "USD";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: curr,
    }).format(preview.price);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, compact && styles.contentCompact]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <TextInput
        style={[
          styles.urlInput,
          {
            color: colors.text,
            backgroundColor: colors.icon + "18",
            borderColor: colors.icon + "40",
          },
        ]}
        placeholder="Paste product page URL..."
        placeholderTextColor={colors.icon}
        value={url}
        onChangeText={(t) => {
          setUrl(t);
          setError(null);
        }}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        returnKeyType="go"
        onSubmitEditing={handleImport}
        editable={!loading}
      />

      <Pressable
        onPress={handleImport}
        disabled={!url.trim() || loading}
        style={({ pressed }) => [
          styles.importButton,
          {
            backgroundColor: colors.tint,
            opacity: pressed ? 0.8 : url.trim() && !loading ? 1 : 0.5,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Import product"
      >
        {loading ? (
          <ActivityIndicator size="small" color={colors.background} />
        ) : (
          <ThemedText style={[styles.importButtonText, { color: colors.background }]}>
            Import
          </ThemedText>
        )}
      </Pressable>

      {error && (
        <View style={[styles.errorCard, { backgroundColor: "#e53e3e18", borderColor: "#e53e3e40" }]}>
          <ThemedText style={styles.errorCode}>{error.code}</ThemedText>
          <ThemedText style={[styles.errorMessage, { color: colors.text }]}>
            {getErrorMessage(error)}
          </ThemedText>
          {(error.code === "blocked" || error.code === "fetch_failed") && (
            <ThemedText style={[styles.errorHint, { color: colors.icon }]}>
              Some retailers block in-app requests. You can still add the item manually with the Custom
              option.
            </ThemedText>
          )}
        </View>
      )}

      {result && (
        <>
          <View
            style={[
              styles.resultCard,
              {
                backgroundColor: colors.icon + "12",
                borderColor: colors.icon + "25",
              },
            ]}
          >
            <View style={styles.resultHeader}>
              <ThumbnailImage
                imageUrl={result.preview.imageUrl}
                style={styles.resultImage}
                contentFit="cover"
              />
              <View style={[styles.resultInfo, { flex: 1 }]}>
                <ThemedText style={[styles.resultTitle, { color: colors.text }]} numberOfLines={3}>
                  {result.preview.title}
                </ThemedText>
                {formatPrice(result.preview) && (
                  <ThemedText style={[styles.resultPrice, { color: colors.tint }]}>
                    {formatPrice(result.preview)}
                  </ThemedText>
                )}
                <ThemedText style={[styles.resultDomain, { color: colors.icon }]} numberOfLines={1}>
                  {result.preview.storeDomain}
                </ThemedText>
                <View style={styles.sourceBadges}>
                  {result.preview.fieldSources.title && (
                    <View style={[styles.badge, { backgroundColor: colors.tint + "30" }]}>
                      <ThemedText style={[styles.badgeText, { color: colors.tint }]}>
                        {sourceBadgeLabel(result.preview.fieldSources.title)} title
                      </ThemedText>
                    </View>
                  )}
                  {result.preview.fieldSources.image && (
                    <View style={[styles.badge, { backgroundColor: colors.tint + "30" }]}>
                      <ThemedText style={[styles.badgeText, { color: colors.tint }]}>
                        {sourceBadgeLabel(result.preview.fieldSources.image)} img
                      </ThemedText>
                    </View>
                  )}
                  {result.preview.fieldSources.price && (
                    <View style={[styles.badge, { backgroundColor: colors.tint + "30" }]}>
                      <ThemedText style={[styles.badgeText, { color: colors.tint }]}>
                        {sourceBadgeLabel(result.preview.fieldSources.price)} price
                      </ThemedText>
                    </View>
                  )}
                </View>
              </View>
            </View>

            <View style={[styles.resultMeta, { borderTopColor: colors.icon + "20" }]}>
              <ThemedText style={[styles.metaLabel, { color: colors.icon }]}>Final URL</ThemedText>
              <ThemedText style={[styles.metaValue, { color: colors.text }]} numberOfLines={2}>
                {result.finalUrl}
              </ThemedText>
              <ThemedText style={[styles.metaLabel, { color: colors.icon, marginTop: 6 }]}>
                Canonical
              </ThemedText>
              <ThemedText style={[styles.metaValue, { color: colors.text }]} numberOfLines={2}>
                {result.preview.canonicalUrl}
              </ThemedText>
              <View style={styles.confidenceRow}>
                <ThemedText style={[styles.metaLabel, { color: colors.icon }]}>
                  Confidence
                </ThemedText>
                <ThemedText style={[styles.confidenceValue, { color: colors.tint }]}>
                  {Math.round(result.preview.confidence * 100)}%
                </ThemedText>
              </View>
            </View>
          </View>

          {/* Debug accordion */}
          <Pressable
            onPress={() => setDebugOpen((o) => !o)}
            style={({ pressed }) => [
              styles.debugToggle,
              {
                backgroundColor: colors.icon + "15",
                borderColor: colors.icon + "30",
                opacity: pressed ? 0.8 : 1,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={debugOpen ? "Collapse debug" : "Expand debug"}
          >
            <ThemedText style={[styles.debugToggleText, { color: colors.text }]}>
              Debug: sources & raw values
            </ThemedText>
            <IconSymbol
              name={debugOpen ? "chevron.up" : "chevron.down"}
              size={20}
              color={colors.icon}
            />
          </Pressable>

          {debugOpen && result && (
            <View
              style={[
                styles.debugPanel,
                {
                  backgroundColor: colors.icon + "0c",
                  borderColor: colors.icon + "25",
                },
              ]}
            >
              <ThemedText style={[styles.debugSectionTitle, { color: colors.icon }]}>
                Chosen values
              </ThemedText>
              <ThemedText style={[styles.debugCode, { color: colors.text }]}>
                {JSON.stringify(result.preview.debug.chosenValues, null, 2)}
              </ThemedText>

              <ThemedText style={[styles.debugSectionTitle, { color: colors.icon }]}>
                Extraction notes
              </ThemedText>
              {result.preview.debug.extractionNotes.map((note, i) => (
                <ThemedText key={i} style={[styles.debugNote, { color: colors.text }]}>
                  • {note}
                </ThemedText>
              ))}

              <ThemedText style={[styles.debugSectionTitle, { color: colors.icon }]}>
                Raw OG tags
              </ThemedText>
              <ThemedText style={[styles.debugCode, { color: colors.text }]}>
                {Object.keys(result.preview.debug.rawExtraction.og).length > 0
                  ? JSON.stringify(result.preview.debug.rawExtraction.og, null, 2)
                  : "(none)"}
              </ThemedText>

              <ThemedText style={[styles.debugSectionTitle, { color: colors.icon }]}>
                Raw meta tags
              </ThemedText>
              <ThemedText style={[styles.debugCode, { color: colors.text }]}>
                {Object.keys(result.preview.debug.rawExtraction.meta).length > 0
                  ? JSON.stringify(result.preview.debug.rawExtraction.meta, null, 2)
                  : "(none)"}
              </ThemedText>

              <ThemedText style={[styles.debugSectionTitle, { color: colors.icon }]}>
                JSON-LD blocks
              </ThemedText>
              <ThemedText style={[styles.debugCode, { color: colors.text }]}>
                {result.preview.debug.rawExtraction.jsonLdBlocks.length} block(s),{" "}
                {result.preview.debug.rawExtraction.jsonLdParsed} parsed successfully
              </ThemedText>

              {result.preview.debug.rawExtraction.title && (
                <>
                  <ThemedText style={[styles.debugSectionTitle, { color: colors.icon }]}>
                    &lt;title&gt;
                  </ThemedText>
                  <ThemedText style={[styles.debugCode, { color: colors.text }]}>
                    {result.preview.debug.rawExtraction.title}
                  </ThemedText>
                </>
              )}

              {result.preview.debug.rawExtraction.h1 && (
                <>
                  <ThemedText style={[styles.debugSectionTitle, { color: colors.icon }]}>
                    First &lt;h1&gt;
                  </ThemedText>
                  <ThemedText style={[styles.debugCode, { color: colors.text }]}>
                    {result.preview.debug.rawExtraction.h1}
                  </ThemedText>
                </>
              )}

              {(result.preview.debug.rawExtraction.heuristicPrice ||
                result.preview.debug.rawExtraction.heuristicImage) && (
                <>
                  <ThemedText style={[styles.debugSectionTitle, { color: colors.icon }]}>
                    Heuristics
                  </ThemedText>
                  <ThemedText style={[styles.debugCode, { color: colors.text }]}>
                    price: {result.preview.debug.rawExtraction.heuristicPrice ?? "(none)"}
                    {"\n"}image:{" "}
                    {result.preview.debug.rawExtraction.heuristicImage
                      ? result.preview.debug.rawExtraction.heuristicImage.slice(0, 80) + "..."
                      : "(none)"}
                  </ThemedText>
                </>
              )}
            </View>
          )}

          <Pressable
            onPress={reset}
            style={({ pressed }) => [
              styles.resetButton,
              { backgroundColor: colors.icon + "20", opacity: pressed ? 0.8 : 1 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Clear and try another"
          >
            <ThemedText style={[styles.resetButtonText, { color: colors.text }]}>
              Clear and try another
            </ThemedText>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  contentCompact: {
    padding: 12,
  },
  urlInput: {
    height: 48,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 15,
  },
  importButton: {
    height: 48,
    marginTop: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  importButtonText: {
    fontWeight: "600",
    fontSize: 16,
  },
  errorCard: {
    marginTop: 16,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  errorCode: {
    fontSize: 12,
    fontWeight: "600",
    color: "#e53e3e",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  errorMessage: {
    fontSize: 15,
    lineHeight: 20,
  },
  errorHint: {
    fontSize: 13,
    marginTop: 8,
    lineHeight: 18,
  },
  resultCard: {
    marginTop: 20,
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
  },
  resultHeader: {
    flexDirection: "row",
    padding: 14,
  },
  resultImage: {
    width: 80,
    height: 80,
    borderRadius: 6,
    marginRight: 12,
  },
  resultInfo: {
    justifyContent: "flex-start",
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
    lineHeight: 20,
  },
  resultPrice: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 2,
  },
  resultDomain: {
    fontSize: 12,
    marginBottom: 6,
  },
  sourceBadges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  resultMeta: {
    padding: 14,
    borderTopWidth: 1,
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 12,
    lineHeight: 16,
  },
  confidenceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  confidenceValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  debugToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    marginTop: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  debugToggleText: {
    fontSize: 14,
    fontWeight: "500",
  },
  debugPanel: {
    marginTop: 8,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    maxHeight: 400,
  },
  debugSectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    marginTop: 12,
    marginBottom: 4,
  },
  debugCode: {
    fontSize: 11,
    fontFamily: "monospace",
    lineHeight: 16,
  },
  debugNote: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 2,
  },
  resetButton: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
