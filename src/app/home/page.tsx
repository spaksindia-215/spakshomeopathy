import type { Metadata } from 'next';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { PublicScripts } from '@/components/layout/PublicScripts';
import { PublicStylesheets } from '@/components/layout/PublicStylesheets';
import { HomePageContent } from '../HomePageContent';

/**
 * `/home` — ported from `index.blade.php` (`HomeController@home`).
 * Renders the SAME content as `/` (`src/app/page.tsx`) — see that file's
 * and `HomePageContent.tsx`'s doc comments for the full explanation of
 * why (source renders the identical `index` view at both routes).
 */
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
