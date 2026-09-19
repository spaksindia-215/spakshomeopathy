import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { HerbsShell } from '@/components/herbs/HerbsShell';
import { HerbCatalog } from '@/components/herbs/HerbCatalog';
import { WELLNESS_CATEGORIES } from '@/lib/herbs/data/taxonomy';
import type { WellnessCategory } from '@/lib/herbs/types';
import { getMergedHerbCatalog } from '@/lib/herbs/catalog';
import { isHerbsDbConfigured, readWellnessCategoriesFromDb } from '@/lib/herbs/db';

interface Props {
  params: Promise<{ category: string }>;
}

/** DB-first (when configured), falling back to the static constant — same
 * "degrade gracefully" posture every other Herbs Store DB read uses
 * (CR-006 Phase 6). A category added only in the database (not in the
 * static seed list) still resolves correctly here even though it wasn't
 * enumerated by `generateStaticParams` below, since Next.js renders
 * unlisted dynamic params on demand by default. */
async function findCategory(key: string) {
  const dbConfigured = isHerbsDbConfigured();
  if (dbConfigured) {
    const dbWellness = await readWellnessCategoriesFromDb();
    const found = dbWellness?.find((c) => c.key === key && c.status === 'active');
    if (found) return found;
  }
  return WELLNESS_CATEGORIES.find((c) => c.key === key);
}

export async function generateStaticParams() {
  return WELLNESS_CATEGORIES.map((c) => ({ category: c.key }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const found = await findCategory(category);
  if (!found) return { title: 'Wellness Category Not Found | Spaks Herbs' };
  return {
    title: `${found.label} Herbs | Spaks Herbs`,
    description: `${found.description}. Shop herbs traditionally associated with ${found.label.toLowerCase()}.`,
    alternates: { canonical: `/herbs/wellness/${found.key}` },
  };
}

/** ISR — see `@/lib/herbs/catalog`'s "STATIC GENERATION CAVEAT" for why
 * this exists once a real database is configured. */
export const revalidate = 60;

/** `/herbs/wellness/[category]` — "Shop by Wellness" listing page (§9, §20). */
export default async function HerbsWellnessCategoryPage({ params }: Props) {
  const { category } = await params;
  const found = await findCategory(category);
  if (!found) notFound();

  const catalog = await getMergedHerbCatalog();

  return (
    <HerbsShell catalog={catalog}>
      <main>
        <HerbCatalog
          title={`${found.label} Herbs`}
          subtitle={found.description}
          initialWellness={found.key as WellnessCategory}
          lockedFilter="wellness"
          catalog={catalog}
        />
      </main>
    </HerbsShell>
  );
}
