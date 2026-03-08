# Olist Personal Tracker v1 + Expo TestFlight/OTA Plan

## Summary

- Treat the app as a personal tracker first, with shopping capture and social features deferred behind that core.
- Ship one TestFlight-native binary that already contains the likely near-term native modules needed for reminders, local media, secure local data, and export/share flows.
- Do not ship IGDB in TestFlight until a backend exists; the current client exposes `EXPO_PUBLIC_IGDB_CLIENT_SECRET`, which Expo documents as public bundle data.
- Keep OTA focused on JS/UI/domain changes; accept that new native modules and native-facing `app.json` changes still require a rebuild.

## Audit Findings

- The shipped experience is incomplete outside the list flows: [app/(tabs)/index.tsx](</C:/Users/Justin/Development/Projects/OlistPlayground2/app/(tabs)/index.tsx#L6>) and [app/(tabs)/explore.tsx](</C:/Users/Justin/Development/Projects/OlistPlayground2/app/(tabs)/explore.tsx#L6>) are placeholders, and [app/(tabs)/profile.tsx](</C:/Users/Justin/Development/Projects/OlistPlayground2/app/(tabs)/profile.tsx#L10>) mostly exposes product import.
- Core UX and business logic are concentrated in two oversized route files: [app/list/[id].tsx](/C:/Users/Justin/Development/Projects/OlistPlayground2/app/list/[id].tsx#L401) and [app/(tabs)/search.tsx](</C:/Users/Justin/Development/Projects/OlistPlayground2/app/(tabs)/search.tsx#L327>), with duplicated search/provider logic at [app/list/[id].tsx](/C:/Users/Justin/Development/Projects/OlistPlayground2/app/list/[id].tsx#L653) and [app/(tabs)/search.tsx](</C:/Users/Justin/Development/Projects/OlistPlayground2/app/(tabs)/search.tsx#L65>).
- Sensitive catalog credentials are currently exposed in the client at [app/(tabs)/search.tsx](</C:/Users/Justin/Development/Projects/OlistPlayground2/app/(tabs)/search.tsx#L221>), [app/list/[id].tsx](/C:/Users/Justin/Development/Projects/OlistPlayground2/app/list/[id].tsx#L276), and [app/games/[id].tsx](/C:/Users/Justin/Development/Projects/OlistPlayground2/app/games/[id].tsx#L49).
- Persistence is a good starting point, but the state model is already too narrow for a tracker product; everything funnels through [contexts/lists-context.tsx](/C:/Users/Justin/Development/Projects/OlistPlayground2/contexts/lists-context.tsx#L45) and [lib/lists-storage.ts](/C:/Users/Justin/Development/Projects/OlistPlayground2/lib/lists-storage.ts#L84).
- Repo health needs tightening before release: `expo lint` currently fails, `expo-doctor` reports an Expo SDK mismatch for `@react-native-async-storage/async-storage`, there are no tests, and the current `preview` build profile is internal-only, not TestFlight-ready, at [eas.json](/C:/Users/Justin/Development/Projects/OlistPlayground2/eas.json#L12).

## Implementation Plan

### Phase 0: Release Hardening

- Fix all current lint errors and hook warnings, then rerun `expo lint` and `npx expo-doctor` until clean.
- Downgrade or remove `@react-native-async-storage/async-storage` to match Expo SDK 54 expectations; if SQLite migration is complete, remove the legacy package after a one-version migration window.
- Keep `expo-updates` enabled and keep `runtimeVersion.policy = "appVersion"` for the first release; enforce one rule: any native-module or native-config change must bump `expo.version` and ship as a new binary.
- Move all build/update environment variables to EAS environments; keep only non-secret public values in the client.

### Phase 1: Personal Tracker UX Overhaul

- Replace the placeholder Home tab with a dashboard showing `Continue Tracking`, `Recently Updated`, `Quick Add`, and `Upcoming Reminders`.
- Rework My Lists into sections: pinned lists, recent lists, and templates; add visible search, sort, and filter instead of hiding creation behind a header-only affordance.
- Simplify list detail: keep `list` and `grid` as primary views, move `compare` and `tier` into secondary actions, and replace the current monolithic add-item sheet with a 3-mode flow: `Manual`, `Catalog Search`, `Link Import (Beta)`.
- Move product import out of the main Profile surface; keep it under a `Labs` or `Import` settings section until backend support exists.
- Convert Explore into a template/discovery surface for starter lists and recommended categories, not a blank placeholder.

### Phase 2: New Functionality

- Add per-entry tracker fields: status, rating, tags, progress, last-updated timestamp, optional reminder, and optional custom cover.
- Add bulk actions on list detail: reorder, mark complete, move between lists, duplicate, and archive.
- Add import/export for local backups using JSON first; CSV export is optional after JSON is stable.
- Add local reminders for in-progress entries and due dates.
- Add recent searches, recent target lists, and “add again” shortcuts to reduce friction in repeated use.
- Defer social/shared lists, auth, sync, and IGDB-backed game features until a backend exists.

### Phase 3: Architecture Refactor

- Split `ListsContext` into repository + action hooks: `useListsQuery`, `useListActions`, `useEntryActions`, and `useListPreferences`.
- Extract catalog adapters into `services/catalog/*` for anime, manga, books, and TMDB; both Search and List Detail must call the same adapters.
- Extract add-item UI into dedicated components: `AddItemSheet`, `CatalogSearchPanel`, `ManualEntryForm`, `LinkImportPanel`, `EntryRow`, and `EntryGridCard`.
- Introduce explicit storage migrations in `lib/lists-storage.ts` with a new `lists-state-v3` schema and forward-only migration from v2.
- Remove or hide IGDB search/detail routes from release builds until a backend proxy exists.

## Public APIs / Types To Introduce

- `type EntryStatus = "planned" | "active" | "paused" | "completed" | "dropped"`
- `type EntryProgressUnit = "episode" | "chapter" | "volume" | "item" | "percent"`
- `interface EntryProgress { current: number; total?: number; unit: EntryProgressUnit; updatedAt: number }`
- `interface EntrySourceRef { source: "anime" | "manga" | "book" | "movie" | "tv" | "link" | "custom"; externalId?: string; detailPath?: string; canonicalUrl?: string }`
- Extend `ListEntry` with `status`, `rating`, `tags`, `progress`, `sourceRef`, `addedAt`, `updatedAt`, `reminderAt`, and `coverAssetUri`.
- Replace `ListMetadata` with `ListPreferences { viewMode, sortMode, filterMode, groupMode, showCompleted }`.
- Add repository methods: `updateEntry`, `moveEntry`, `reorderEntries`, `setEntryProgress`, `setEntryStatus`, `setListPreferences`, `exportLists`, and `importLists`.

## Native Dependencies To Preload Before First TestFlight Build

- Install now: `expo-notifications`, `expo-device`, `expo-image-picker`, `expo-file-system`, `expo-sharing`, `expo-document-picker`, `expo-clipboard`, `expo-secure-store`, `expo-local-authentication`.
- Keep as-is: `expo-updates`, `expo-sqlite`, `expo-image`, `expo-haptics`, `expo-web-browser`, `react-native-gesture-handler`, `react-native-reanimated`.
- Defer until backend/sync is real: `expo-auth-session`, `expo-crypto`, any backend SDK, `expo-camera`, `expo-media-library`, `expo-location`.
- Add required config plugins and permission strings now for the installed native modules so later JS feature work can ship over OTA without another binary for those same capabilities.

## OTA / Build Rules

- OTA-safe: UI changes, navigation changes, business logic changes, storage schema migrations in JS, enabling already-bundled native modules, and adding JS-only libraries.
- Rebuild-required: adding any new native module not already in the binary, changing config plugins, changing permission text, changing icons/splash, changing bundle/package IDs, changing scheme/associated domains, or enabling new native capabilities.
- TestFlight flow: build `ios` with the new `testflight` profile on `preview`, distribute via TestFlight, and ship QA updates with `eas update --channel preview`.
- Production flow later: build `ios` with `production`, then ship production OTA updates only to `production`.

## Test Cases And Scenarios

- Create, rename, delete, and restore lists across cold app launches.
- Add manual, catalog, and link-import entries; verify each persists and renders in list and grid views.
- Update progress/status/rating/tags and verify derived dashboard sections update correctly.
- Export a backup, clear local data, import the backup, and verify lossless restore.
- Schedule a local reminder, relaunch the app, and verify reminder state remains correct.
- Publish a JS-only OTA to the `preview` channel and verify an installed TestFlight build receives it without a rebuild.
- Attempt a feature using a non-preloaded native dependency and confirm it is blocked from OTA and routed to the next binary release.

## Assumptions And Defaults

- Main product focus is a private personal tracker now; shopping capture and social features are future phases.
- Balanced preload is the desired strategy; the app should absorb a modest binary increase now to reduce near-term rebuilds.
- Backend work is deferred for now, so IGDB must not ship in release builds and product import stays beta/limited.
- `runtimeVersion.policy = "appVersion"` remains the launch default; version bumps are mandatory whenever native runtime changes.
- The first TestFlight milestone is quality and retention, not backend sync or collaboration.

## Source References

- Expo OTA deployment and channels: [docs.expo.dev/eas-update/deployment](https://docs.expo.dev/eas-update/deployment/)
- Runtime version policies: [docs.expo.dev/eas-update/runtime-versions](https://docs.expo.dev/eas-update/runtime-versions/)
- Native-library/config-plugin rebuild boundary: [docs.expo.dev/workflow/using-libraries](https://docs.expo.dev/workflow/using-libraries/)
- `EXPO_PUBLIC_*` visibility rules: [docs.expo.dev/guides/environment-variables](https://docs.expo.dev/guides/environment-variables/)
- Native module docs for planned preload set: [Notifications](https://docs.expo.dev/versions/latest/sdk/notifications/), [ImagePicker](https://docs.expo.dev/versions/latest/sdk/imagepicker/), [SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/), [LocalAuthentication](https://docs.expo.dev/versions/latest/sdk/local-authentication/), [Sharing](https://docs.expo.dev/versions/latest/sdk/sharing/)
