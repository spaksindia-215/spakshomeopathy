import { LegacyScriptRunner } from './LegacyScriptRunner';

/**
 * Closing script block shared by the static pages in Milestone 1 scope
 * (about, contact, terms, privacy-policy, return-policy, mother-tincture,
 * details, video, 404). Verified byte-identical across all eight in the
 * raw production capture — see M1 Gate Report §asset manifest.
 *
 * Per blueprint §4.1 / M2, other page types (e.g. product-detail, index)
 * load additional plugin scripts and must NOT reuse this component as-is;
 * their script lists are ported independently when those pages arrive.
 *
 * OI-10 — WHY THESE ARE NOT PLAIN <script> TAGS
 * ---------------------------------------------
 * Emitting the nine legacy <script> tags inline here is the literal
 * transliteration of the Blade source, and it is what this component did
 * originally. It does not work under React: the scripts execute during
 * parse, jQuery correctly mutates the DOM, and then React hydration
 * (~955ms) REVERTS every mutation and raises error #418. Measured in detail
 * in LegacyScriptRunner.tsx and docs/OI-10-RESOLUTION.md.
 *
 * `LegacyScriptRunner` injects the SAME nine scripts, in the SAME order,
 * with `async=false` so execution order is preserved — just after hydration
 * instead of during it. The emitted network requests are therefore identical
 * to production (V-14); only their timing differs.
 */
export function PublicScripts() {
  return (
    <>
      <a
        href="#"
        data-target="html"
        data-target-offset="0"
        className="scroll-to-target scroll-to-top"
      >
        <i className="material-icons">keyboard_arrow_up</i>
      </a>
      {/* /.scroll-to-top */}
      <LegacyScriptRunner />
    </>
  );
}
