/**
 * Product-detail star-rating block, transliterated verbatim from
 * `product-detail.blade.php:323-331`:
 *
 * ```
 * <div class="star-box">
 * <a href="#" class="fa fa-star"></a>
 * <!--
 * --><a href="#" class="fa fa-star"></a>
 * <!-- ... (5 total) ... -->
 * </div>
 * ```
 *
 * PRESERVED DEFECTS, both deliberate, neither "fixed":
 *
 * 1. This is ALWAYS exactly 5 static gold stars — it does NOT read
 *    `p_rating` (or any other field) at all. Despite `products.p_rating`
 *    existing in the schema, this specific block ignores it entirely;
 *    every product's detail page shows the same 5-star block regardless
 *    of its actual rating value. This component takes no `rating` prop
 *    for that reason — accepting one would imply this markup is
 *    data-driven, which it is not in source.
 * 2. Source uses an `<!-- \n -->` HTML-comment trick between each `<a>`
 *    to suppress the whitespace-as-inline-gap effect (the same defect
 *    class as OI-13/OI-14, already resolved elsewhere in this codebase
 *    via `{' '}` where a gap IS wanted). Here the opposite is true: the
 *    comment trick means NO gap is wanted between stars. JSX with no
 *    whitespace between adjacent elements already produces zero gap by
 *    default, so the correct-fidelity JSX is simply five `<a>` tags with
 *    no whitespace between them — no `{' '}` needed, and none is used
 *    below, matching the star-box's own comment-suppressed gap exactly.
 */

export function StarRating() {
  return (
    <div className="star-box">
      <a href="#" className="fa fa-star"></a>
      <a href="#" className="fa fa-star"></a>
      <a href="#" className="fa fa-star"></a>
      <a href="#" className="fa fa-star"></a>
      <a href="#" className="fa fa-star"></a>
    </div>
  );
}
