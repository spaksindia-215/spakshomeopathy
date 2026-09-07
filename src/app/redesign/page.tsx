import type { Metadata } from 'next';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { PublicScripts } from '@/components/layout/PublicScripts';
import { PublicStylesheets } from '@/components/layout/PublicStylesheets';
import { HomePageContent } from '../HomePageContent';

/**
 * `/redesign` — the legacy `index.blade.php`-ported homepage
 * (`HomePageContent`), MOVED HERE from `/` and `/home` in the
 * 2026-09-07 swap (owner request: "replace localhost:3000/home with
 * localhost:3000/redesign... just swap"). This is the exact same
 * production-verified content and markup that used to live at those two
 * routes — nothing was deleted or rewritten, only relocated. See
 * `src/app/page.tsx`'s doc comment for the fuller history: the
 * from-scratch redesign (`RedesignedHome`, previously only previewed
 * here) is now the real homepage at `/` and `/home`.
 *
 * noindex: this route is no longer the canonical homepage — kept
 * reachable as an internal reference/archive of the migration-verified
 * legacy homepage, not meant to compete with `/`'s SEO surface. Mirrors
 * the same `noindex` posture this route's PREVIOUS occupant
 * (`RedesignedHome`, a preview at the time) used before the swap.
 */
export const metadata: Metadata = {
  title: 'Legacy Homepage (Archived) | Spaks Homeopathy',
  description:
    'Archived copy of the previous Spaks Homeopathy homepage, kept for reference after the 2026-09-07 homepage redesign.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function LegacyHomeArchivePage() {
  return (
    <>
      <PublicStylesheets />
      <link
        rel="stylesheet"
        type="text/css"
        href="https://cdnjs.cloudflare.com/ajax/libs/bxslider/4.2.5/jquery.bxslider.css"
      />
      <PublicHeader />
      <HomePageContent />
      <PublicFooter />
      <PublicScripts />
      <script src="https://cdnjs.cloudflare.com/ajax/libs/bxslider/4.2.5/jquery.bxslider.min.js"></script>
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){function init(){if(window.jQuery&&window.jQuery.fn.bxSlider){window.jQuery('.bxslider').bxSlider({auto:true,autoControls:true,stopAutoOnClick:false,pager:true});}else{setTimeout(init,50);}}init();})();`,
        }}
      />
    </>
  );
}
