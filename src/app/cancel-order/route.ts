/**
 * `GET /cancel-order?cncl_id=...` — mirrors `routes/web.php:120`
 * (`Route::get('cancel-order','BuyerController@CancelOrder')`, inside
 * the `checkBuyer` group, `web.php:104-119`).
 *
 * SOURCE (`BuyerController.php:93-100`):
 *   $GroupId = decrypt($req->cncl_id);
 *   DB::table('orderproducts')->where('GroupId', $GroupId)->update(['OrderStatus'=>4]);
 *   DB::table('orders')->where('GroupId', $GroupId)->update(['OrderStatus'=>4]);
 *   DB::table('payments')->where('gid', $GroupId)->update(['orderStatus'=>4]);
 *   return redirect()->back()->with('message', 'Order cancelled successfully!!');
 *
 * OWNERSHIP CHECK — DELIBERATE, OWNER-AUTHORIZED ADDITION BEYOND SOURCE:
 * source performs NO ownership check (verified — updates by GroupId
 * alone). This route enforces one via `cancelBuyerOrder()`
 * (`src/lib/services/orderService.ts` → `cancelOwnedOrder()`
 * `src/lib/mongodb/repositories/orderRepository.ts`) per the M4
 * buyer-orders-slice task's explicit requirement. See
 * `docs/B-12-RESOLUTION.md` and `cancelOwnedOrder`'s own header for the
 * full disclosure — this is the one place this slice adds behavior
 * source doesn't have, and it is an explicit owner instruction, not a
 * silent choice.
 *
 * `cncl_id` DECRYPTION: `decryptGroupId()` (`src/lib/auth/orderToken.ts`)
 * replaces Laravel's `decrypt()` — see that module's header for why this
 * is a source-EQUIVALENT (not byte-compatible) mechanism, and for why a
 * missing/invalid/tampered token here returns a clean rejection instead
 * of reproducing Laravel's own `APP_DEBUG=true` stack-trace crash (which
 * carries no fidelity-relevant behavior worth preserving — same reasoning
 * B-12 itself already applied).
 *
 * REDIRECT TARGET: source's `redirect()->back()` returns to whichever
 * page the cancel link was clicked FROM — always `/manage-orders` in
 * practice (the only page that renders a cancel link). Reproduced as a
 * fixed redirect to `/manage-orders`, matching this app's own established
 * convention for "back" redirects (e.g. `update-profile/route.ts`
 * redirects to a fixed `/profile` rather than parsing a Referer header).
 *
 * FLASH MESSAGE: success uses source's EXACT text, verbatim
 * (`'Order cancelled successfully!!'`, including its double exclamation
 * mark — not corrected). The REJECTION message (ownership/not-found
 * failure) has NO source equivalent to mirror (source has no rejection
 * branch at all, since it never checks ownership) — a new, minimal,
 * clearly-labeled message, not an invented business feature.
 */

import { NextRequest, NextResponse } from 'next/server';
import { redirectTo } from '@/lib/http/redirect';
import { getDb } from '@/lib/mongodb/client';
import { requireBuyerSession } from '@/lib/auth/guard';
import { decryptGroupId } from '@/lib/auth/orderToken';
import { cancelBuyerOrder } from '@/lib/services/orderService';
import { setFlash } from '@/lib/auth/flash';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await requireBuyerSession();

  const cnclId = request.nextUrl.searchParams.get('cncl_id');

  const groupId = cnclId !== null ? decryptGroupId(cnclId) : null;
  if (groupId === null) {
    // Mirrors decrypt()'s FAILURE OUTCOME (reject the request) for a
    // missing/invalid/tampered cncl_id — not its literal debug-crash
    // presentation. See file header.
    await setFlash('message', 'Invalid or expired cancel request.');
    return redirectTo('/manage-orders', 303);
  }

  const db = await getDb();
  const cancelled = await cancelBuyerOrder(db, groupId, session.userId);

  if (!cancelled) {
    // No source branch to mirror here — see file header's OWNERSHIP CHECK
    // note. Covers both "order doesn't exist" and "not this buyer's
    // order" identically, deliberately not distinguishable by the caller
    // (same reasoning as `getOwnedOrderByGroupId`'s own header).
    await setFlash('message', 'Order not found.');
    return redirectTo('/manage-orders', 303);
  }

  // Mirrors BuyerController.php:100's exact text, verbatim.
  await setFlash('message', 'Order cancelled successfully!!');
  return redirectTo('/manage-orders', 303);
}
