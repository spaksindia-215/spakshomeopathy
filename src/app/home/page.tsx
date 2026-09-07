import type { Metadata } from 'next';
import { Lato, Source_Sans_3 } from 'next/font/google';
import { RedesignedHome } from '../redesign/RedesignedHome';

/**
 * `/home` — renders the SAME content as `/` (`src/app/page.tsx`), exactly
 * as it did before the 2026-09-07 swap (source's own duplicate `index`/
 * `home` routes both rendered the same view — see `page.tsx`'s doc
 * comment for the full swap history). Only the CONTENT changed (legacy
 * `HomePageContent` → `RedesignedHome`, now living at `/redesign`
 * instead) — the "both routes render the same thing" relationship is
 * unchanged.
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
  alternates: {
    canonical: 'https://www.spakshomeopathy.com/',
  },
  other: {
    'msapplication-TileColor': '#ffffff',
    'theme-color': '#ffffff',
  },
};

export default function HomeAliasPage() {
  return (
    <div className={`${lato.variable} ${sourceSansPro.variable}`}>
      <RedesignedHome />
    </div>
  );
}
