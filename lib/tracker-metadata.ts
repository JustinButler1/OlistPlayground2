import {
  getItemUserDataKey,
  type EntryProgress,
  type EntryProgressUnit,
  type ItemUserData,
  type ListEntry,
} from '@/data/mock-lists';

const RATING_STEP = 0.25;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function normalizeRating(value: number | null | undefined): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return undefined;
  }

  let normalized = value;
  if (normalized > 10) {
    normalized = normalized / 20;
  } else if (normalized > 5) {
    normalized = normalized / 2;
  }

  return clamp(Math.round(normalized / RATING_STEP) * RATING_STEP, RATING_STEP, 5);
}

export function formatRatingValue(value: number): string {
  if (Number.isInteger(value)) {
    return String(value);
  }

  if (Math.abs(value * 2 - Math.round(value * 2)) < 0.0001) {
    return value.toFixed(1);
  }

  return value.toFixed(2).replace(/0$/, '');
}

export function getEntryItemKey(entry: Pick<ListEntry, 'sourceRef'>): string | null {
  if (!entry.sourceRef.externalId) {
    return null;
  }

  return getItemUserDataKey(entry.sourceRef.source, entry.sourceRef.externalId);
}

export function getEffectiveEntryRating(
  entry: ListEntry,
  itemUserDataByKey?: Record<string, ItemUserData>
): number | undefined {
  const itemKey = getEntryItemKey(entry);
  const itemRating =
    itemKey && itemUserDataByKey ? itemUserDataByKey[itemKey]?.rating : undefined;

  return normalizeRating(itemRating ?? entry.rating);
}

export function getEffectiveEntryProgress(
  entry: ListEntry,
  itemUserDataByKey?: Record<string, ItemUserData>
): EntryProgress | undefined {
  const itemKey = getEntryItemKey(entry);
  const itemProgress =
    itemKey && itemUserDataByKey ? itemUserDataByKey[itemKey]?.progress : undefined;

  return itemProgress ?? entry.progress;
}

export function normalizeProgress(
  value: Partial<EntryProgress> | null | undefined
): EntryProgress | undefined {
  if (!value) {
    return undefined;
  }

  const current =
    typeof value.current === 'number' && Number.isFinite(value.current)
      ? Math.max(0, Math.round(value.current))
      : undefined;
  const total =
    typeof value.total === 'number' && Number.isFinite(value.total) && value.total > 0
      ? Math.round(value.total)
      : undefined;
  const unit = isEntryProgressUnit(value.unit) ? value.unit : 'item';

  if (current === undefined && total === undefined) {
    return undefined;
  }

  const clampedCurrent =
    current !== undefined ? clamp(current, 0, total ?? Number.MAX_SAFE_INTEGER) : undefined;

  return {
    current: clampedCurrent,
    total,
    unit,
    label: typeof value.label === 'string' ? value.label.trim() || undefined : undefined,
    updatedAt:
      typeof value.updatedAt === 'number' && Number.isFinite(value.updatedAt)
        ? value.updatedAt
        : Date.now(),
  };
}

export function getProgressUnitLabel(
  unit: EntryProgressUnit,
  mode: 'short' | 'long' = 'short',
  customLabel?: string
): string {
  if (customLabel?.trim()) {
    return mode === 'short' ? customLabel.trim().toLowerCase() : customLabel.trim();
  }

  if (mode === 'long') {
    switch (unit) {
      case 'episode':
        return 'Episodes';
      case 'chapter':
        return 'Chapters';
      case 'volume':
        return 'Volumes';
      case 'percent':
        return 'Percent';
      case 'item':
      default:
        return 'Items';
    }
  }

  switch (unit) {
    case 'episode':
      return 'ep';
    case 'chapter':
      return 'ch';
    case 'volume':
      return 'vol';
    case 'percent':
      return '%';
    case 'item':
    default:
      return 'item';
  }
}

export function formatProgressLabel(progress?: EntryProgress): string | null {
  if (!progress) {
    return null;
  }

  const currentLabel = progress.current === undefined ? '-' : String(progress.current);
  if (progress.unit === 'percent') {
    return `${currentLabel}%`;
  }

  if (progress.total !== undefined) {
    return `${currentLabel}/${progress.total} ${getProgressUnitLabel(
      progress.unit,
      'short',
      progress.label
    )}`;
  }

  if (progress.current !== undefined) {
    return `${progress.current} ${getProgressUnitLabel(progress.unit, 'short', progress.label)}`;
  }

  return null;
}

function isEntryProgressUnit(value: unknown): value is EntryProgressUnit {
  return (
    value === 'episode' ||
    value === 'chapter' ||
    value === 'volume' ||
    value === 'item' ||
    value === 'percent'
  );
}
