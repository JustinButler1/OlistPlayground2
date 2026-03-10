import type { ListAddonId, ListConfig, ListFieldKind } from '@/data/mock-lists';

export const LIST_ADDON_OPTIONS: Array<{
  id: ListAddonId;
  label: string;
  description: string;
}> = [
  { id: 'status', label: 'Status', description: 'Planned, active, completed, dropped.' },
  { id: 'progress', label: 'Progress', description: 'Track numbers like 3/12 or 45%.' },
  { id: 'rating', label: 'Rating', description: 'Score items directly in the list.' },
  { id: 'tags', label: 'Tags', description: 'Flexible labels for filtering and grouping later.' },
  { id: 'notes', label: 'Notes', description: 'Per-item notes and context.' },
  { id: 'reminders', label: 'Reminders', description: 'Schedule local reminders on entries.' },
  { id: 'cover', label: 'Custom Cover', description: 'Attach your own image to entries.' },
  { id: 'links', label: 'Links', description: 'Useful for sources, stores, and references.' },
  {
    id: 'custom-fields',
    label: 'Custom Fields',
    description: 'Define your own metadata fields.',
  },
  { id: 'sublists', label: 'Sublists', description: 'Nest lists inside other lists.' },
  {
    id: 'compare',
    label: 'Compare View',
    description: 'Compare custom fields side by side.',
  },
  { id: 'tier', label: 'Tier View', description: 'Treat sublists as ordered tiers.' },
];

export const LIST_ENTRY_TYPE_OPTIONS: Array<{
  value: ListConfig['defaultEntryType'];
  label: string;
}> = [
  { value: 'custom', label: 'Custom' },
  { value: 'book', label: 'Book' },
  { value: 'anime', label: 'Anime' },
  { value: 'manga', label: 'Manga' },
  { value: 'movie', label: 'Movie' },
  { value: 'tv', label: 'TV' },
  { value: 'link', label: 'Link' },
];

export const LIST_FIELD_KIND_OPTIONS: Array<{ value: ListFieldKind; label: string }> = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'url', label: 'URL' },
];

export function getListEntryTypeLabel(value: ListConfig['defaultEntryType']): string {
  return LIST_ENTRY_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function getListFieldKindLabel(value: ListFieldKind): string {
  return LIST_FIELD_KIND_OPTIONS.find((option) => option.value === value)?.label ?? value;
}
