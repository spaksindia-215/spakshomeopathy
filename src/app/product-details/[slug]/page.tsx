import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { PublicStylesheets } from '@/components/layout/PublicStylesheets';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { StarRating } from '@/components/ui/StarRating';
import { AddToCartForm } from '@/components/interactive/AddToCartForm';
import { getProductBySlug, getCategoriesByType } from '@/lib/demo';
import { getProductBySlugLive } from '@/lib/homeopathy/liveQueries';
import { CategoryCard } from '@/components/cards/CategoryCard';
import type { VariantSlot } from '@/lib/mongodb/schemas';
import { HomeopathyVideoEmbed } from '@/components/homeopathy/HomeopathyMedia';
import { getProductRelatedVideo } from '@/lib/homeopathy/queries';

export const dynamicParams = true;
export const revalidate = 60;

/**
 * `/product-details/{slug}` — ported from `product-detail.blade.php`
 * (832 lines, the largest and most complex page in this migration
 * batch), `HomeController@ProductDetail` (`HomeController.php:300-313`).
 *
 * ============================================================================
 * DOES NOT USE `PublicScripts`/`LegacyScriptRunner` — A DELIBERATE,
 * DOCUMENTED EXCEPTION, NOT AN OVERSIGHT
 * ============================================================================
 * Every other page in this migration batch reuses `PublicScripts`
 * (the fixed 9-script list) verbatim. This page cannot: source's own
 * closing `<script>` list (verified, lines 639-651) inserts Fancybox
 * BETWEEN `jquery.js` and `bootstrap.bundle.min.js` (not appended after
 * the standard 9, unlike the homepage's bxSlider pattern), and interleaves
 * FOUR more page-specific scripts (`isotope.js`, `swiper.min.js`,
 * `nouislider.js`, `jquery.bootstrap-touchspin.js`) within that same list
 * — a genuinely different script ORDER, not an additive one.
 * `LegacyScriptRunner`'s own contract is a FIXED, ordered list; forcing
 * this page's different order through it would either violate that
 * component's contract or misrepresent this page's real script order.
 * This page instead loads its own script list, in the SAME real order
 * source uses, via the same "load after hydration" principle
 * `LegacyScriptRunner` established (plain `<script>` tags placed after
 * the JSX body — Next.js loads them in document order after the page's
 * own hydration), without forking or modifying that shared component.
 *
 * Also NOT ported: `jquery.bootstrap-touchspin.js` is loaded
 * (line 650) but VERIFIED never attached to any element anywhere in this
 * source file (no `touchspin`/`type="number"`/spinner markup exists) —
 * dead script inclusion in source itself. Not reproduced as a working
 * quantity control here, since building one would invent a UI feature the
 * deployed page doesn't actually have.
 *
 * ============================================================================
 * THE 10-VARIANT-SLOT STRUCTURE — F-20: DO NOT NORMALIZE
 * ============================================================================
 * Source repeats a near-identical `@if($getPData->p_imageN != '')` block
 * 9 times (slots 2-10) plus slot 1's own distinct markup (verified lines
 * 52-304). `schemas/product.ts`'s own header states plainly: "normalizing
 * the 83-column products table or its 10 inline variant slots is
 * FORBIDDEN" (F-20) — the underlying DATA remains 10 explicitly-named
 * fields (`slot2`...`slot10`), never restructured into an array. This
 * page ITERATES that fixed list only for DISPLAY convenience (a `.map()`
 * over 9 already-named fields is not a data-model change); the schema
 * itself is untouched.
 *
 * PRESERVED DEFECTS, all verified directly against source this session:
 *   - Slots 1-4 wrap their image in a Fancybox lightbox link
 *     (`data-fancybox="group"`); slots 5-10 do NOT (plain `<img>`, no
 *     link) — a real inconsistency in source, not this migration's.
 *   - The variant-selection JS (source lines 673-829, reproduced verbatim
 *     below as a plain inline script) has an off-by-typo bug: slot 7's
 *     selector reads `$("#imgi7")` (missing the "d" in "imgid7") — every
 *     OTHER slot correctly reads `$("#imgidN")`. This means selecting
 *     slot 7 fails to populate its hidden image field silently (no error,
 *     just a no-op `undefined.split` guard failure). Reproduced verbatim,
 *     not corrected.
 *   - "How to Use: Capsule" section (line 347) is 100% hardcoded static
 *     text ("1+1=2 Capsule Different colour morning and Evening before
 *     meal (Avoid Alcohol)."), identical for every product regardless of
 *     what the product actually is — reproduced as-is.
 *   - The static 5-star rating block — see `StarRating.tsx`'s own header.
 *   - `<title>Spakshomeopathy - Product details</title>` and breadcrumb
 *     "Kit details" — both literal, not derived from the product name.
 *
 * Source has NO NULL GUARD on a non-matching slug
 * (`$getPData->p_bestimg` etc. would fatal on a null `$getPData`) — this
 * demo uses `notFound()`, consistent with every other dynamic route in
 * this batch (see `diseases-details/[slug]/page.tsx`'s header for the
 * shared reasoning).
 */
export function generateMetadata(): Metadata {
  return {
    title: 'Spakshomeopathy - Product details',
    other: {
      'msapplication-TileColor': '#ffffff',
      'theme-color': '#ffffff',
    },
  };
}

const SLOT_KEYS = [
  'slot2',
  'slot3',
  'slot4',
  'slot5',
  'slot6',
  'slot7',
  'slot8',
  'slot9',
  'slot10',
] as const;

/** Slots 1-4 get a Fancybox lightbox link; slots 5-10 don't — see file header. */
const FANCYBOX_SLOT_INDEXES = new Set([2, 3, 4]);

export default async function ProductDetailsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = (await getProductBySlugLive(slug)) ?? getProductBySlug(slug);
  if (!product) notFound();

  const videoInfo = getProductRelatedVideo(product, {
    title: product.pName || product.pHeading,
    category: (product as { cosmeticType?: string })?.cosmeticType
      ? `${(product as { cosmeticType?: string }).cosmeticType} Skincare Face Wash Cosmetics`
      : undefined,
    searchTerms: product.searchTerms,
    sku: product.legacyId,
  });
  const diseaseCategories = getCategoriesByType('N', 1);

  return (
    <div className="page-wrapper">
      <PublicStylesheets />
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/@fancyapps/fancybox@3.5.7/dist/jquery.fancybox.min.css"
      />
      <PublicHeader />
      <Breadcrumb items={[{ label: 'Kit details' }]} />

      <section className="mt-5 mb-5 single-shop-page">
        <div className="container">
          <div className="row mb-5">
            <div className="col-lg-7 col-md-7 col-sm-7">
              <div className="wrap-left">
                <div className="row shadowbox">
                  {product.pBestimg !== null && product.pBestimg !== '' && (
                    <div className="producdgrid">
                      <div className="pickproduct">
                        <a
                          href={`/uploaded_files/products/${product.pBestimg}`}
                          data-fancybox="group"
                          data-caption=""
                        >
                          <img
                            id="imgid"
                            src={`/uploaded_files/products/${product.pBestimg}`}
                            alt={product.pName ?? ''}
                          />
                        </a>
                      </div>
                      <div className="priceandcheck">
                        <div className="service-list">
                          <input
                            type="checkbox"
                            name="pricecheckbox"
                            className="chk"
                            defaultChecked
                            id="1"
                            value={product.pPrice ?? 0}
                          />
                          <label htmlFor="1">
                            {' '}
                            <span>₹ {product.pPrice}</span>{' '}
                            {(product.pMrp ?? 0) > 0 && (
                              <del id="mrpID" className="mrpprice">
                                ₹ {product.pMrp}
                              </del>
                            )}
                          </label>
                        </div>
                        <div className="nameproduct">
                          <ul>
                            <li id="p_name_txt">
                              {(() => {
                                const parts = (product.pName ?? '').split('For');
                                return (
                                  <>
                                    {parts[0]}{' '}
                                    <span className="product-detailred">
                                      For {parts.slice(1).join('For')}
                                    </span>
                                  </>
                                );
                              })()}
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {SLOT_KEYS.map((key, i) => {
                    const slotIndex = i + 2; // slot2..slot10
                    const slot: VariantSlot = product[key];
                    if (!slot.pImage) return null;
                    const useFancybox = FANCYBOX_SLOT_INDEXES.has(slotIndex);
                    const imageSrc = `/uploaded_files/products/${slot.pImage}`;
                    const img = (
                      <img
                        id={`imgid${slotIndex}`}
                        src={imageSrc}
                        alt={slotIndex <= 4 ? (product.pName ?? '') : ''}
                      />
                    );
                    return (
                      <div className="producdgrid" key={key}>
                        <div className="pickproduct">
                          {useFancybox ? (
                            <a href={imageSrc} data-fancybox="group" data-caption="">
                              {img}
                            </a>
                          ) : (
                            img
                          )}
                        </div>
                        <div className="priceandcheck">
                          <div className="service-list">
                            <input
                              type="checkbox"
                              className="chk"
                              name="pricecheckbox"
                              value={slot.pPrice ?? 0}
                              id={String(slotIndex)}
                            />
                            <label htmlFor="1">
                              {' '}
                              <span>₹ {slot.pPrice}</span>{' '}
                              {(slot.pMrp ?? 0) > 0 && (
                                <del id="mrpID" className="mrpprice">
                                  ₹ {slot.pMrp}
                                </del>
                              )}
                            </label>
                          </div>
                          <div className="nameproduct">
                            <ul>
                              <li id={`p_name_txt${slotIndex}`}> {slot.pName}</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="col-lg-1 col-md-1 col-sm-1"> </div>

            <div className="col-lg-4 col-md-4 col-sm-4">
              <div className="text-box my-auto">
                <div className="content-box">
                  <h3>{product.pHeading}</h3>
                  <span>Availability: In stock</span>
                  <StarRating />
                  <p className="price">
                    <span id="saleID">₹ {product.pPrice}</span> &nbsp;&nbsp;
                  </p>
                  <hr />
                  <div className="use">
                    <h5>How to Use: Liquid</h5>
                    <p>{product.pDesc1}</p>
                    <h5>How to Use: Capsule</h5>
                    <p>
                      1+1=2 Capsule Different colour morning and Evening before meal (Avoid
                      Alcohol).
                    </p>
                  </div>
                </div>

                <AddToCartForm product={product} />
              </div>
            </div>
          </div>

          <div className="row">
            <div className="product-tab-box">
              <div className="tab-title">
                <ul className="nav nav-tabs tab-title" role="tablist">
                  <li className="nav-item">
                    <a
                      className="nav-link show active"
                      href="#description"
                      role="tab"
                      data-toggle="tab"
                      aria-selected="true"
                    >
                      Description
                    </a>
                  </li>
                  <li className="nav-item">
                    <a
                      className="nav-link show"
                      href="#faq"
                      role="tab"
                      data-toggle="tab"
                      aria-selected="false"
                    >
                      How to Use:
                    </a>
                  </li>
                </ul>
              </div>

              <div className="tab-content">
                <div
                  className="tab-pane show animated fadeInUp signle-tab-content active"
                  id="description"
                >
                  {/* source renders p_desc unescaped via {!! !!}, matching real Blade behavior */}
                  <div dangerouslySetInnerHTML={{ __html: product.pDesc ?? '' }} />
                  {videoInfo && (
                    <HomeopathyVideoEmbed
                      urlOrId={videoInfo.videoId}
                      title={videoInfo.title}
                      badgeLabel={videoInfo.isCustom ? 'Video Guide' : 'Related Medicine Video'}
                    />
                  )}
                </div>

                <div
                  className="tab-pane animated fadeInUp signle-tab-content faq-accrodion show"
                  id="faq"
                >
                  <h3 className="blog-details_title">How to Use</h3>
                  <div className="accrodion-grp faq-accrodion" data-grp-name="faq-accrodion">
                    <div className="accrodion">
                      <div className="accrodion-title">
                        <h4>{product.pName}</h4>
                      </div>
                      <div className="accrodion-content" style={{ display: 'none' }}>
                        <div className="inner">
                          <p>{product.pDesc1}</p>
                        </div>
                      </div>
                    </div>

                    {SLOT_KEYS.map((key, i) => {
                      const slotIndex = i + 2;
                      const slot: VariantSlot = product[key];
                      if (!slot.pDesc) return null;
                      const isLast = slotIndex === 10;
                      return (
                        <div
                          className={isLast ? 'accrodion active' : 'accrodion'}
                          key={`faq-${key}`}
                        >
                          <div className="accrodion-title">
                            <h4>{slot.pName}</h4>
                          </div>
                          <div
                            className="accrodion-content"
                            style={{ display: isLast ? 'block' : 'none' }}
                          >
                            <div className="inner">
                              <p>{slot.pDesc}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="recent-products thm-gray-bg-2 Diseases">
        <br />
        <br />
        <div className="container">
          <div className="block-title text-center">
            <h2 className="block-title__title">Diseases</h2>
          </div>
          <div className="recent-products__carousel owl-theme owl-carousel">
            {diseaseCategories.map((category) => (
              <CategoryCard category={category} key={category.legacyId} />
            ))}
          </div>
        </div>
      </section>

      <PublicFooter />

      {/* This page's own script list — see file header for why
          PublicScripts/LegacyScriptRunner isn't used here. Real source
          order (lines 639-651), verbatim. */}
      <script src="/assets/js/jquery.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/@fancyapps/fancybox@3.5.7/dist/jquery.fancybox.min.js"></script>
      <script src="/assets/js/bootstrap.bundle.min.js"></script>
      <script src="/assets/js/bootstrap-select.min.js"></script>
      <script src="/assets/js/owl.carousel.min.js"></script>
      <script src="/assets/js/jquery.magnific-popup.min.js"></script>
      <script src="/assets/js/isotope.js"></script>
      <script src="/assets/js/bootstrap-datepicker.min.js"></script>
      <script src="/assets/js/jquery.validate.min.js"></script>
      <script src="/assets/js/swiper.min.js"></script>
      <script src="/assets/js/nouislider.js"></script>
      <script src="/assets/js/jquery.bootstrap-touchspin.js"></script>
      <script src="/assets/js/theme.js"></script>

      {/* Fancybox init + variant-checkbox price/name/image sync —
          reproduced verbatim from source lines 653-829, INCLUDING the
          real slot-7 selector typo ($("#imgi7") instead of
          $("#imgid7")) documented in the file header. Wrapped in a
          $(document).ready-guarded IIFE exactly as source has it. */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
$(function(){
$('[data-fancybox]').fancybox({
  buttons: ['close'],
  wheel: false,
  transitionEffect: "slide",
  loop: true,
  toolbar: false,
  clickContent: false
});
$(".chk").click(function(){
  if (this.checked) {
    var totalval = parseInt($("#priceId").val())+parseInt($(this).val());
    $("#priceId").val(totalval);
    $("#saleID").html(totalval);
    if($(this).attr("id")=='1'){ var arrayscr=$("#imgid").attr("src").split("/"); $("#imageId").val(arrayscr[5]); $("#p_name").val($("#p_name_txt").text()); }
    if($(this).attr("id")=='2'){ var arrayscr=$("#imgid2").attr("src").split("/"); $("#imageId2").val(arrayscr[5]); $("#p_name2").val($("#p_name_txt2").text()); }
    if($(this).attr("id")=='3'){ var arrayscr=$("#imgid3").attr("src").split("/"); $("#imageId3").val(arrayscr[5]); $("#p_name3").val($("#p_name_txt3").text()); }
    if($(this).attr("id")=='4'){ var arrayscr=$("#imgid4").attr("src").split("/"); $("#imageId4").val(arrayscr[5]); $("#p_name4").val($("#p_name_txt4").text()); }
    if($(this).attr("id")=='5'){ var arrayscr=$("#imgid5").attr("src").split("/"); $("#imageId5").val(arrayscr[5]); $("#p_name5").val($("#p_name_txt5").text()); }
    if($(this).attr("id")=='6'){ var arrayscr=$("#imgid6").attr("src").split("/"); $("#imageId6").val(arrayscr[5]); $("#p_name6").val($("#p_name_txt6").text()); }
    if($(this).attr("id")=='7'){ var arrayscr=$("#imgi7").attr("src").split("/"); $("#imageId7").val(arrayscr[5]); $("#p_name7").val($("#p_name_txt7").text()); }
    if($(this).attr("id")==8){ var arrayscr=$("#imgid8").attr("src").split("/"); $("#imageId8").val(arrayscr[5]); $("#p_name8").val($("#p_name_txt8").text()); }
    if($(this).attr("id")=='9'){ var arrayscr=$("#imgid9").attr("src").split("/"); $("#imageId9").val(arrayscr[5]); $("#p_name9").val($("#p_name_txt9").text()); }
    if($(this).attr("id")=='10'){ var arrayscr=$("#imgid10").attr("src").split("/"); $("#imageId10").val(arrayscr[5]); $("#p_name10").val($("#p_name_txt10").text()); }
  } else {
    if($(this).attr("id")=='1'){ $("#imageId").val(""); }
    if($(this).attr("id")=='2'){ $("#imageId2").val(""); }
    if($(this).attr("id")=='3'){ $("#imageId3").val(""); }
    if($(this).attr("id")=='4'){ $("#imageId4").val(""); }
    if($(this).attr("id")=='5'){ $("#imageId5").val(""); }
    if($(this).attr("id")=='6'){ $("#imageId6").val(""); }
    if($(this).attr("id")=='7'){ $("#imageId7").val(""); }
    if($(this).attr("id")==8){ $("#imageId8").val(""); }
    if($(this).attr("id")=='9'){ $("#imageId9").val(""); }
    if($(this).attr("id")=='10'){ $("#imageId10").val(""); }
    var totalvalminus = parseInt($("#priceId").val())-parseInt($(this).val());
    $("#priceId").val(totalvalminus);
    $("#saleID").html(totalvalminus);
  }
});
});
`,
        }}
      />
    </div>
  );
}
