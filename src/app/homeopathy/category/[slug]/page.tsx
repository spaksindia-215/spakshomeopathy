import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { HomeopathyShell } from '@/components/homeopathy/HomeopathyShell';
import { HomeopathyCatalog } from '@/components/homeopathy/HomeopathyCatalog';
import { HomeopathyProductCard } from '@/components/homeopathy/HomeopathyProductCard';
import { getCategoriesByType, getCategoryBySlug } from '@/lib/demo/categories';
import { getProductsByCategory } from '@/lib/demo/products';

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
 * row (`type: 'N'`), then its `legacyId` against `product.pCat` via the
 * real `getProductsByCategory()` accessor — recreating the Herbs Store's
 * `/herbs/category/[form]` page pattern.
 */
export default async function HomeopathyCategoryPage({ params }: Props) {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);
  if (!category || category.type !== 'N' || category.status !== 1) notFound();

  const products = getProductsByCategory(category.legacyId, 1);
  // Server-rendered here — see HomeopathyCatalog's `cardsById` doc comment.
  const cardsById = new Map(products.map((p) => [p.legacyId, <HomeopathyProductCard key={p.legacyId} product={p} />]));

  return (
    <HomeopathyShell>
      <main>
        <HomeopathyCatalog
          title={`${category.name} Medicines`}
          subtitle={`Homeopathic remedies for ${category.name?.toLowerCase()}`}
          products={products}
          cardsById={cardsById}
          lockedCategoryId={category.legacyId}
        />
      </main>
    </HomeopathyShell>
  );
}
