import type { Metadata } from 'next';
import { Lato, Source_Sans_3 } from 'next/font/google';
import { RedesignedHome } from './redesign/RedesignedHome';

/**
 * `/` — the site's real homepage.
 *
 * SWAPPED (owner request, 2026-09-07): this route used to render the
 * legacy `index.blade.php`-ported `HomePageContent` (MIGRATION-CONTRACT.md
 * IR-1 governed it). That content has NOT been deleted — it now lives at
 * `/redesign` (see that route's page.tsx for the full rationale). This
 * route and `/home` (`src/app/home/page.tsx`) now both render
 * `RedesignedHome`, the from-scratch homepage design that was previously
 * only previewed at `/redesign` — see `RedesignedHome.tsx`'s own doc
 * comment for the swap's full history.
 *
 * Metadata below is the SAME real, production-verified SEO copy the
 * legacy `/` route used (title/description/keywords/OG/Twitter) — carried
 * over rather than reinvented, since this is still the same business's
 * real homepage, just a new visual design. `robots`/`noindex` is
 * deliberately NOT set here (unlike `/redesign`'s preview-era metadata):
 * this is now the canonical, indexable homepage.
 */
const lato = Lato({
  subsets: ['latin'],
  weight: ['400', '700', '900'],
  style: ['normal', 'italic'],
  variable: '--font-lato',
  display: 'swap',
});

const sourceSansPro = Source_Sans_3({
  subsets: ['latin'],
  weight: ['400', '600', '700', '900'],
  variable: '--font-source-sans-pro',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Homeopathy Clinic in Delhi | Dr. S.K. Meena | Spaks Homeopathy',
  description:
    'Spaks Homeopathy Clinic in Delhi offers expert consultation by Dr. S.K. Meena. Get online homeopathic consultation and personalized homeopathic medicines across India.',
  keywords: [
    'Homeopathy Clinic in Delhi',
    'nearby homeopathy clinic',
    'homeopathy near me',
    'Homeopathy Doctor in Delhi',
    'Best Homeopathy Clinic in Delhi NCR',
    'Online Homeopathy Consultation',
    'Buy Homeopathic Medicines Online',
    'Homeopathy Clinic in South Delhi',
    'Homeopathy Doctor in Badarpur',
  ],
  alternates: {
    canonical: 'https://www.spakshomeopathy.com/',
  },
  openGraph: {
    title: 'Homeopathy Clinic in Delhi | Dr. S.K. Meena | Spaks Homeopathy',
    description:
      'Spaks Homeopathy Clinic in Delhi offers expert consultation by Dr. S.K. Meena. Get online homeopathic consultation and personalized homeopathic medicines across India.',
    url: 'https://www.spakshomeopathy.com/',
    type: 'website',
    siteName: 'Spaks Homeopathy',
    images: [{ url: 'https://www.spakshomeopathy.com/assets/images/banner3.jpg' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Homeopathy Clinic in Delhi | Dr. S.K. Meena | Spaks Homeopathy',
    description:
      'Spaks Homeopathy Clinic in Delhi offers expert consultation by Dr. S.K. Meena. Get online homeopathic consultation and personalized homeopathic medicines across India.',
    images: ['https://www.spakshomeopathy.com/assets/images/banner3.jpg'],
  },
  other: {
    'msapplication-TileColor': '#ffffff',
    'theme-color': '#ffffff',
  },
};

export default function HomePage() {
  return (
    <div className={`${lato.variable} ${sourceSansPro.variable}`}>
      <RedesignedHome />
    </div>
  );
}
