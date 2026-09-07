import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { HomeopathyShell } from '@/components/homeopathy/HomeopathyShell';
import { HomeopathyProductDetail } from '@/components/homeopathy/HomeopathyProductDetail';
import { HomeopathyProductCard } from '@/components/homeopathy/HomeopathyProductCard';
import { AddToCartForm } from '@/components/interactive/AddToCartForm';
import { getAllProducts, getProductBySlug } from '@/lib/demo/products';
import { getRelatedHomeopathyProducts, getShortDescription } from '@/lib/homeopathy/queries';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllProducts()
    .filter((p) => p.pSlug)
    .map((p) => ({ slug: p.pSlug as string }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) return { title: 'Product Not Found | Spaks Homeopathy' };
  const name = product.pName || product.pHeading;
  const description = getShortDescription(product, 160);
  return {
    title: `${name} | Spaks Homeopathy`,
    description,
    alternates: { canonical: `/homeopathy/product/${product.pSlug}` },
    openGraph: {
      title: name,
      description,
      url: `/homeopathy/product/${product.pSlug}`,
      type: 'website',
    },
  };
}

/**
 * `/homeopathy/product/[slug]` — product detail page. Includes Product +
 * BreadcrumbList JSON-LD structured data, scoped to this route only.
 * Recreated from the Herbs Store's `/herbs/product/[slug]` page pattern,
 * over the real `Product` data (`getProductBySlug`) — no parallel schema.
 */
export default async function HomeopathyProductPage({ params }: Props) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) notFound();

  const related = getRelatedHomeopathyProducts(product, 4);
  const name = product.pName || product.pHeading;
  // Built HERE, server-side — see HomeopathyProductDetail's `addToCartSlot`/
  // `relatedCardsById` doc comments for why (AddToCartForm needs a real
  // server render for its CSRF token; this page's body is 'use client').
  const addToCartSlot = <AddToCartForm product={product} />;
  const relatedCardsById = new Map(
    related.map((p) => [p.legacyId, <HomeopathyProductCard key={p.legacyId} product={p} />])
  );

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description: getShortDescription(product, 300),
    sku: String(product.legacyId),
    category: product.pHeading,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'INR',
      price: product.pPrice ?? 0,
      availability:
        product.pStatus === 1 && (product.pQuantity ?? 0) > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
    },
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Homeopathy', item: '/homeopathy' },
      { '@type': 'ListItem', position: 2, name: 'All Medicines', item: '/homeopathy/products' },
      {
        '@type': 'ListItem',
        position: 3,
        name,
        item: `/homeopathy/product/${product.pSlug}`,
      },
    ],
  };

  return (
    <HomeopathyShell>
      <main>
        <HomeopathyProductDetail
          product={product}
          related={related}
          addToCartSlot={addToCartSlot}
          relatedCardsById={relatedCardsById}
        />
      </main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
    </HomeopathyShell>
  );
}
