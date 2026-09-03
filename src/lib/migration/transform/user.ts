/**
 * `users` (+ embedded `buyer_profile`) transformation.
 *
 * Mirrors docs/M3-DATABASE-MAPPING.md §1.1 (Option A — embed buyer profile).
 * Source: `users` (12 columns) + `buyer_profile` (11 columns), joined by
 * `uid` — an APPLICATION-level join performed here (MariaDB has no FK,
 * §4 of docs/DATABASE-ANALYSIS-MARIADB-SOURCE.md), not a SQL join, since
 * this stage reads from two independently-extracted record sets.
 */

import type { User } from '@/lib/mongodb/schemas';
import { toDate, toLegacyId } from '@/lib/mongodb/mapping';
import type { SourceRecord, TransformOutcome } from './types';

/**
 * Transforms one `users` row. `buyerProfileRow`, if provided, is the
 * matching `buyer_profile` row (matched by the caller on `uid` — see
 * `transformUsers` below for the batch entry point that performs this
 * matching for a whole table).
 */
export function transformUser(
  row: SourceRecord,
  buyerProfileRow: SourceRecord | null
): TransformOutcome<User> {
  const legacyId = row.id;
  if (legacyId === null || legacyId === undefined) {
    return { ok: false, legacyId: null, reason: 'missing id', sourceRecord: row };
  }

  try {
    const user: User = {
      legacyId: toLegacyId(legacyId as number | string),
      name: String(row.name ?? ''),
      email: String(row.email ?? ''),
      mobile: row.mobile === null ? null : String(row.mobile),
      emailVerifiedAt: toDate(row.email_verified_at as string | null),
      password: String(row.password ?? ''),
      image: row.image === null ? null : String(row.image),
      utype: row.utype === null ? null : Number(row.utype),
      status: row.status === null ? null : Number(row.status),
      rememberToken: row.remember_token === null ? null : String(row.remember_token),
      createdAt: toDate(row.created_at as string) ?? new Date(0),
      updatedAt: toDate(row.updated_at as string) ?? new Date(0),
    };

    if (buyerProfileRow) {
      user.buyerProfile = {
        legacyId: toLegacyId(buyerProfileRow.id as number | string),
        pinCode: buyerProfileRow.PinCode === null ? null : String(buyerProfileRow.PinCode),
        fullAddress:
          buyerProfileRow.FullAddress === null ? null : String(buyerProfileRow.FullAddress),
        houseNo: buyerProfileRow.HouseNo === null ? null : String(buyerProfileRow.HouseNo),
        landmark: buyerProfileRow.Landmark === null ? null : String(buyerProfileRow.Landmark),
        state: buyerProfileRow.State === null ? null : String(buyerProfileRow.State),
        country: buyerProfileRow.Country === null ? null : String(buyerProfileRow.Country),
        deliveryType:
          buyerProfileRow.DeliveryType === null ? null : String(buyerProfileRow.DeliveryType),
      };
    }

    return { ok: true, value: user, legacyId: user.legacyId };
  } catch (e) {
    return {
      ok: false,
      legacyId: legacyId as number | string,
      reason: e instanceof Error ? e.message : String(e),
      sourceRecord: row,
    };
  }
}

/**
 * Batch entry point: transforms every `users` row, matching each buyer-type
 * user (utype=3) against its `buyer_profile` row by `uid`, if one exists.
 * A user with no matching buyer_profile row gets `buyerProfile: undefined`
 * (absent), not a row of nulls — matching the source's actual join
 * behavior exactly (see schemas/user.ts's own comment on this point).
 */
export function transformUsers(
  userRows: SourceRecord[],
  buyerProfileRows: SourceRecord[]
): TransformOutcome<User>[] {
  const buyerProfileByUid = new Map<number, SourceRecord>();
  for (const bp of buyerProfileRows) {
    const uid = bp.uid;
    if (typeof uid === 'number') buyerProfileByUid.set(uid, bp);
  }

  return userRows.map((row) => {
    const uid = typeof row.id === 'number' ? row.id : null;
    const matchingProfile = uid !== null ? (buyerProfileByUid.get(uid) ?? null) : null;
    return transformUser(row, matchingProfile);
  });
}
