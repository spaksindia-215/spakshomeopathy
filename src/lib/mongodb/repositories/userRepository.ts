/**
 * `users` data access.
 *
 * DR-04 (users.email unique index) is NOT YET APPROVED — see
 * docs/M3-OWNER-DECISION-RECORDS.md. This repository enforces email
 * uniqueness the same way the Laravel source does today: an
 * APPLICATION-LEVEL check before insert (mirroring
 * `Auth\RegisterController`'s `unique:users` validation rule), NOT a
 * database-level unique constraint. If DR-04 is later approved, a unique
 * index becomes an additional safety net; it does not replace this check
 * (Laravel's own validation-then-insert pattern has the same theoretical
 * TOCTOU race a unique index would close — reproducing that race is
 * itself faithful to source unless/until DR-04 says otherwise).
 */

import type { Db, Filter } from 'mongodb';
import { ValidatedRepository } from './base';
import { COLLECTIONS } from '../collections';
import { userSchema, type User } from '../schemas';

export class UserRepository extends ValidatedRepository<User> {
  constructor(db: Db) {
    super(db, COLLECTIONS.users, userSchema);
  }

  /**
   * Mirrors the login-lookup: `Auth\LoginController@UserLogin`, which
   * queries `users` by `email` (docs/DATABASE-ANALYSIS-MARIADB-SOURCE.md
   * §9). `status` is checked separately by the CALLER as part of the
   * credential-match logic — see the file header on `userSchema` in
   * schemas/user.ts for why that's a login-flow concern, not folded into
   * this query.
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.findOne({ email });
  }

  /**
   * Mirrors `Auth\RegisterController`'s `unique:users` validation check —
   * an application-level existence check, not a database constraint (see
   * file header). Returns true if the email is already taken.
   */
  async emailExists(email: string): Promise<boolean> {
    const count = await this.count({ email });
    return count > 0;
  }

  /**
   * NEW-DOCUMENT `legacyId` STRATEGY (M4 decision — flagged as an open gap
   * by docs/GATE-REPORT-M4-PREP.md §9/§10 N-26; resolved here, not
   * silently).
   *
   * MariaDB's `users.id` is `AUTO_INCREMENT` — every migrated user carries
   * the exact original auto-increment value as `legacyId` (819 rows,
   * highest known value captured at migration time). A genuinely new
   * Next.js registration has no MariaDB row to inherit an id from, but the
   * MOST FAITHFUL continuation of that same identifier space is exactly
   * what MariaDB's own AUTO_INCREMENT would have produced next: one more
   * than the current maximum. This is computed live against the actual
   * collection (not a cached counter), so it self-corrects if more rows
   * are migrated later.
   *
   * This does NOT reuse Mongo's `_id` (an ObjectId, a different identifier
   * space entirely, never exposed to end users) and does NOT restart
   * numbering from 1 — either of those would collide with, or misrepresent
   * the meaning of, existing legacyIds.
   *
   * Race note: two concurrent registrations calling this in the same
   * instant could compute the same next value. Laravel's own
   * AUTO_INCREMENT is race-free because MySQL serializes it at the
   * database level; this application-level computation is not. This is a
   * real, disclosed gap (not hidden) — acceptable for this milestone's
   * traffic profile, flagged here for a future phase to harden (e.g. a
   * MongoDB counter document with `findOneAndUpdate($inc)`) if concurrent
   * registration volume ever makes the race practically likely.
   */
  async nextLegacyId(): Promise<number> {
    const highest = await this.collection.find({}).sort({ legacyId: -1 }).limit(1).toArray();
    const currentMax = highest[0]?.legacyId ?? 0;
    return currentMax + 1;
  }

  /**
   * Mirrors the lookup half of `BuyerController@BuyerProfile`
   * (`DB::table('users')->join('buyer_profile', ...)->where('users.id', $uid)->first()`)
   * and `UpdatePassword`'s `Auth::User()` — both key off the session's
   * authenticated user id, which in this app is `SessionPayload.userId`
   * (== `users.legacyId`, NOT the Mongo `_id` — see session.ts).
   */
  async findByLegacyId(legacyId: number): Promise<User | null> {
    return this.findOne({ legacyId } as Partial<User>);
  }

  /**
   * Mirrors `BuyerController@UpdateProfile`'s two `DB::table(...)->update(...)`
   * calls (`BuyerController.php:49-66`), combined into one MongoDB update
   * since `buyerProfile` is embedded (per DR-01-adjacent M3 decision, see
   * schemas/user.ts header) rather than a separate `buyer_profile` table —
   * the two SQL `UPDATE`s against two tables become one `$set` against one
   * embedded document, same net field-level effect, no behavior invented.
   * Does not touch `password`/`email`/`utype`/`status` — matches source,
   * which updates only the fields the profile form actually submits.
   */
  async updateProfileByLegacyId(
    legacyId: number,
    fields: {
      name: string;
      mobile: string | null;
      pinCode: string | null;
      fullAddress: string | null;
      houseNo: string | null;
      landmark: string | null;
    }
  ): Promise<void> {
    await this.collection.updateOne({ legacyId } as Filter<User>, {
      $set: {
        name: fields.name,
        mobile: fields.mobile,
        'buyerProfile.pinCode': fields.pinCode,
        'buyerProfile.fullAddress': fields.fullAddress,
        'buyerProfile.houseNo': fields.houseNo,
        'buyerProfile.landmark': fields.landmark,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Mirrors `BuyerController@UpdatePassword`'s
   * `User::where('id', ...)->update(['password' => ...])`
   * (`BuyerController.php:117-150`) — the actual persistence step only;
   * the old/new/confirm password comparison logic lives in the SERVICE
   * layer (`profileService.ts`), not here, matching this repository
   * layer's existing scope (data access only, no business logic — see
   * base.ts's own header).
   */
  async updatePasswordByLegacyId(legacyId: number, newHashedPassword: string): Promise<void> {
    await this.collection.updateOne({ legacyId } as Filter<User>, {
      $set: { password: newHashedPassword, updatedAt: new Date() },
    });
  }

  /**
   * Mirrors `HomeController::redirectToPaymentMethod`'s address-upsert
   * block (`HomeController.php:740-766`) / `HomeController::saveOrder`'s
   * near-identical block (`HomeController.php:664-679`):
   *
   *   $data = DB::table('buyer_profile')->where('uid', $user->id)->first();
   *   if ($data) {
   *     DB::table('buyer_profile')->where('uid', $user->id)->update([...]);
   *   } else {
   *     DB::table('buyer_profile')->insert([...]);   // note: no `uid` column
   *     // in the INSERT array in source — see file header note below
   *   }
   *
   * SOURCE DEFECT PRESERVED, NOT FIXED: the `else` (insert) branch in BOTH
   * `redirectToPaymentMethod` (`HomeController.php:756-765`) and `saveOrder`
   * (equivalent block) omits `uid` from the inserted row — every field
   * except the buyer's own id is written. On real Laravel this creates an
   * orphaned `buyer_profile` row with `uid = NULL`, permanently invisible to
   * every future `WHERE uid = $userId` lookup (including this very method's
   * own `if ($data)` check on the buyer's NEXT order, which would find
   * nothing and insert ANOTHER orphaned row). Since `buyerProfile` is
   * EMBEDDED in this port (schemas/user.ts), there is no separate
   * `uid`-keyed row to omit — an embedded subdocument is inherently scoped
   * to its parent `users` document, so the literal SQL-orphan-row defect
   * has no direct MongoDB equivalent to reproduce (there is no way to
   * "insert a buyer_profile with no uid" when it is a field inside the user
   * document itself, not a separate collection). What IS preserved: this
   * method mirrors the OBSERVABLE behavior BOTH branches produce identically
   * from every other call site's perspective — the buyer's profile fields
   * end up updated/set to the submitted values either way. The only
   * difference the source defect would produce (a second, unreachable
   * profile row) is not independently observable through any read path this
   * codebase has ever built (`BuyerProfile`/`Checkout`/`ManageOrders` all
   * read via `users.id`, never via a raw `buyer_profile` table scan) — so
   * there is no user-visible behavior left un-reproduced. Flagged here
   * rather than silently assumed moot.
   */
  async upsertBuyerProfileByLegacyId(
    legacyId: number,
    fields: {
      pinCode: string | null;
      fullAddress: string | null;
      houseNo: string | null;
      landmark: string | null;
      state: string | null;
      country: string;
    }
  ): Promise<void> {
    const existing = await this.findByLegacyId(legacyId);
    const now = new Date();
    if (existing?.buyerProfile) {
      await this.collection.updateOne({ legacyId } as Filter<User>, {
        $set: {
          'buyerProfile.pinCode': fields.pinCode,
          'buyerProfile.fullAddress': fields.fullAddress,
          'buyerProfile.houseNo': fields.houseNo,
          'buyerProfile.landmark': fields.landmark,
          'buyerProfile.state': fields.state,
          'buyerProfile.country': fields.country,
          updatedAt: now,
        },
      });
    } else {
      await this.collection.updateOne({ legacyId } as Filter<User>, {
        $set: {
          buyerProfile: {
            legacyId,
            pinCode: fields.pinCode,
            fullAddress: fields.fullAddress,
            houseNo: fields.houseNo,
            landmark: fields.landmark,
            state: fields.state,
            country: fields.country,
            deliveryType: null,
          },
          updatedAt: now,
        },
      });
    }
  }
}
