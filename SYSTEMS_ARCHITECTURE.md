# Olist Systems, Infrastructure, and Process Overview

This document describes how the current app is structured and operated based on the code in this repository as of March 17, 2026.

## 1. Product Scope

Olist is an Expo Router application for tracking media and personal collections. The current app supports:

- Onboarding and profile setup
- Custom list creation and list templates
- Entry tracking across anime, manga, books, TV/movies, links, custom items, and some game detail support
- Catalog search across multiple external providers
- Reminder scheduling for tracked entries
- A mock community surface and mock/test account switching

The app is currently designed around a single logical workspace rather than full multi-user authentication.

## 2. Top-Level Architecture

The app uses a client-heavy architecture with Convex as the primary backend and data sync layer.

- Frontend runtime: Expo SDK 55, React 19, React Native 0.83, Expo Router
- Server state and network caching: TanStack Query
- Backend/database: Convex
- Native/local persistence: `expo-sqlite/kv-store`, with some legacy AsyncStorage migration support
- Native capabilities: notifications, secure store, local authentication, image picker, document picker
- Build/deployment: EAS Build + Expo Updates OTA channels

At startup, the app composes these providers in [`app/_layout.tsx`](/C:/Users/Justin/Development/Projects/OlistPlayground2/app/_layout.tsx):

- `QueryClientProvider`
- `ConvexProvider`
- `ThemeProvider`
- `TestAccountsProvider`
- `OnboardingProvider`
- `ListsProvider`

Those providers are the main operational backbone of the app.

## 3. Frontend Structure

### Routing

Navigation is file-based through Expo Router.

- Root stack lives in [`app/_layout.tsx`](/C:/Users/Justin/Development/Projects/OlistPlayground2/app/_layout.tsx)
- Main tab shell lives in [`app/(tabs)/_layout.tsx`](/C:/Users/Justin/Development/Projects/OlistPlayground2/app/(tabs)/_layout.tsx)
- Primary tabs are Home, My Lists, Community, Profile, and Explore
- Detail routes exist for anime, manga, books, TV/movies, games, lists, list entries, and product import

### Major Screens

- Home: placeholder/dashboard shell
- My Lists: main tracker management flow
- Explore: federated search and discovery across local lists plus external catalogs
- Community: mock social feed assembled from seed data plus local in-memory created posts
- Profile: onboarding/profile state, list visibility, mock account switching, and status views

### UI Model

The UI is mostly organized into:

- `app/` for routes
- `components/` for reusable UI and feature components
- `contexts/` for app state orchestration
- `hooks/` for small reusable hooks
- `constants/` for theme and onboarding constants

## 4. State and Data Flow

There are two main application state systems:

### 4.1 Convex-backed live state

This is the default runtime path for the `live-current` account.

- Convex snapshot query: [`convex/workspace.ts`](/C:/Users/Justin/Development/Projects/OlistPlayground2/convex/workspace.ts)
- Client bootstrap hook: [`lib/convex-bootstrap.ts`](/C:/Users/Justin/Development/Projects/OlistPlayground2/lib/convex-bootstrap.ts)
- Convex client setup: [`lib/convex-client.ts`](/C:/Users/Justin/Development/Projects/OlistPlayground2/lib/convex-client.ts)

Startup flow:

1. The app creates a Convex client from `EXPO_PUBLIC_CONVEX_URL`.
2. `useConvexWorkspaceBootstrap()` ensures the single workspace exists.
3. The app fetches a workspace snapshot from Convex.
4. If Convex is empty, legacy local state is imported once, then cleared locally.

### 4.2 Mock account state

The app also supports deterministic test/demo profiles through [`contexts/test-accounts-context.tsx`](/C:/Users/Justin/Development/Projects/OlistPlayground2/contexts/test-accounts-context.tsx).

- Active account selection is persisted in SQLite KV storage
- Mock accounts keep their own seeded onboarding and list state in memory
- Providers expose a unified interface so screens can work against either Convex or mock data

This gives the app a dual-runtime model:

- Live account -> Convex-backed
- Mock accounts -> local seeded state

## 5. Core Domain Systems

### 5.1 Onboarding and Profile

The onboarding system is managed by [`contexts/onboarding-context.tsx`](/C:/Users/Justin/Development/Projects/OlistPlayground2/contexts/onboarding-context.tsx) and Convex mutations in [`convex/onboarding.ts`](/C:/Users/Justin/Development/Projects/OlistPlayground2/convex/onboarding.ts).

It stores:

- Display name
- Birth date
- Avatar
- Interest selections
- Completion timestamp

Avatar uploads use Convex file storage through [`convex/media.ts`](/C:/Users/Justin/Development/Projects/OlistPlayground2/convex/media.ts).

### 5.2 Lists and Entries

The tracker system is the main domain system. It is coordinated by [`contexts/lists-context.tsx`](/C:/Users/Justin/Development/Projects/OlistPlayground2/contexts/lists-context.tsx) and backed by Convex mutations in [`convex/lists.ts`](/C:/Users/Justin/Development/Projects/OlistPlayground2/convex/lists.ts).

Capabilities include:

- Create, update, archive, delete, restore, and reorder lists
- Create lists from built-in or user-saved templates
- Add, update, delete, move, duplicate, reorder, and archive entries
- Track entry progress, status, rating, tags, notes, reminders, and cover images
- Convert tags into sublists and reverse that mapping
- Export/import tracker state

The list model is highly configurable through:

- Addons
- Automation blocks
- Custom field definitions
- Display/view preferences

The domain validators live in [`convex/model.ts`](/C:/Users/Justin/Development/Projects/OlistPlayground2/convex/model.ts).

### 5.3 Item User Data

Per-item metadata is stored separately from list membership so users can attach notes, tags, ratings, progress, and custom fields to a canonical item key. This is represented in the `itemUserData` table and exposed through list context hooks.

### 5.4 Community

The community feature is not currently backed by Convex.

- Base feed comes from mock data in `data/`
- User-created posts are stored in an in-memory external store: [`lib/community-posts-store.ts`](/C:/Users/Justin/Development/Projects/OlistPlayground2/lib/community-posts-store.ts)

Implication: created posts are session-local and non-persistent.

## 6. Backend and Database

### Convex Schema

The primary database schema is defined in [`convex/schema.ts`](/C:/Users/Justin/Development/Projects/OlistPlayground2/convex/schema.ts).

Current tables:

- `workspace`
- `onboardingProfile`
- `mediaAssets`
- `lists`
- `listEntries`
- `savedTemplates`
- `itemUserData`

### Data Modeling Characteristics

- Single workspace slug: `main`
- Client-generated ids are used heavily for lists, entries, and templates
- Soft-delete/archive fields are used for historical visibility
- Media assets are tracked separately from the records that reference them
- Schema validation is temporarily disabled for compatibility with legacy cleanup and migration

### File Storage

Convex storage is used for:

- Profile avatars
- List images
- Entry covers

Asset attachment and replacement logic lives in [`convex/media.ts`](/C:/Users/Justin/Development/Projects/OlistPlayground2/convex/media.ts). The backend also tries to delete unreferenced assets when records are replaced or cleared.

## 7. Local Persistence and Migration

The app still contains a local persistence and migration layer in [`lib/lists-storage.ts`](/C:/Users/Justin/Development/Projects/OlistPlayground2/lib/lists-storage.ts) and its onboarding companion module.

It exists for:

- backup/export/import
- mock account persistence needs
- one-time migration from older local-only tracker versions into Convex

Storage layers used:

- Primary local KV: `expo-sqlite/kv-store`
- Legacy support: `@react-native-async-storage/async-storage`

Migration flow:

1. App boots and ensures Convex workspace exists.
2. If the workspace is empty, the app reads old local tracker/onboarding state.
3. Migratable data is imported into Convex.
4. Non-migratable local asset URIs are skipped with warnings.
5. Legacy local state is cleared after import.

## 8. Search and External Integrations

### Catalog Search

Search is federated through adapter modules under [`services/catalog`](/C:/Users/Justin/Development/Projects/OlistPlayground2/services/catalog).

Current adapters:

- Anime: Jikan
- Manga: Jikan
- Books: Google Books
- TV/Movies: TMDB

Aggregator logic lives in [`services/catalog/index.ts`](/C:/Users/Justin/Development/Projects/OlistPlayground2/services/catalog/index.ts).

The Explore screen also mixes in:

- local list search
- category-specific sort options
- result de-duplication and relevance adjustments

### Detail Providers

Dedicated detail routes fetch remote details directly from third-party APIs for:

- Anime
- Manga
- TV/movies
- Games

### Environment Variables

The current app expects these public environment variables in the client bundle:

- `EXPO_PUBLIC_CONVEX_URL`
- `EXPO_PUBLIC_TMDB_API_KEY`
- `EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY`
- `EXPO_PUBLIC_IGDB_CLIENT_ID`
- `EXPO_PUBLIC_IGDB_CLIENT_SECRET`

Important operational note:

- `EXPO_PUBLIC_*` values are public at build time in Expo apps
- The current game detail path uses IGDB credentials from the client, which is not appropriate for a hardened production design
- The existing repo plan file already calls this out as a release constraint

## 9. Client Networking and Caching

TanStack Query is configured in [`lib/query-client.ts`](/C:/Users/Justin/Development/Projects/OlistPlayground2/lib/query-client.ts).

Current defaults:

- `staleTime`: 5 minutes
- `gcTime`: 30 minutes
- retry limit: 2 attempts
- no window-focus refetch

Known handling choice:

- Queries do not retry when TMDB or IGDB credentials are missing

Convex handles the app's primary persistent state; TanStack Query is used for external catalog/detail fetches.

## 10. Native Device Services

### Notifications

Reminder scheduling is handled in [`lib/reminders.ts`](/C:/Users/Justin/Development/Projects/OlistPlayground2/lib/reminders.ts).

- Uses `expo-notifications`
- Creates an Android notification channel named `tracker-reminders`
- Reconciles scheduled notifications against current list state
- Web is excluded
- Physical-device permission is required

### Media and Document Inputs

The app is configured for:

- image picking
- document picking
- image manipulation
- sharing

### Security-related Native Modules

The app includes:

- `expo-secure-store`
- `expo-local-authentication`

These are currently configured in Expo but are not yet the central storage mechanism for tracker state. They appear positioned for protected backup or sensitive settings workflows.

## 11. Build, Release, and Deployment Infrastructure

Build and release configuration is defined in [`app.json`](/C:/Users/Justin/Development/Projects/OlistPlayground2/app.json) and [`eas.json`](/C:/Users/Justin/Development/Projects/OlistPlayground2/eas.json).

### Platforms

- iOS
- Android
- Web static export

### Build Profiles

- `development`: internal development client
- `preview`: internal distribution
- `testflight`: store distribution on preview channel
- `production`: production channel with auto-increment

### OTA Strategy

Expo Updates is enabled with:

- runtime version policy based on app version
- channel-based OTA deployment through EAS Update

Implication:

- JavaScript/content updates can ship over the air within the same runtime version
- Native dependency/config changes still require a new binary build

## 12. Operational Processes

### Startup Process

1. Root providers mount.
2. Convex client initializes from env.
3. Workspace bootstrap runs.
4. Snapshot query hydrates onboarding + tracker state.
5. Mock or live account path is selected.
6. Reminder notifications reconcile against current tracker state.

### Data Mutation Process

1. Screen calls context action.
2. Context decides whether runtime is mock or live.
3. Mock path updates in-memory seeded state.
4. Live path sends Convex mutation.
5. Provider tracks pending mutations and exposes sync/error status.

### Image Upload Process

1. Client asks Convex for an upload URL.
2. File is uploaded to Convex storage.
3. Client resolves the public URL.
4. Backend mutation attaches the asset to profile/list/entry.
5. Old assets are marked replaced and cleaned up if unreferenced.

### Legacy Migration Process

1. Detect empty Convex workspace.
2. Read local legacy list/onboarding state.
3. Normalize and import records into current schema.
4. Skip local-only asset URIs that cannot be migrated.
5. Clear legacy local stores.

## 13. Current Constraints and Design Realities

These are important for anyone operating or extending the app:

- No real user auth or multi-tenant account model is present yet
- The backend is organized around one workspace slug, not user-owned workspaces
- Community is mock/local only
- Some screens are still placeholder-heavy
- Search is partially federated; games/lists/people are not fully integrated into the shared catalog adapter system
- IGDB credentials are currently exposed via public Expo env vars
- Schema validation is intentionally relaxed during migration compatibility work

## 14. Recommended Mental Model for the App

The simplest accurate way to think about the app today is:

- Expo app as the product shell and native runtime
- Convex as the system of record for live tracker and onboarding data
- Context providers as the app service layer
- TanStack Query as the external API fetch/cache layer
- SQLite KV storage as migration, local support, and account-selection infrastructure
- Mock accounts as a built-in demo/test harness

## 15. File Map for Key Systems

- App shell: [`app/_layout.tsx`](/C:/Users/Justin/Development/Projects/OlistPlayground2/app/_layout.tsx)
- Tabs shell: [`app/(tabs)/_layout.tsx`](/C:/Users/Justin/Development/Projects/OlistPlayground2/app/(tabs)/_layout.tsx)
- Lists state/service layer: [`contexts/lists-context.tsx`](/C:/Users/Justin/Development/Projects/OlistPlayground2/contexts/lists-context.tsx)
- Onboarding state/service layer: [`contexts/onboarding-context.tsx`](/C:/Users/Justin/Development/Projects/OlistPlayground2/contexts/onboarding-context.tsx)
- Test/demo account system: [`contexts/test-accounts-context.tsx`](/C:/Users/Justin/Development/Projects/OlistPlayground2/contexts/test-accounts-context.tsx)
- Convex bootstrap: [`lib/convex-bootstrap.ts`](/C:/Users/Justin/Development/Projects/OlistPlayground2/lib/convex-bootstrap.ts)
- Query caching: [`lib/query-client.ts`](/C:/Users/Justin/Development/Projects/OlistPlayground2/lib/query-client.ts)
- Reminder scheduling: [`lib/reminders.ts`](/C:/Users/Justin/Development/Projects/OlistPlayground2/lib/reminders.ts)
- Local tracker persistence/migration: [`lib/lists-storage.ts`](/C:/Users/Justin/Development/Projects/OlistPlayground2/lib/lists-storage.ts)
- Catalog integration layer: [`services/catalog/index.ts`](/C:/Users/Justin/Development/Projects/OlistPlayground2/services/catalog/index.ts)
- Convex schema: [`convex/schema.ts`](/C:/Users/Justin/Development/Projects/OlistPlayground2/convex/schema.ts)
- Convex tracker mutations: [`convex/lists.ts`](/C:/Users/Justin/Development/Projects/OlistPlayground2/convex/lists.ts)
- Convex onboarding mutations: [`convex/onboarding.ts`](/C:/Users/Justin/Development/Projects/OlistPlayground2/convex/onboarding.ts)
- Convex media/file handling: [`convex/media.ts`](/C:/Users/Justin/Development/Projects/OlistPlayground2/convex/media.ts)

## 16. Suggested Next Documentation Additions

If this repo needs deeper operational documentation next, the highest-value follow-ups would be:

- environment setup and secret management
- release checklist for preview/TestFlight/production
- data model reference for lists and entries
- API/provider integration matrix with rate-limit and failure behavior
- security hardening plan for auth and provider credential handling
