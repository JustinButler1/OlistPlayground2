# Known Problems

## Native iOS nested header menu actions can trigger the wrong handler

### Summary

On the list detail screen, the native iOS ellipsis menu uses `Stack.Toolbar.Menu` from `expo-router` with nested submenus such as:

- `View`
- `Convert tag to sublist`

The expected behavior is that each submenu item fires its own handler.

The observed behavior was that multiple submenu items triggered the wrong action. In practice, many selections behaved as if they were the `List view` or `Grid view` actions instead of their actual handlers.

### Affected area

- [app/list/[id].tsx](/C:/Users/Justin/Development/Projects/OlistPlayground2/app/list/[id].tsx)

### Symptoms

- Tapping submenu items inside the native iOS ellipsis menu executed the wrong handler.
- The problem only affected the native nested header menu path.
- The custom fallback overlay menu logic was not the source of the bug.
- Top-level menu actions could appear normal while nested submenu actions misrouted.

### Root cause

This was caused by a bug in `react-native-screens`, which is used underneath Expo Router's native header toolbar menu implementation.

Relevant file:

- [prepareHeaderBarButtonItems.ts](/C:/Users/Justin/Development/Projects/OlistPlayground2/node_modules/react-native-screens/src/components/helpers/prepareHeaderBarButtonItems.ts)

`react-native-screens` prepares native header menu actions by assigning each action a generated `menuId`.

Before the fix, nested menu IDs were generated like this:

```ts
menuId: `${menuIndex}-${index}-${side}`
```

That ID format used:

- the item's index inside its immediate submenu
- the top-level header item index
- the header side

It did **not** include the full submenu path.

That meant different nested submenu branches could generate identical `menuId` values. For example, the first action in two different submenus under the same header item could both resolve to the same ID.

Later, when the native press event came back into JS, `react-native-screens` recursively searched the menu tree and executed the first action whose `menuId` matched the native event. Because IDs collided, the wrong handler could run.

### Why it looked like a view-routing bug

The `View` submenu is one of the first nested menu branches and contains actions that change `preferences.viewMode`. Because the menu dispatcher returned the first matching action, collisions often resolved to one of the `View` submenu actions. That made the bug look like unrelated buttons were incorrectly wired to grid/list view.

### Fix implemented

The fix was to make nested menu IDs include the full submenu path instead of only the local item index.

The patched code now generates IDs like this:

```ts
menuId: `${[...path, String(menuIndex)].join('.')}-${index}-${side}`
```

And recursive submenu preparation now carries the path forward:

```ts
prepareMenu(menuItem, index, side, [...path, String(menuIndex)])
```

This guarantees that:

- actions in different submenu branches get different IDs
- native events map back to the correct JS handler
- the existing native nested menu implementation can stay in place

### Files changed for the fix

Runtime patch targets:

- [prepareHeaderBarButtonItems.ts](/C:/Users/Justin/Development/Projects/OlistPlayground2/node_modules/react-native-screens/src/components/helpers/prepareHeaderBarButtonItems.ts)
- [prepareHeaderBarButtonItems.js](/C:/Users/Justin/Development/Projects/OlistPlayground2/node_modules/react-native-screens/lib/commonjs/components/helpers/prepareHeaderBarButtonItems.js)
- [prepareHeaderBarButtonItems.js](/C:/Users/Justin/Development/Projects/OlistPlayground2/node_modules/react-native-screens/lib/module/components/helpers/prepareHeaderBarButtonItems.js)

Persistence for reinstall:

- [package.json](/C:/Users/Justin/Development/Projects/OlistPlayground2/package.json)
- [fix-react-native-screens-menu-ids.js](/C:/Users/Justin/Development/Projects/OlistPlayground2/scripts/fix-react-native-screens-menu-ids.js)

### Why there is a postinstall script

The immediate fix required patching files inside `node_modules`, which would otherwise be lost after:

- `npm install`
- dependency refreshes
- clean environment setup

To avoid losing the fix, a `postinstall` script was added:

```json
"postinstall": "node ./scripts/fix-react-native-screens-menu-ids.js"
```

That script reapplies the patch automatically after installs.

### Important maintenance note

This is a local patch against `react-native-screens` `4.23.0`.

When upgrading any of the following, re-check whether this patch is still needed:

- `react-native-screens`
- `@react-navigation/native-stack`
- `expo-router`
- Expo SDK

If upstream fixes the bug, remove the workaround script and the `postinstall` entry.

### How to verify

On iOS, open a list detail page with the native ellipsis menu and test nested submenu actions such as:

- `View -> List view`
- `View -> Grid view`
- `View -> Compare view`
- `View -> Tier view`
- `Convert tag to sublist -> <tag>`
- `Configure list`
- `Save as template`

Expected result:

- each action runs its own intended handler
- no unrelated submenu action falls through to grid/list view

### Current status

- Native nested menu implementation preserved
- Custom non-native fallback not used for this fix
- Targeted lint verification passed for the maintenance script and affected screen

## My Lists drag-and-drop reorder implementation notes

### Summary

The `My Lists` screen now supports press-and-hold row reordering with:

- a floating dragged card that follows the finger
- slight shrink on lift
- a blue insertion line between rows
- haptics on lift, drop, and insertion-position changes
- persistent custom ordering
- edge auto-scroll while dragging

This implementation required several corrections because the first passes mixed coordinate spaces, relied on unstable measurements, and pushed too much drag-time work through React state.

### Affected area

- [app/(tabs)/my-lists/index.tsx](/C:/Users/Justin/Development/Projects/OlistPlayground2/app/(tabs)/my-lists/index.tsx)
- [contexts/lists-context.tsx](/C:/Users/Justin/Development/Projects/OlistPlayground2/contexts/lists-context.tsx)
- [convex/lists.ts](/C:/Users/Justin/Development/Projects/OlistPlayground2/convex/lists.ts)
- [convex/shared.ts](/C:/Users/Justin/Development/Projects/OlistPlayground2/convex/shared.ts)
- [convex/schema.ts](/C:/Users/Justin/Development/Projects/OlistPlayground2/convex/schema.ts)
- [data/mock-lists.ts](/C:/Users/Justin/Development/Projects/OlistPlayground2/data/mock-lists.ts)
- [lib/lists-storage.ts](/C:/Users/Justin/Development/Projects/OlistPlayground2/lib/lists-storage.ts)

### What was done overall

- Added persistent list ordering via list `sortOrder`
- Added `reorderLists` mutation and client action
- Implemented long-press pan reordering for row view
- Added a floating overlay row instead of moving the real row directly
- Added a drop indicator line that tracks the insertion boundary
- Added drag haptics
- Added auto-scroll near top and bottom edges
- Tuned lift/release timing and row settle animation

### What went wrong during implementation

- The first drag overlay used the wrong coordinate space, so the dragged row appeared near the top of the screen instead of under the finger.
- A later ref/measurement-based attempt broke drag activation entirely.
- The insertion line was initially aligned to raw row boundaries without accounting for content padding or line height, so it visually overlapped rows.
- The dragged row was temporarily left in layout as a faded placeholder, which made the insertion line appear to sit in the wrong place.
- The drag overlay was initially locked on the x-axis, which made the card feel detached from the finger.
- Early settle animation tuning removed bounce entirely or made it far too bouncy because the wrong animation layer was being tuned.
- The first auto-scroll implementation was choppy because it forced React state updates every frame during drag.
- Auto-scroll also initially failed because the scroll path depended too much on incomplete measurement/state assumptions.

### Root causes

- Mixing `measureInWindow`, viewport coordinates, FlatList content coordinates, and scroll offsets without a single consistent model.
- Treating visually correct placement and mathematically correct placement as the same thing. The insertion line needed visual centering in the gap, not just a boundary coordinate.
- Using React state for high-frequency drag/scroll values that should stay in refs or shared values.
- Tuning the dragged card scale animation when the visible bounce was actually coming from row layout transitions.
- Relying on fragile host-view measurement/ref behavior inside a drag gesture path.

### Correct methods used in the final version

- Keep the real list item in the list and render a separate floating overlay card for the dragged item.
- Use the gesture's touch offsets and absolute pointer position to anchor the floating row under the finger.
- Track x and y independently so the overlay can follow the finger naturally.
- Derive insertion targets from ordered row heights and current scroll offset rather than ad hoc window measurements during updates.
- Collapse the dragged row's placeholder out of layout so the gap and insertion line reflect visible rows.
- Account for content padding and indicator height when placing the insertion line.
- Persist the reordered list IDs immediately through a dedicated `reorderLists` path and mirror the order optimistically in the UI.
- Use haptics only for discrete drag state changes:
  - pick up
  - drop/cancel
  - insertion target changed
- Use refs/shared values for drag-time values:
  - current scroll offset
  - drag position
  - auto-scroll velocity
  - current drag target
- Use programmatic `scrollToOffset` in an animation-frame loop for edge auto-scroll instead of trying to drive it through normal React updates.
- Keep the row settle animation separate from the overlay lift/release scale animation and tune them independently.

### What to avoid

- Do not use `measureInWindow` repeatedly during drag updates unless there is no alternative. It is too easy to mix coordinate spaces and introduce lag.
- Do not depend on host refs in the critical drag activation path if a layout-based approach is sufficient.
- Do not use React state as the primary source of truth for per-frame auto-scroll or drag positioning.
- Do not leave the dragged row visible or semi-visible in layout if the UI is supposed to show a true gap.
- Do not assume the insertion line belongs at the raw row boundary without adjusting for visual centering.
- Do not tune only `withTiming`/`withSpring` on the overlay scale and assume that fixes row bounce. Row bounce often comes from layout transitions instead.
- Do not disable the list in ways that block programmatic edge scrolling while dragging.

### Recommended procedure for future reorder surfaces

1. Add persistent ordering in the data model first.
2. Build the drag UI around a floating overlay card, not by directly translating the real row.
3. Choose one coordinate system and convert into it explicitly.
4. Keep drag-time values in refs/shared values.
5. Add the insertion line only after gap math is correct.
6. Add haptics only after insertion-target changes are stable.
7. Add edge auto-scroll last, after drag positioning and insertion targeting are already correct.
8. Tune three animation layers separately:
   overlay lift
   overlay release
   row layout settle

### Verification checklist

- Long press activates drag reliably in row view.
- The floating card appears directly under the finger, including over the thumbnail.
- The floating card follows both x and y.
- The insertion line sits visually between rows.
- Haptics fire on lift, drop, and target change.
- Releasing commits order and persists after reload.
- Drag near the top or bottom edge scrolls smoothly when more content exists.
- Auto-scroll remains visually smooth and does not cause obvious list jitter.

### Current status

- Persistent reorder path implemented
- Gesture-based row drag implemented
- Floating overlay, insertion line, haptics, and edge auto-scroll implemented
- Performance improved by moving drag-time scroll values out of React state
- This implementation should be reused as the reference pattern for future reorderable row lists

## FlatList keyboard avoidance does not work with contentContainerStyle paddingBottom

### Summary

On the list detail screen, the "Add an item" composer text input at the bottom of the FlatList was not scrolling into view when the keyboard appeared. The composer was hidden behind the keyboard even though keyboard-avoidance code existed.

### Affected area

- [app/list/[id].tsx](/C:/Users/Justin/Development/Projects/OlistPlayground2/app/list/[id].tsx)

### Symptoms

- Tapping the "Add an item" input opened the keyboard, but the input remained hidden behind it.
- The list scrolled a tiny amount (roughly one row height) but immediately bounced back.
- Various JS-side scroll-to-end attempts all failed or partially failed.

### What was tried and why it failed

Three JS-side approaches were attempted before finding the correct fix:

1. **`useEffect` watching `keyboardHeight` + `scrollToEnd` via `requestAnimationFrame`**
   Scrolled a tiny bit but not nearly enough. `scrollToEnd` fired before the FlatList's native content size had been updated with the new `paddingBottom`, so the scroll target was based on the old (small) content size.

2. **`useEffect` watching `keyboardHeight` + `scrollToEnd` via `setTimeout(150)`**
   No visible change. Same underlying issue — the timeout was not long enough or reliable enough to wait for the native layout engine to process the new `paddingBottom` and update the scroll view's content size.

3. **`onContentSizeChange` callback with a `pendingScrollToEndRef` flag + `scrollToOffset`**
   Scrolled about one row height, then bounced back. `onContentSizeChange` fires multiple times with incrementally-updating heights as the layout engine processes the new padding. The first (partial) callback consumed the flag and scrolled to a small offset. By the time the final content size was reported, the flag was already consumed.

### Root cause

The FlatList sits inside a `flex: 1` View that does **not** shrink when the keyboard appears (there is no `KeyboardAvoidingView`). The approach was to add `keyboardHeight` to `contentContainerStyle.paddingBottom` to create extra scrollable space, then call `scrollToEnd` to scroll the composer into view.

This failed because React Native's FlatList does not synchronously update its native scroll view `contentSize` when `contentContainerStyle.paddingBottom` changes via a JS re-render. The native layout update is asynchronous and may fire `onContentSizeChange` multiple times with intermediate values. Any JS-side scroll attempt — whether immediate, delayed, or callback-driven — races against this native layout pipeline and cannot reliably scroll to the correct offset.

### Fix implemented

Replaced the JS-side `paddingBottom` keyboard compensation with the native iOS `contentInset` prop on the FlatList.

```tsx
const keyboardContentInset = isIos && composerVisible && keyboardHeight > 0 ? keyboardHeight : 0;

<FlatList
  contentInset={{ bottom: keyboardContentInset }}
  scrollIndicatorInsets={{ bottom: keyboardContentInset }}
  ...
/>
```

`contentInset` is a native `UIScrollView` property that expands the scrollable area without changing the content size. It is processed entirely on the native side with no JS timing dependency. `scrollToEnd` respects `contentInset` natively, so the existing `scrollComposerIntoView` calls now work correctly without any additional scroll logic.

`keyboardHeight` was removed from `footerSpacerHeight` on iOS since `contentInset` handles that space natively. Android still includes `keyboardHeight` in `footerSpacerHeight` since `contentInset` is iOS-only.

### What to avoid

- Do not use `contentContainerStyle.paddingBottom` to compensate for keyboard height on iOS FlatLists. The native content size update is asynchronous and unreliable for scroll targeting.
- Do not use `scrollToEnd` or `scrollToOffset` with JS-calculated offsets that depend on `contentContainerStyle` padding changes having been applied. The scroll view's native content size may not reflect the JS-side padding yet.
- Do not use `onContentSizeChange` as a reliable signal that a specific padding change has been fully applied. It can fire multiple times with intermediate values.
- Do not use `setTimeout` or `requestAnimationFrame` to work around native layout timing. The delay is unpredictable and platform-dependent.

### Correct approach for keyboard avoidance in FlatList on iOS

Use `contentInset={{ bottom: keyboardHeight }}` on the FlatList. This is the native `UIScrollView` mechanism for expanding scrollable area and is handled entirely by the native layout engine. Pair it with `scrollIndicatorInsets` so the scroll indicator also stops at the keyboard top. Then use `scrollToEnd` normally — it will respect the inset.

### Current status

- Keyboard avoidance working correctly on iOS using `contentInset`
- Android path unchanged (still uses `paddingBottom` with `keyboardHeight`)
- No additional JS scroll timing logic needed
