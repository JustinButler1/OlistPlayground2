import { useMemo } from 'react';

import { useAccountSnapshots } from '@/hooks/use-account-snapshots';
import { buildExplorePublicListSections } from '@/lib/explore-public-lists';

export function useExplorePublicLists() {
  const accountSnapshots = useAccountSnapshots();

  return useMemo(() => {
    const sections = buildExplorePublicListSections(accountSnapshots);

    return {
      sections,
      items: sections.flatMap((section) => section.items),
    };
  }, [accountSnapshots]);
}
