import type { Metadata } from 'next';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { PublicScripts } from '@/components/layout/PublicScripts';
import { PublicStylesheets } from '@/components/layout/PublicStylesheets';
import { HomePageContent } from './HomePageContent';

/**
 * `/` — ported from `index.blade.php` (`HomeController@index`). See
 * `HomePageContent.tsx` for the full body content and its dead-code /
 * live-duplicate-section documentation. This file and `home/page.tsx`
 * both render the same `HomePageContent`, matching source's own duplicate
 * `index`/`home` routes (docs/M3-APPLICATION-MAPPING.md rows #1/#2).
 *
 * GTM (Google Tag Manager, GTM-M7TG8NJ7) and the MedicalOrganization/
 * WebSite JSON-LD block are NOT ported this phase — both are genuinely
 * live in source, but wiring a real GTM container / structured-data
 * script is analytics/SEO infrastructure, not visual UI; deferred
 * consistently with this milestone's "no new features/infrastructure"
 * boundary. Flagged here rather than silently dropped.
 */
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
    <>
      <PublicStylesheets />
      {/* Page-specific extra stylesheet: bxSlider CSS (CDN, matching
          index.blade.php:19's exact cdnjs URL — not bundled locally in
          source either). Positioned same as PublicStylesheets' own scope
          note: "uncommon" extras are each page's own responsibility. */}
      <link
        rel="stylesheet"
        type="text/css"
        href="https://cdnjs.cloudflare.com/ajax/libs/bxslider/4.2.5/jquery.bxslider.css"
      />
      <PublicHeader />
      <HomePageContent />
      <PublicFooter />
      <PublicScripts />
      {/* bxSlider JS (CDN) + its init script — page-specific, not in
          LegacyScriptRunner's fixed list, added after the shared scripts
          exactly as source appends its own extra <script> tags after the
          same shared block (index.blade.php:833-842). Init options copied
          verbatim from source: auto/autoControls/stopAutoOnClick/pager,
          nothing added or removed. Relies on the same hydration-delay
          mechanism LegacyScriptRunner already establishes for jQuery's
          availability — see that file for why scripts execute after
          React hydration, not before. */}
      <script src="https://cdnjs.cloudflare.com/ajax/libs/bxslider/4.2.5/jquery.bxslider.min.js"></script>
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){function init(){if(window.jQuery&&window.jQuery.fn.bxSlider){window.jQuery('.bxslider').bxSlider({auto:true,autoControls:true,stopAutoOnClick:false,pager:true});}else{setTimeout(init,50);}}init();})();`,
        }}
      />
    </>
  );
}
