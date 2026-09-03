import type { Metadata } from 'next';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { PublicScripts } from '@/components/layout/PublicScripts';
import { PublicStylesheets } from '@/components/layout/PublicStylesheets';

/**
 * `/details` — ported from `details.blade.php`. Verified byte-identical to
 * production (raw capture) except the <title> (see below) and the CSRF
 * token value, which varies per request.
 *
 * The <title> "Spakshomeopathy - TB" is a copy-paste bug in the Blade
 * source. It is CONFIRMED LIVE in production (raw capture, contract rank 6)
 * and therefore preserved verbatim per contract F-17/P-05-class rule:
 * user-visible text, including bugs, is not corrected without an Approved
 * Fix Register entry.
 *
 * MILESTONE 1 SCOPE: this is the static VIEW only (blueprint §22 M1). The
 * "Add To Cart" form's submit target, CSRF token wiring, and any dynamic
 * product data are M4 (session/CSRF infra) and M6 (cart/product) scope.
 * The CSRF hidden input is rendered with a placeholder value to keep the
 * DOM shape identical; a real per-request token replaces it once session
 * infrastructure exists.
 *
 * The 15 "All Diseases" carousel items are transcribed literally, one per
 * JSX block, per contract (no consolidating near-duplicate structures into
 * a .map()) — they are NOT all identical:
 *   - Items 1-4 (Bone, Brain, Cancer, Children-Disease): <img> has
 *     alt="Awesome Image"; full set of surrounding HTML comments present.
 *   - Item 5 (Ear): same comment structure as 1-4, but <img> has NO alt
 *     attribute.
 *   - Items 6-8 (Eye, Female, Gall -Bladder — note the space in "Gall
 *     -Bladder", preserved verbatim): no alt, comments still present.
 *   - Item 9 (Hair): no alt, and the trailing HTML comments
 *     (hover-content/title/content/single/item) are ABSENT in production.
 *   - Items 10-14 (Heart, Infection, Life Style, Liver, Male): <img src>
 *     is a bare relative path "uploaded_files/categories/..." (no leading
 *     slash, no http(s):// host — a broken/dead image reference in
 *     production, preserved as-is per contract; this is NOT an
 *     "assets/..." path so it is not rewritten to "/assets/..."), no
 *     comments.
 *   - Item 15 (Mouth & Tongue): same bare relative-path <img> as 10-14,
 *     and the link text is split across lines with leading whitespace
 *     ("                                Mouth & Tongue") exactly as
 *     rendered in production.
 * Every item's malformed `<a href="" class="material-icons">` /
 * `<a href="">` (empty href, no real navigation target) is preserved
 * exactly, as is the malformed `<a href="#" class="fa fa-star">` star
 * rating row (decorative anchors with no real target).
 */
export const metadata: Metadata = {
  title: 'Spakshomeopathy - TB',
  other: {
    'msapplication-TileColor': '#ffffff',
    'msapplication-TileImage': 'images/favicon/ms-icon-144x144.png',
    'theme-color': '#ffffff',
  },
};

export default function DetailsPage() {
  return (
    <>
      <div className="page-wrapper">
        <PublicStylesheets />
        {/* /.topbar-one */}
        <PublicHeader />
        {/* /.header-one */}
        {/* /.inner-banner */}
        {/* /.sec-pad */}
        <div className="breadcrumb">
          <div className="container">
            <div className="row">
              <div className="col-12 text-center d-flex justify-content-center">
                <ul className="breadcrumb ">
                  <li className="breadcrumb-item active" aria-current="page">
                    Product Detail
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <section className="mt-5 mb-5 single-shop-page">
          <div className="container">
            <div className="row mb-5">
              <div className="col-lg-7 col-md-7 col-sm-7 mr-5">
                <div className="wrap-left">
                  <div className="row shadowbox">
                    <div className="producdgrid">
                      <div className="pickproduct">
                        <img src="assets/images/kit.png" />
                      </div>
                      <div className="priceandcheck">
                        <div className="service-list">
                          <input type="checkbox" id="1" />
                          <label htmlFor="1">
                            {' '}
                            <span>Rs- 600</span>{' '}
                          </label>
                        </div>

                        <div className="nameproduct">
                          <ul>
                            <li> Hydrocotyle asi.200ppppp</li>
                            <li>Brahmi Q</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="producdgrid">
                      <div className="pickproduct">
                        <img src="assets/images/producth.png" />
                      </div>
                      <div className="priceandcheck">
                        <div className="service-list">
                          <input type="checkbox" id="2" />
                          <label htmlFor="2">
                            {' '}
                            <span>Rs- 300</span>{' '}
                          </label>
                        </div>

                        <div className="nameproduct">
                          <ul>
                            <li>Hydrocotyle asi.200 </li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="producdgrid">
                      <div className="pickproduct">
                        <img src="assets/images/producth.png" />
                      </div>
                      <div className="priceandcheck">
                        <div className="service-list">
                          <input type="checkbox" id="3" />
                          <label htmlFor="3">
                            {' '}
                            <span>Rs- 300</span>{' '}
                          </label>
                        </div>

                        <div className="nameproduct">
                          <ul>
                            <li>Hydrocotyle asi.200 </li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="producdgrid">
                      <div className="pickproduct">
                        <img src="assets/images/producth.png" />
                      </div>
                      <div className="priceandcheck">
                        <div className="service-list">
                          <input type="checkbox" id="4" />
                          <label htmlFor="4">
                            {' '}
                            <span>Rs- 300</span>{' '}
                          </label>
                        </div>

                        <div className="nameproduct">
                          <ul>
                            <li>Pulsatilla 200</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="producdgrid">
                      <div className="pickproduct">
                        <img src="assets/images/cap.png" />
                      </div>
                      <div className="priceandcheck">
                        <div className="service-list">
                          <input type="checkbox" id="5" />
                          <label htmlFor="5">
                            {' '}
                            <span>Rs- 650</span>{' '}
                          </label>
                        </div>

                        <div className="nameproduct">
                          <ul>
                            <li>Hydrocotyle</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* ---------wrap-left end---- */}
                </div>
              </div>

              <div className="col-lg-4 col-md-4 col-sm-4">
                <div className="text-box my-auto">
                  <div className="content-box">
                    <h3>Arnica Extract for Hair</h3>
                    <span>Availability: In stock</span>
                    {/* OI-14: Blade emits `</a>\n<!--\n--><a ...>` between the
                        stars. The HTML comment renders nothing (contract §12.4),
                        but the newline BEFORE it renders as ONE space, and the
                        `.fa-star` anchors are inline — so that space is layout.
                        Production measures a 3px gap between each pair; without
                        it the gap is 0. Reproduced explicitly as {' '}; no CSS
                        or margin is introduced. */}
                    <div className="star-box">
                      <a href="#" className="fa fa-star"></a>{' '}
                      <a href="#" className="fa fa-star"></a>{' '}
                      <a href="#" className="fa fa-star"></a>{' '}
                      <a href="#" className="fa fa-star"></a>{' '}
                      <a href="#" className="fa fa-star"></a>
                    </div>
                    <p className="price">
                      <span>₹1999</span> &nbsp;&nbsp; <del>₹1999</del>
                    </p>
                    <hr />

                    <div className="use">
                      <h5>How to Use:</h5>
                      <p>
                        1+1=2 Capsule Different colour morning and Evening before meal (Avoid
                        Alcohol).
                      </p>
                    </div>
                  </div>
                  {/* /.conten-box */}

                  <form method="REQUEST" action="http://www.spakshomeopathy.com/product-store-cart">
                    {/* CSRF token: placeholder value, real per-request token wired in M4/M6 (session/cart infra) */}
                    <input type="hidden" name="_token" value="" />
                    <input type="hidden" name="id" value="1" />
                    <input type="hidden" name="p_name" value="Arnica Extract for Hair" />
                    <input type="hidden" name="p_image" value="1652944381gArnica.png" />
                    <input type="hidden" name="p_price" value="1999" />
                    <input type="hidden" placeholder="1" name="quantity" value="1" />

                    <button type="submit" name="sbmtBtn" className="thm-btn">
                      Add To Cart{' '}
                    </button>
                  </form>

                  {/* /.checklist */}
                </div>
              </div>
            </div>
            {/* /.row */}

            {/* ---------tab start------------------------ */}
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
                {/* /.tab-title */}

                <div className="tab-content">
                  <div
                    className="tab-pane show  animated fadeInUp signle-tab-content active"
                    id="description"
                  >
                    <p>
                      There are many variations of passages of Lorem Ipsum available, but the
                      majority have suffered alteration in some form, by injected humour, or
                      randomised words which don&apos;t look even slightly{' '}
                    </p>
                  </div>

                  <div
                    className="tab-pane animated fadeInUp signle-tab-content faq-accrodion show"
                    id="faq"
                  >
                    <h3 className="blog-details__title">How to Use</h3>
                    {/* /.blog-details__title */}
                    <div className="accrodion-grp faq-accrodion" data-grp-name="faq-accrodion">
                      <div className="accrodion">
                        <div className="accrodion-title">
                          <h4>Hydrocotyle asi.200</h4>
                        </div>
                        <div className="accrodion-content" style={{ display: 'none' }}>
                          <div className="inner">
                            <p>
                              here are many variations of passages of Lorem Ipsum available, but the
                              majority have suffered alteration in some form, by injected humour, or
                              randomised words which don&apos;t look even slightly believable. If
                              you are going to use a passage of Lorem Ipsum, you need to be sure
                              there isn&apos;t anything embarrassing hidden in the middle of text
                            </p>
                          </div>
                          {/* /.inner */}
                        </div>
                      </div>
                      <div className="accrodion">
                        <div className="accrodion-title">
                          <h4>Brahmi Q</h4>
                        </div>
                        <div className="accrodion-content" style={{ display: 'none' }}>
                          <div className="inner">
                            <p>
                              here are many variations of passages of Lorem Ipsum available, but the
                              majority have suffered alteration in some form, by injected humour, or
                              randomised words which don&apos;t look even slightly believable. If
                              you are going to use a passage of Lorem Ipsum, you need to be sure
                              there isn&apos;t anything embarrassing hidden in the middle of text
                            </p>
                          </div>
                          {/* /.inner */}
                        </div>
                      </div>
                      <div className="accrodion">
                        <div className="accrodion-title">
                          <h4>Pulsatilla 200</h4>
                        </div>
                        <div className="accrodion-content" style={{ display: 'none' }}>
                          <div className="inner">
                            <p>
                              here are many variations of passages of Lorem Ipsum available, but the
                              majority have suffered alteration in some form, by injected humour, or
                              randomised words which don&apos;t look even slightly believable. If
                              you are going to use a passage of Lorem Ipsum, you need to be sure
                              there isn&apos;t anything embarrassing hidden in the middle of text
                            </p>
                          </div>
                          {/* /.inner */}
                        </div>
                      </div>
                      <div className="accrodion">
                        <div className="accrodion-title">
                          <h4>
                            Lorem Ipsum is simply dummy text of the printing and typesetting
                            industry
                          </h4>
                        </div>
                        <div className="accrodion-content" style={{ display: 'none' }}>
                          <div className="inner">
                            <p>
                              here are many variations of passages of Lorem Ipsum available, but the
                              majority have suffered alteration in some form, by injected humour, or
                              randomised words which don&apos;t look even slightly believable. If
                              you are going to use a passage of Lorem Ipsum, you need to be sure
                              there isn&apos;t anything embarrassing hidden in the middle of text
                            </p>
                          </div>
                          {/* /.inner */}
                        </div>
                      </div>
                      <div className="accrodion active">
                        <div className="accrodion-title">
                          <h4>
                            Lorem Ipsum is simply dummy text of the printing and typesetting
                            industry
                          </h4>
                        </div>
                        <div className="accrodion-content" style={{ display: 'block' }}>
                          <div className="inner">
                            <p>
                              here are many variations of passages of Lorem Ipsum available, but the
                              majority have suffered alteration in some form, by injected humour, or
                              randomised words which don&apos;t look even slightly believable. If
                              you are going to use a passage of Lorem Ipsum, you need to be sure
                              there isn&apos;t anything embarrassing hidden in the middle of text
                            </p>
                          </div>
                          {/* /.inner */}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* /.tab-content-box */}
              </div>
            </div>
          </div>
          {/* /.container */}
        </section>
        {/* /.feature-two */}

        <section className="recent-products thm-gray-bg-2 pt-5 pb-5">
          <div className="container">
            <div className="block-title text-center">
              <h2 className="block-title__title">All Diseases</h2>
              {/* /.block-title__title */}
            </div>
            {/* /.block-title */}

            <div className="recent-products__carousel owl-theme owl-carousel">
              <div className="item">
                <div className="shop-one__single">
                  <div className="shop-one__image">
                    <img
                      src="http://www.spakshomeopathy.com/uploaded_files/categories/3c97d-Bones.jpg"
                      alt="Awesome Image"
                    />
                    <div className="shop-one__hover-content">
                      <a href="" className="material-icons">
                        <i className="fa fa-eye" aria-hidden="true"></i>
                      </a>
                    </div>
                    {/* /.shop-one__hover-content */}
                  </div>
                  {/* /.shop-one__image */}
                  <div className="shop-one__content">
                    <h3 className="shop-one__title">
                      <a href="">Bone</a>
                    </h3>
                    {/* /.shop-one__title */}
                  </div>
                  {/* /.shop-one__content */}
                </div>
                {/* /.shop-one__single */}
              </div>
              {/* /.item */}

              <div className="item">
                <div className="shop-one__single">
                  <div className="shop-one__image">
                    <img
                      src="http://www.spakshomeopathy.com/uploaded_files/categories/ddb94-Brain.jpg"
                      alt="Awesome Image"
                    />
                    <div className="shop-one__hover-content">
                      <a href="" className="material-icons">
                        <i className="fa fa-eye" aria-hidden="true"></i>
                      </a>
                    </div>
                    {/* /.shop-one__hover-content */}
                  </div>
                  {/* /.shop-one__image */}
                  <div className="shop-one__content">
                    <h3 className="shop-one__title">
                      <a href="">Brain</a>
                    </h3>
                    {/* /.shop-one__title */}
                  </div>
                  {/* /.shop-one__content */}
                </div>
                {/* /.shop-one__single */}
              </div>
              {/* /.item */}

              <div className="item">
                <div className="shop-one__single">
                  <div className="shop-one__image">
                    <img
                      src="http://www.spakshomeopathy.com/uploaded_files/categories/9f29b-Cancer.jpg"
                      alt="Awesome Image"
                    />
                    <div className="shop-one__hover-content">
                      <a href="" className="material-icons">
                        <i className="fa fa-eye" aria-hidden="true"></i>
                      </a>
                    </div>
                    {/* /.shop-one__hover-content */}
                  </div>
                  {/* /.shop-one__image */}
                  <div className="shop-one__content">
                    <h3 className="shop-one__title">
                      <a href="">Cancer</a>
                    </h3>
                    {/* /.shop-one__title */}
                  </div>
                  {/* /.shop-one__content */}
                </div>
                {/* /.shop-one__single */}
              </div>
              {/* /.item */}

              <div className="item">
                <div className="shop-one__single">
                  <div className="shop-one__image">
                    <img
                      src="http://www.spakshomeopathy.com/uploaded_files/categories/3802b-Children-Disease.jpg"
                      alt="Awesome Image"
                    />
                    <div className="shop-one__hover-content">
                      <a href="" className="material-icons">
                        <i className="fa fa-eye" aria-hidden="true"></i>
                      </a>
                    </div>
                    {/* /.shop-one__hover-content */}
                  </div>
                  {/* /.shop-one__image */}
                  <div className="shop-one__content">
                    <h3 className="shop-one__title">
                      <a href="">Children-Disease</a>
                    </h3>
                    {/* /.shop-one__title */}
                  </div>
                  {/* /.shop-one__content */}
                </div>
                {/* /.shop-one__single */}
              </div>
              {/* /.item */}

              <div className="item">
                <div className="shop-one__single">
                  <div className="shop-one__image">
                    <img src="http://www.spakshomeopathy.com/uploaded_files/categories/6598e-Ear.jpg" />
                    <div className="shop-one__hover-content">
                      <a href="" className="material-icons">
                        <i className="fa fa-eye" aria-hidden="true"></i>
                      </a>
                    </div>
                    {/* /.shop-one__hover-content */}
                  </div>
                  {/* /.shop-one__image */}
                  <div className="shop-one__content">
                    <h3 className="shop-one__title">
                      <a href="">Ear</a>
                    </h3>
                    {/* /.shop-one__title */}
                  </div>
                  {/* /.shop-one__content */}
                </div>
                {/* /.shop-one__single */}
              </div>
              {/* /.item */}

              <div className="item">
                <div className="shop-one__single">
                  <div className="shop-one__image">
                    <img src="http://www.spakshomeopathy.com/uploaded_files/categories/5224f-Eye.jpg" />
                    <div className="shop-one__hover-content">
                      <a href="" className="material-icons">
                        <i className="fa fa-eye" aria-hidden="true"></i>
                      </a>
                    </div>
                    {/* /.shop-one__hover-content */}
                  </div>
                  {/* /.shop-one__image */}
                  <div className="shop-one__content">
                    <h3 className="shop-one__title">
                      <a href="">Eye</a>
                    </h3>
                    {/* /.shop-one__title */}
                  </div>
                  {/* /.shop-one__content */}
                </div>
                {/* /.shop-one__single */}
              </div>
              {/* /.item */}

              <div className="item">
                <div className="shop-one__single">
                  <div className="shop-one__image">
                    <img src="http://www.spakshomeopathy.com/uploaded_files/categories/08b48-Female.jpg" />
                    <div className="shop-one__hover-content">
                      <a href="" className="material-icons">
                        <i className="fa fa-eye" aria-hidden="true"></i>
                      </a>
                    </div>
                    {/* /.shop-one__hover-content */}
                  </div>
                  {/* /.shop-one__image */}
                  <div className="shop-one__content">
                    <h3 className="shop-one__title">
                      <a href="">Female</a>
                    </h3>
                    {/* /.shop-one__title */}
                  </div>
                  {/* /.shop-one__content */}
                </div>
                {/* /.shop-one__single */}
              </div>
              {/* /.item */}

              <div className="item">
                <div className="shop-one__single">
                  <div className="shop-one__image">
                    <img src="http://www.spakshomeopathy.com/uploaded_files/categories/3194b-gall-bladder.jpg" />
                    <div className="shop-one__hover-content">
                      <a href="" className="material-icons">
                        <i className="fa fa-eye" aria-hidden="true"></i>
                      </a>
                    </div>
                    {/* /.shop-one__hover-content */}
                  </div>
                  {/* /.shop-one__image */}
                  <div className="shop-one__content">
                    <h3 className="shop-one__title">
                      <a href="">Gall -Bladder</a>
                    </h3>
                    {/* /.shop-one__title */}
                  </div>
                  {/* /.shop-one__content */}
                </div>
                {/* /.shop-one__single */}
              </div>
              {/* /.item */}

              <div className="item">
                <div className="shop-one__single">
                  <div className="shop-one__image">
                    <img src="http://www.spakshomeopathy.com/uploaded_files/categories/f83af-Hair-disease.jpg" />
                    <div className="shop-one__hover-content">
                      <a href="" className="material-icons">
                        <i className="fa fa-eye" aria-hidden="true"></i>
                      </a>
                    </div>
                  </div>
                  <div className="shop-one__content">
                    <h3 className="shop-one__title">
                      <a href="">Hair</a>
                    </h3>
                  </div>
                </div>
              </div>

              <div className="item">
                <div className="shop-one__single">
                  <div className="shop-one__image">
                    <img src="uploaded_files/categories/30720-heart.jpg" />
                    <div className="shop-one__hover-content">
                      <a href="" className="material-icons">
                        <i className="fa fa-eye" aria-hidden="true"></i>
                      </a>
                    </div>
                  </div>
                  <div className="shop-one__content">
                    <h3 className="shop-one__title">
                      <a href="">Heart</a>
                    </h3>
                  </div>
                </div>
              </div>

              <div className="item">
                <div className="shop-one__single">
                  <div className="shop-one__image">
                    <img src="uploaded_files/categories/c4852-Infectious.jpg" />
                    <div className="shop-one__hover-content">
                      <a href="" className="material-icons">
                        <i className="fa fa-eye" aria-hidden="true"></i>
                      </a>
                    </div>
                  </div>
                  <div className="shop-one__content">
                    <h3 className="shop-one__title">
                      <a href="">Infection</a>
                    </h3>
                  </div>
                </div>
              </div>

              <div className="item">
                <div className="shop-one__single">
                  <div className="shop-one__image">
                    <img src="uploaded_files/categories/34a6c-Lifestyle.jpg" />
                    <div className="shop-one__hover-content">
                      <a href="" className="material-icons">
                        <i className="fa fa-eye" aria-hidden="true"></i>
                      </a>
                    </div>
                  </div>
                  <div className="shop-one__content">
                    <h3 className="shop-one__title">
                      <a href="">Life Style</a>
                    </h3>
                  </div>
                </div>
              </div>

              <div className="item">
                <div className="shop-one__single">
                  <div className="shop-one__image">
                    <img src="uploaded_files/categories/8f0cf-Liver.jpg" />
                    <div className="shop-one__hover-content">
                      <a href="" className="material-icons">
                        <i className="fa fa-eye" aria-hidden="true"></i>
                      </a>
                    </div>
                  </div>
                  <div className="shop-one__content">
                    <h3 className="shop-one__title">
                      <a href="">Liver</a>
                    </h3>
                  </div>
                </div>
              </div>

              <div className="item">
                <div className="shop-one__single">
                  <div className="shop-one__image">
                    <img src="uploaded_files/categories/aa85f-male.jpg" />
                    <div className="shop-one__hover-content">
                      <a href="" className="material-icons">
                        <i className="fa fa-eye" aria-hidden="true"></i>
                      </a>
                    </div>
                  </div>
                  <div className="shop-one__content">
                    <h3 className="shop-one__title">
                      <a href="">Male</a>
                    </h3>
                  </div>
                </div>
              </div>

              <div className="item">
                <div className="shop-one__single">
                  <div className="shop-one__image">
                    <img src="uploaded_files/categories/17ae2-Mouth-and-tongue.jpg" />
                    <div className="shop-one__hover-content">
                      <a href="" className="material-icons">
                        <i className="fa fa-eye" aria-hidden="true"></i>
                      </a>
                    </div>
                  </div>
                  <div className="shop-one__content">
                    <h3 className="shop-one__title">
                      <a href="">
                        {
                          '                                Mouth & Tongue\n                            '
                        }
                      </a>
                    </h3>
                  </div>
                </div>
              </div>
            </div>
            {/* /.recent-products__carousel owl-theme owl-carousel */}
          </div>
          {/* /.container */}
        </section>
        {/* /.recent-products */}
        <PublicFooter />
        {/* /.footer-one */}
        {/* /.page-wrapper */}
      </div>
      <PublicScripts />
    </>
  );
}
