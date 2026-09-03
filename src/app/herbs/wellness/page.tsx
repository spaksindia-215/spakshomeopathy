import type { Metadata } from 'next';
import { HerbsShell } from '@/components/herbs/HerbsShell';
import { WellnessCategoryGrid } from '@/components/herbs/HerbCategoryGrid';
import { getMergedHerbCatalog } from '@/lib/herbs/catalog';

export const metadata: Metadata = {
  title: 'Shop by Wellness | Spaks Herbs',
  description:
    'Browse herbs by everyday wellness focus area — hair care, digestion, immunity, joint care and more.',
  alternates: { canonical: '/herbs/wellness' },
};

/** ISR — see `@/lib/herbs/catalog`'s "STATIC GENERATION CAVEAT" for why
 * this exists once a real database is configured. */
export const revalidate = 60;

/** `/herbs/wellness` — full wellness-category index (§9, §20). */
export default async function HerbsWellnessIndexPage() {
  const catalog = await getMergedHerbCatalog();
  return (
    <HerbsShell catalog={catalog}>
      <main>
        <section className="hs-section hs-section--tight">
          <div className="container">
            <div className="hs-section__head">
              <div>
                <h1 className="hs-section__title">Shop by Wellness</h1>
                <p className="hs-section__subtitle">
                  Explore herbs traditionally associated with everyday wellness routines.
                </p>
              </div>
            </div>
            <WellnessCategoryGrid />
          </div>
        </section>
      </main>
    </HerbsShell>
  );
}
