interface JikanTitle {
  type?: string | null;
  title?: string | null;
}

interface JikanTitledItem {
  title?: string | null;
  title_english?: string | null;
  titles?: JikanTitle[];
}

export function getPreferredJikanTitle(item: JikanTitledItem): string {
  const englishTitle =
    item.title_english?.trim() ||
    item.titles?.find((title) => title.type?.toLowerCase() === 'english')?.title?.trim();

  return englishTitle || item.title?.trim() || 'Untitled';
}
