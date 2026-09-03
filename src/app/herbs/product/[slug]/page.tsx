import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { HerbsShell } from '@/components/herbs/HerbsShell';
import { HerbProductDetail } from '@/components/herbs/HerbProductDetail';
import { getAllHerbProducts, getHerbProductBySlug } from '@/lib/herbs/queries';
import { getLeadVariant } from '@/lib/herbs/types';
import { getMergedHerbCatalog } from '@/lib/herbs/catalog';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllHerbProducts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = getHerbProductBySlug(slug);
  if (!product) return { title: 'Product Not Found | Spaks Herbs' };
  return {
    title: product.metaTitle,
    description: product.metaDescription,
    alternates: { canonical: `/herbs/product/${product.slug}` },
    openGraph: {
      title: product.metaTitle,
      description: product.metaDescription,
      url: `/herbs/product/${product.slug}`,
      type: 'website',
    },
  };
}

/** ISR — see `@/lib/herbs/catalog`'s "STATIC GENERATION CAVEAT" for why
 * this exists once a real database is configured. */
export const revalidate = 60;

/**
 * `/herbs/product/[slug]` — Herbs Store product detail page (§12, §15,
 * §25, §29 of the original brief). Includes Product + BreadcrumbList
 * JSON-LD structured data, scoped to this route only (CR-003 §10.5 —
 * F-19/F-18 govern the *existing* pages' `<head>`, not this new route).
 */
export default async function HerbProductPage({ params }: Props) {
  const { slug } = await params;
  const catalog = await getMergedHerbCatalog();
  const product = getHerbProductBySlug(slug, catalog);
  if (!product) notFound();

  const lead = getLeadVariant(product);

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.shortDescription,
    sku: product.sku,
    category: product.categoryLabel,
    aggregateRating:
      product.reviewCount > 0
        ? {
            '@type': 'AggregateRating',
            ratingValue: product.rating,
            reviewCount: product.reviewCount,
          }
        : undefined,
    offers: lead
      ? {
          '@type': 'Offer',
          priceCurrency: 'INR',
          price: lead.price,
          availability:
            product.status === 'active' && product.stock > 0
              ? 'https://schema.org/InStock'
              : 'https://schema.org/OutOfStock',
        }
      : undefined,
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Herbs', item: '/herbs' },
      { '@type': 'ListItem', position: 2, name: 'All Herbs', item: '/herbs/products' },
      {
        '@type': 'ListItem',
        position: 3,
        name: product.categoryLabel,
        item: `/herbs/category/${product.form}`,
      },
      {
        '@type': 'ListItem',
        position: 4,
        name: product.name,
        item: `/herbs/product/${product.slug}`,
      },
    ],
  };

  return (
    <HerbsShell catalog={catalog}>
      <main>
        <HerbProductDetail product={product} catalog={catalog} />
      </main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
    </HerbsShell>
  );
}
