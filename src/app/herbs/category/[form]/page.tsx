import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { HerbsShell } from '@/components/herbs/HerbsShell';
import { HerbCatalog } from '@/components/herbs/HerbCatalog';
import { HERB_FORM_CATEGORIES } from '@/lib/herbs/data/taxonomy';
import type { HerbForm } from '@/lib/herbs/types';
import { getMergedHerbCatalog } from '@/lib/herbs/catalog';

interface Props {
  params: Promise<{ form: string }>;
}

function findCategory(form: string) {
  return HERB_FORM_CATEGORIES.find((c) => c.form === form);
}

export async function generateStaticParams() {
  return HERB_FORM_CATEGORIES.map((c) => ({ form: c.form }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { form } = await params;
  const category = findCategory(form);
  if (!category) return { title: 'Category Not Found | Spaks Herbs' };
  return {
    title: `${category.label} | Spaks Herbs`,
    description: `Shop ${category.label.toLowerCase()} — ${category.description.toLowerCase()}.`,
    alternates: { canonical: `/herbs/category/${category.form}` },
  };
}

/** ISR — see `@/lib/herbs/catalog`'s "STATIC GENERATION CAVEAT" for why
 * this exists once a real database is configured. */
export const revalidate = 60;

/** `/herbs/category/[form]` — "Shop by Herb Form" listing page (§8, §20). */
export default async function HerbCategoryPage({ params }: Props) {
  const { form } = await params;
  const category = findCategory(form);
  if (!category) notFound();

  const catalog = await getMergedHerbCatalog();

  return (
    <HerbsShell catalog={catalog}>
      <main>
        <HerbCatalog
          title={category.label}
          subtitle={category.description}
          initialForm={category.form as HerbForm}
          lockedFilter="form"
          catalog={catalog}
        />
      </main>
    </HerbsShell>
  );
}
