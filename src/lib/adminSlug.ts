/**
 * Ports `AdminController::convert_to_slug($str)` (`AdminController.php:31-38`),
 * the slug generator shared by product categories, blog categories, blogs,
 * and products (`convert_to_slug` call sites: `AdminController.php:59`,
 * `125`, `166`, `245`, `886`, `1012`) — P-07 (Preserved Defect):
 * "Category slugs are unsanitized (`name-rand()`, may contain
 * spaces/uppercase). Preserve both slug algorithms." This is the SECOND
 * of the two P-07 algorithms — the first (category's own inline slug
 * logic, if any exists separately) is out of this file's scope; this file
 * covers ONLY the `convert_to_slug` helper method itself.
 *
 * SOURCE (verified directly this slice):
 *
 *   public function convert_to_slug($str) {
 *     $rnd_str=str_random(5);
 *     $str = strtolower(trim($str));
 *     $str = preg_replace('/[^a-z0-9-]/', '-', $str);
 *     $str = preg_replace('/-+/', "-", $str);
 *     $str .= '-'.strtolower($rnd_str);
 *     return rtrim($str, '-');
 *   }
 *
 * STEP-BY-STEP, PRESERVED EXACTLY (do not "clean up" any of this — every
 * step, including its quirks, is load-bearing for byte-identical output):
 *   1. `trim($str)` — trims LEADING/TRAILING whitespace only (PHP's
 *      default `trim()` charlist), NOT internal whitespace.
 *   2. `strtolower(...)` — lowercases the ENTIRE trimmed string.
 *   3. `preg_replace('/[^a-z0-9-]/', '-', $str)` — replaces every
 *      character that is NOT a-z, 0-9, or literal `-` with a SINGLE `-`.
 *      This means internal whitespace, punctuation, and any non-ASCII
 *      character each become their own individual `-` (NOT collapsed at
 *      this step — collapsing happens in step 4).
 *   4. `preg_replace('/-+/', "-", $str)` — collapses ANY run of one-or-more
 *      consecutive `-` (including runs produced by step 3, AND any
 *      literal `-` characters that were already in the original string)
 *      down to a SINGLE `-`.
 *   5. Appends `'-'.strtolower($rnd_str)` — a literal `-` plus 5
 *      lowercased random base64-URL-safe-alphabet characters
 *      (`Str::random(5)`: `random_bytes()` through `base64_encode()` with
 *      `/`, `+`, `=` stripped — i.e. drawn from `[A-Za-z0-9]`, then
 *      lowercased here to `[a-z0-9]`).
 *   6. `rtrim($str, '-')` — trims TRAILING `-` only (e.g. an
 *      empty/all-punctuation input like `"---"` becomes `""` after step
 *      4's collapse, so the final string is just `-{5 random chars}`,
 *      then rtrim has nothing trailing to strip since the random suffix
 *      is alphanumeric — this only matters if $rnd_str itself could ever
 *      produce something ending in a still-untrimmed `-`, which it
 *      cannot, since the alphabet excludes `-`. rtrim is effectively a
 *      no-op given step 5 always appends a non-`-`-ending suffix, but is
 *      reproduced anyway for exactness against source's literal code.)
 *
 * NOT reproduced from PHP's exact RNG: this uses Node's `crypto.randomBytes`
 * instead of PHP's `random_bytes()` — both are CSPRNG sources, byte values
 * necessarily differ, and per contract §7.2 this falls under "str_random(5)
 * slug suffixes on newly created records... Random by design" — permitted
 * variance, not a fidelity violation.
 */

import { randomBytes } from 'crypto';

/** Node port of Laravel's `Str::random($length)` — base64-encode random
 * bytes, strip `/`, `+`, `=`, take the first `$length` characters. */
function strRandom(length: number): string {
  let result = '';
  while (result.length < length) {
    const size = length - result.length;
    const bytes = randomBytes(size);
    result += bytes.toString('base64').replace(/[/+=]/g, '').slice(0, size);
  }
  return result;
}

export function convertToSlug(input: string): string {
  const rndStr = strRandom(5);
  let str = input.trim().toLowerCase();
  str = str.replace(/[^a-z0-9-]/g, '-');
  str = str.replace(/-+/g, '-');
  str += '-' + rndStr.toLowerCase();
  return str.replace(/-+$/, '');
}
