/**
 * `@/lib/adminSlug` (`convertToSlug`) tests — M5-E, blog-categories
 * sub-slice. Ports `AdminController::convert_to_slug` — P-07's "second"
 * slug algorithm, shared by product categories, blog categories, blogs,
 * and products. See that file's header for the full step-by-step
 * derivation this suite verifies.
 */

import { describe, it, expect } from 'vitest';
import { convertToSlug } from '@/lib/adminSlug';

describe('convertToSlug', () => {
  it('lowercases and trims leading/trailing whitespace', () => {
    const slug = convertToSlug('  Hello World  ');
    expect(slug).toMatch(/^hello-world-[a-z0-9]{5}$/);
  });

  it('replaces internal whitespace and punctuation with single hyphens, collapsing runs', () => {
    // "Hello,   World!!" -> lowercase -> "hello,   world!!"
    // -> non-[a-z0-9-] chars each become '-' individually:
    //    "hello-------world--" (comma, 3 spaces, 2 '!' -> 5 individual '-'
    //    for ",   " and 2 for "!!")
    // -> collapse runs of '-' -> "hello-world-"
    // -> append '-{5 chars}' -> "hello-world--{5 chars}"
    // -> collapse happens only once (step 4 runs before the suffix is
    //    appended in source) -> trailing '-' before suffix does NOT get
    //    re-collapsed against the suffix's own leading '-', producing a
    //    double hyphen at the join point. Verified against source's exact
    //    step order (collapse THEN append), not assumed.
    const slug = convertToSlug('Hello,   World!!');
    expect(slug).toMatch(/^hello-world--[a-z0-9]{5}$/);
  });

  it('preserves and collapses literal hyphens already in the input', () => {
    const slug = convertToSlug('already---hyphenated');
    expect(slug).toMatch(/^already-hyphenated-[a-z0-9]{5}$/);
  });

  it('appends a 5-character lowercase alphanumeric suffix, different on every call (str_random(5))', () => {
    const slug1 = convertToSlug('Same Name');
    const slug2 = convertToSlug('Same Name');
    expect(slug1).not.toBe(slug2); // random suffix — permitted variance, contract §7.2
    expect(slug1).toMatch(/-[a-z0-9]{5}$/);
    expect(slug2).toMatch(/-[a-z0-9]{5}$/);
  });

  it('handles an all-punctuation input: collapses to one hyphen, then the "-{suffix}" append produces a leading double hyphen (traced against source\'s literal step order — collapse happens BEFORE the suffix is appended, so the join is never re-collapsed)', () => {
    const slug = convertToSlug('!!!');
    expect(slug).toMatch(/^--[a-z0-9]{5}$/);
  });

  it('never produces uppercase characters', () => {
    const slug = convertToSlug('UPPERCASE Name');
    expect(slug).toBe(slug.toLowerCase());
  });

  it('handles a purely alphanumeric input unchanged aside from lowercasing and the suffix', () => {
    const slug = convertToSlug('Category123');
    expect(slug).toMatch(/^category123-[a-z0-9]{5}$/);
  });
});
