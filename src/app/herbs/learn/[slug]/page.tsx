import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { HerbsShell } from '@/components/herbs/HerbsShell';
import { HERB_ARTICLES } from '@/lib/herbs/data/content';
import { getMergedHerbCatalog } from '@/lib/herbs/catalog';
import { getDb } from '@/lib/mongodb/client';
import { HerbArticleRepository } from '@/lib/herbArticles/repository';

interface Props {
  params: Promise<{ slug: string }>;
}

/** Herbs Learn CRUD feature: looks up the DB first (admin-added
 * articles), falling back to the original hardcoded `HERB_ARTICLES` entry
 * for slugs that were never migrated into the database — so existing
 * links to the 3 original placeholder articles keep working. */
async function findArticle(slug: string) {
  const db = await getDb();
  const dbArticle = await new HerbArticleRepository(db).findBySlug(slug);
  if (dbArticle && dbArticle.status === 1) {
    return {
      title: dbArticle.title,
      slug: dbArticle.slug,
      excerpt: dbArticle.excerpt,
      readTime: dbArticle.readTime,
      category: dbArticle.category,
    };
  }
  return HERB_ARTICLES.find((a) => a.slug === slug) ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await findArticle(slug);
  if (!article) return { title: 'Article Not Found | Spaks Herbs' };
  return {
    title: `${article.title} | Spaks Herbs`,
    description: article.excerpt,
    alternates: { canonical: `/herbs/learn/${article.slug}` },
  };
}

/** ISR — see `@/lib/herbs/catalog`'s "STATIC GENERATION CAVEAT" for why
 * this exists once a real database is configured. No longer statically
 * generated (`generateStaticParams` removed, Herbs Learn CRUD feature) —
 * article slugs are now admin-managed and can be added without a
 * rebuild, so this route is rendered on demand instead. */
export const revalidate = 60;

/**
 * `/herbs/learn/[slug]` — herbal education article page (§23 of the
 * original brief). Metadata (title/slug/excerpt/readTime/category) is now
 * admin-managed via `/admin/add-herb-article`/`herb-articles-list` — see
 * `src/lib/herbArticles/schema.ts`'s header. The body content below this
 * point is UNCHANGED ("full article content coming soon" placeholder) —
 * that field was deliberately not added to this feature's scope.
 */
export default async function HerbsLearnArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = await findArticle(slug);
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
