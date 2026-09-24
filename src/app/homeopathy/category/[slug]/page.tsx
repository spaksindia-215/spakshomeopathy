import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { HomeopathyShell } from '@/components/homeopathy/HomeopathyShell';
import { HomeopathyCatalog } from '@/components/homeopathy/HomeopathyCatalog';
import { getCategoriesByType, getCategoryBySlug } from '@/lib/demo/categories';
import { getProductsByCategoryLive } from '@/lib/homeopathy/liveQueries';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getCategoriesByType('N', 1)
    .filter((c) => c.slug)
    .map((c) => ({ slug: c.slug as string }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);
  if (!category || category.type !== 'N') return { title: 'Category Not Found | Spaks Homeopathy' };
  return {
    title: `${category.name} Medicines | Spaks Homeopathy`,
    description: `Shop homeopathic medicines for ${category.name?.toLowerCase()}.`,
    alternates: { canonical: `/homeopathy/category/${category.slug}` },
  };
}

/**
 * `/homeopathy/category/[slug]` — products filtered by one real disease/
 * medicine category. Resolves the route's `slug` to a real `Category`
 * row (`type: 'N'`), then its `legacyId` against `product.pCat` via
 * `getProductsByCategoryLive()`, which reads the full `products`
 * collection in MongoDB (397 rows) rather than the 125-row curated demo
 * fixture — recreating the Herbs Store's `/herbs/category/[form]` page
 * pattern over the complete catalogue.
 *
 * Uses the same `HomeopathyCatalog` filter+grid as `/homeopathy/products`
 * (category locked via `lockedCategoryId`) so this page gets the same
 * "Condition" filter group (`pHeading`, see `groupProductsByDisease`) that
 * lets a shopper narrow straight to a disease within the category, in
 * addition to price/rating/stock — not a separate tile-browsing page.
 */
export default async function HomeopathyCategoryPage({ params }: Props) {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);
  if (!category || category.type !== 'N' || category.status !== 1) notFound();

  const products = await getProductsByCategoryLive(category.legacyId, 1);

  return (
    <HomeopathyShell>
      <main>
        <HomeopathyCatalog
          title={`${category.name} Medicines`}
          subtitle={`Homeopathic remedies for ${category.name?.toLowerCase()}`}
          products={products}
          lockedCategoryId={category.legacyId}
        />
      </main>
    </HomeopathyShell>
  );
}
