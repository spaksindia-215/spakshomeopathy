import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { HerbsShell } from '@/components/herbs/HerbsShell';
import { HERB_ARTICLES } from '@/lib/herbs/data/content';
import { getMergedHerbCatalog } from '@/lib/herbs/catalog';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return HERB_ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = HERB_ARTICLES.find((a) => a.slug === slug);
  if (!article) return { title: 'Article Not Found | Spaks Herbs' };
  return {
    title: `${article.title} | Spaks Herbs`,
    description: article.excerpt,
    alternates: { canonical: `/herbs/learn/${article.slug}` },
  };
}

/** ISR — see `@/lib/herbs/catalog`'s "STATIC GENERATION CAVEAT" for why
 * this exists once a real database is configured. */
export const revalidate = 60;

/**
 * `/herbs/learn/[slug]` — herbal education article page (§23 of the
 * original brief). Placeholder content only; no CMS/blog backend wired
 * yet, per that section's fallback instruction.
 */
export default async function HerbsLearnArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = HERB_ARTICLES.find((a) => a.slug === slug);
  if (!article) notFound();

  const catalog = await getMergedHerbCatalog();

  return (
    <HerbsShell catalog={catalog}>
      <main>
        <section className="hs-breadcrumb">
          <div className="container">
            <ol>
              <li>
                <Link href="/herbs">Home</Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page">{article.title}</li>
            </ol>
          </div>
        </section>
        <section className="hs-section hs-section--tight">
          <div className="container" style={{ maxWidth: 720 }}>
            <span className="hs-article-card__cat">{article.category}</span>
            <h1 className="hs-pdp__title" style={{ marginTop: 8 }}>
              {article.title}
            </h1>
            <p style={{ color: 'var(--herb-ink-soft)', fontSize: 13 }}>{article.readTime}</p>
            <p style={{ fontSize: 15.5, lineHeight: 1.7, marginTop: 18 }}>{article.excerpt}</p>
            <p
              style={{
                fontSize: 14.5,
                lineHeight: 1.7,
                color: 'var(--herb-ink-soft)',
                marginTop: 14,
              }}
            >
              Full article content for this guide is coming soon. This page is a placeholder
              structured to connect to a CMS or database-backed article later, without changing its
              route or layout.
            </p>
          </div>
        </section>
      </main>
    </HerbsShell>
  );
}
