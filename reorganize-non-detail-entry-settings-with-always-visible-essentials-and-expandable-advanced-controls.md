# Reorganize Non-Detail Entry Settings With Always-Visible Essentials And Expandable Advanced Controls

## Summary

Refine the non-detail entry settings plan so the screen is compact but not stripped down. The top of the screen must show all essential controls inline, with no dropdown required to access them. Additional complexity should be available through clearly labeled expandable sections and add-actions, not hidden behind a single vague “Essentials” collapsible. The row-tap rule remains unchanged: normal tap only navigates when the entry has a real details destination; otherwise settings are only reached from the swipe info action.

## Core UX Principles

- Essentials are always visible on screen load.
- The title must be fully visible and editable without truncation.
- Progressive disclosure applies only to secondary and advanced controls.
- Users must have clear paths to add more metadata and more structure.
- “Minimal” means low-clutter defaults, not missing functionality.

## Navigation And Interaction Rules

- In [app/list/[id].tsx](C:/Users/Justin/Development/Projects/OlistPlayground2/app/list/[id].tsx):
  - Keep normal tap navigation only for:
    - linked-list entries
    - entries with `detailPath`
  - For entries with neither, tap does nothing.
  - Keep swipe info as the only route into `/list-entry/[id]` for non-detail entries.
- Only show a chevron when the row actually navigates.
- Keep link-button behavior for `productUrl`.

## Screen Structure For `/list-entry/[id]`

Use a single scrollable native form with this order:

1. `Identity`
2. `Tracking`
3. `Add More`
4. `Expanded Sections`

### 1. Identity

Always visible. No collapse.

Content:
- Full-width multiline title field
- Optional type/source summary row if useful for context
- If the entry links out or to a sublist, show a compact read-only destination row

Requirements:
- Title field must grow to fit at least 2-4 lines.
- Do not truncate the current title in the input.
- Keep title editing inline, not in a modal or hidden section.

### 2. Tracking

Always visible. No collapse.

Show every essential field supported by the current list config directly in the form:

- `Status` if supported by list config
- `Progress` if supported by list config
- `Rating` if supported by list config
- `Reminder` if supported by list config
- `Checked/toggle` only if relevant to that list style

Rules:
- These controls are inline rows, not inside a dropdown.
- If a field is unsupported and empty, omit it.
- If a field is supported, show it even when unset.
- Use native row pickers / selection rows already used in the app.

## Progressive Disclosure For More Complexity

After the always-visible essentials, add a dedicated `Add More` block with explicit actions. This is how users opt into complexity.

### `Add More` actions

Show buttons/rows such as:

- `Add notes`
- `Add tags`
- `Add custom fields`
- `Add cover`
- `Add link`

Behavior:
- If a section already has content, replace the add-action with the expanded section itself.
- Tapping an add-action reveals that section inline below.
- Revealed sections stay visible for the rest of the session; if the entry has saved data there, they start visible next time too.

## Expanded Sections

These are secondary, not essential.

### Notes
- Multiline text area
- Visible by default only when notes already exist
- Otherwise revealed from `Add notes`

### Tags
- Token/chip style input or simple comma-separated input, depending on existing repo patterns
- Visible by default only when tags exist
- Otherwise revealed from `Add tags`

### Custom Fields
- Render each configured field inline
- Visible by default only when the list has configured custom fields and at least one has a value
- Otherwise revealed from `Add custom fields`

### Cover
- Show current cover if present plus replace/remove actions
- Otherwise revealed from `Add cover`

### Link
- Product URL input
- Visible by default only when a URL exists
- Otherwise revealed from `Add link`

## Component Strategy

Do not reuse the current broad `ManualEntryForm` layout for this screen.

Instead create a small dedicated settings surface made of native rows:

- `EntrySettingsScreen`
- `EntrySettingsSection`
- `EntrySettingsAddMore`
- `EntrySettingsTitleField`
- `EntrySettingsSummaryRow`

`ManualEntryForm` remains for create/full-edit flows.

## State Model

For the compact settings screen, track revealed advanced sections locally:

- `showNotes`
- `showTags`
- `showCustomFields`
- `showCover`
- `showLink`

Initial values:
- `true` if the entry already has data in that section
- `true` for custom fields if any configured field has a saved value
- otherwise `false`

This gives users ways to add complexity without overwhelming the initial screen.

## Public Interfaces / Type Changes

- No persistence schema changes.
- Add helper functions only:
  - `canOpenEntryDetails(entry, isForeignList): boolean`
  - `getInitialAdvancedSectionVisibility(entry, listConfig): AdvancedVisibilityState`
  - `hasEntrySectionData(entry, listConfig, section): boolean`

## Test Cases And Scenarios

1. Non-detail entry tap does nothing.
2. Swipe info still opens `/list-entry/[id]`.
3. Entry with `detailPath` still opens details on tap.
4. Linked-list entry still opens linked list on tap.
5. Title field shows the full current title without truncation.
6. Title remains visible at the top; no essentials dropdown exists.
7. Supported essential fields appear inline even when empty.
8. Unsupported empty fields are omitted.
9. `Add notes/tags/custom fields/cover/link` actions appear when those sections are empty.
10. Tapping an add-action reveals that section inline.
11. Existing notes/tags/custom fields/cover/link start visible automatically.
12. Chevron visibility matches actual navigation capability in list and grid surfaces.

## Assumptions And Defaults

- “Essential” means title plus supported tracking controls, and none of these may be hidden behind a collapsible.
- Progressive disclosure is reserved for secondary metadata, not core editing.
- Users need additive complexity, so empty advanced sections should be discoverable through explicit add-actions rather than hidden entirely.
- Scope remains limited to non-detail entry settings plus row interaction behavior.
