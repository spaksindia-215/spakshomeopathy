import type { Metadata } from 'next';
import { HerbsShell } from '@/components/herbs/HerbsShell';
import { HerbCatalog } from '@/components/herbs/HerbCatalog';
import { getMergedHerbCatalog } from '@/lib/herbs/catalog';

interface Props {
  searchParams: Promise<{ q?: string }>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams;
  return {
    title: q ? `Search: ${q} | Spaks Herbs` : 'Search Herbs | Spaks Herbs',
    robots: { index: false, follow: true },
  };
}

/** `/herbs/search?q=...` — search results page (§14). */
export default async function HerbsSearchPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const query = q?.trim() ?? '';
  const catalog = await getMergedHerbCatalog();

  return (
    <HerbsShell catalog={catalog}>
      <main>
        <HerbCatalog
          title={query ? `Search Results for “${query}”` : 'Search Herbs'}
          subtitle={
            query ? undefined : 'Enter a search term above to find herbs by name, category or tag.'
          }
          initialQuery={query}
          catalog={catalog}
        />
      </main>
    </HerbsShell>
  );
}
