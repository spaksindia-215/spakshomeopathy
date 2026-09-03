import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { PublicScripts } from '@/components/layout/PublicScripts';
import { PublicStylesheets } from '@/components/layout/PublicStylesheets';
import { requireBuyerSession } from '@/lib/auth/guard';
import { readAndClearFlash } from '@/lib/auth/flash';
import { generateCsrfToken } from '@/lib/auth/csrf';
import { getDb } from '@/lib/mongodb/client';
import { UserRepository } from '@/lib/mongodb/repositories/userRepository';

/**
 * `/profile` — ported from `profile.blade.php` (137 lines),
 * `BuyerController@BuyerProfile` (`BuyerController.php:36-46`).
 *
 * Source query: `DB::table('users')->join('buyer_profile', 'users.id',
 * '=', 'buyer_profile.uid')->where('users.id', $uid)->first()` — a single
 * joined row. This app's `users` schema already embeds `buyerProfile`
 * (see `schemas/user.ts` header — DR-01-adjacent M3 decision), so
 * `UserRepository.findByLegacyId()` returns the equivalent joined shape
 * directly, no separate query needed.
 *
 * `$getstatezone` (`DB::table('statezones')->get()`) is ALSO passed to
 * the view in source, but `profile.blade.php` never references it
 * anywhere (confirmed by direct grep this session: zero matches for
 * `getstatezone`/`statezone` in the view) — a dead variable in source,
 * same pattern as `CheckBuyer`'s `backUrl` write
 * (`docs/M3-APPLICATION-MAPPING.md:174`). Not fetched here — there is no
 * `statezones` collection/schema in this port, and building one solely to
 * feed a variable the view never renders would be pure waste, not
 * fidelity.
 *
 * A user with no `buyerProfile` sub-document (schema marks it
 * `.optional()` — absent, not null, per that field's own doc comment)
 * renders empty strings for the profile-only fields, matching what
 * Blade's `{{$row->PinCode}}` etc. would coerce a SQL NULL to on an
 * unjoined row in source (an empty string, not literally "null" text).
 *
 * ROUTE PROTECTION: gated by `requireBuyerSession()`, mirroring
 * `routes/web.php`'s `checkBuyer` group (`profile` is one of its routes,
 * `web.php:110`).
 *
 * M5-B: added the `_token` hidden field, wired to `csrf.ts` (source has
 * `@csrf` here — `profile.blade.php:57`, confirmed directly this slice) —
 * `update-profile/route.ts` now verifies it.
 */
export const metadata: Metadata = {
  title: 'Spakshomeopathy - Profile',
  other: {
    'msapplication-TileColor': '#ffffff',
    'theme-color': '#ffffff',
  },
};

export default async function ProfilePage() {
  const session = await requireBuyerSession();
  const message = await readAndClearFlash('message');
  const csrfToken = generateCsrfToken();

  const db = await getDb();
  const users = new UserRepository(db);
  const user = await users.findByLegacyId(session.userId);

  const row = {
    name: user?.name ?? '',
    mobile: user?.mobile ?? '',
    pinCode: user?.buyerProfile?.pinCode ?? '',
    fullAddress: user?.buyerProfile?.fullAddress ?? '',
    houseNo: user?.buyerProfile?.houseNo ?? '',
    landmark: user?.buyerProfile?.landmark ?? '',
  };

  return (
    <div className="page-wrapper">
      <PublicStylesheets />
      <PublicHeader />

      <div className="row">
        <div className="col-12">
          <div className="breadcrumb-wrap">
            <nav aria-label="breadcrumb">
              <ul className="breadcrumb">
                <li className="breadcrumb-item">
                  <Link href="/">Home</Link>
                </li>
                <li className="breadcrumb-item active" aria-current="page">
                  My Profile
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </div>

      <section className="cart-section sec-pad pb-0">
        <div className="container">
          <div className="inner-container">
            {message !== null && <div className="alert alert-success">{message}</div>}

            <form action="/update-profile" method="post">
              <input type="hidden" name="_token" value={csrfToken} />
              <input type="hidden" name="utype" value="3" />
              <div className="row align-items-end">
                <div className="col-xl-2 col-lg-2"> </div>
                <div className="col-xl-8 col-lg-8">
                  <div className="col-xl-12 col-lg-12">
                    <div className="appointment-one__form-group">
                      <input
                        type="text"
                        name="name"
                        className="appointment-one__field"
                        placeholder="Full Name"
                        required
                        defaultValue={row.name}
                      />
                    </div>
                  </div>

                  <div className="col-xl-12 col-lg-12">
                    <div className="appointment-one__form-group">
                      <input
                        type="text"
                        name="mobile"
                        className="appointment-one__field"
                        placeholder="Mobile Number"
                        required
                        defaultValue={row.mobile}
                      />
                    </div>
                  </div>

                  <div className="col-xl-12 col-lg-12">
                    <div className="appointment-one__form-group">
                      <input
                        type="number"
                        name="PinCode"
                        className="appointment-one__field"
                        placeholder="Pin Code"
                        required
                        defaultValue={row.pinCode}
                      />
                    </div>
                  </div>

                  <div className="col-xl-12 col-lg-12">
                    <div className="appointment-one__form-group">
                      <input
                        type="text"
                        name="FullAddress"
                        className="appointment-one__field"
                        placeholder="Full Address"
                        required
                        defaultValue={row.fullAddress}
                      />
                    </div>
                  </div>

                  <div className="col-xl-12 col-lg-12">
                    <div className="appointment-one__form-group">
                      <input
                        type="text"
                        name="HouseNo"
                        className="appointment-one__field"
                        placeholder="House No"
                        required
                        defaultValue={row.houseNo}
                      />
                    </div>
                  </div>

                  <div className="col-xl-12 col-lg-12">
                    <div className="appointment-one__form-group">
                      <input
                        type="text"
                        name="Landmark"
                        className="appointment-one__field"
                        placeholder="Landmark"
                        required
                        defaultValue={row.landmark}
                      />
                    </div>
                  </div>

                  <div className="col-xl-6 col-lg-12">
                    <button type="submit" className="appointment-one__btn thm-btn">
                      Update Profile
                    </button>
                  </div>
                </div>
                <div className="col-xl-2 col-lg-2"> </div>
              </div>
            </form>
            <div className="result"></div>
          </div>
        </div>
      </section>
      <br />
      <br />

      <PublicFooter />
      <PublicScripts />
    </div>
  );
}
