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
