/**
 * MongoDB collection name constants.
 *
 * M3-A SCOPE
 * ----------
 * Names only — no schema, no connection, no queries. Centralizing collection
 * names here means a typo in a string literal becomes a compile error
 * instead of a silent miss at query time.
 *
 * SOURCE OF THIS LIST: docs/M3-MONGODB-ARCHITECTURE.md §2 ("Proposed
 * Collections" table), itself built from docs/M3-DATABASE-MAPPING.md's
 * per-table analysis of all 34 MariaDB tables. Every name below traces to
 * that table; see the linked documents for the reasoning behind each
 * embed/reference/collection decision.
 *
 * DR-01 (APPROVED, 2026-08-16, docs/M3-OWNER-DECISION-RECORDS.md):
 * `orders`, `orderProducts`, `payments` are THREE SEPARATE collections,
 * matching the existing Laravel table structure — Option B, not the
 * embedded-document Option A. Do not collapse these into one collection.
 *
 * STILL OPEN (not decided — do not assume a resolution):
 * - DR-02 (product_features/product_variations/product_pkg placement) —
 *   included below as ordinary collections per that record's recommendation,
 *   but the recommendation is NOT yet owner-approved; treat as provisional.
 * - DR-03 (pin_codes' B-09 reproduction mechanism) — the COLLECTION exists
 *   regardless of which option is chosen; only the write-time validation
 *   behavior is undecided (see schemas/pinCode.ts).
 */

export const COLLECTIONS = {
  // --- Users, buyers, admins (docs/M3-DATABASE-MAPPING.md §1.1) ---
  users: 'users',
  sellerProfiles: 'sellerProfiles', // combines seller_profile + banks, both VESTIGIAL
  partnerProfiles: 'partnerProfiles', // GENUINELY NEW — Partner Panel feature, no MariaDB source

  // --- Products, categories (§1.2) ---
  products: 'products', // embeds product_images, product_review, product_specification
  categories: 'categories',
  productCategories: 'productCategories', // was product_category, self-referential parentId

  // --- Orders group — DR-01 APPROVED: three separate collections (§1.4) ---
  orders: 'orders',
  orderProducts: 'orderProducts',
  payments: 'payments',

  // --- Appointments, enquiries (§1.5, §1.6) ---
  appointments: 'appointments',
  enquiries: 'enquiries',

  // --- Posts / blog content (§1.7) ---
  posts: 'posts', // was tbl_post
  homeopathyMaster: 'homeopathyMaster', // was tbl_homeopathy
  blogs: 'blogs',
  blogCategories: 'blogCategories', // was blog_category

  // --- Sliders, pincodes, geo (§1.8, §1.9, §2) ---
  sliders: 'sliders', // P-18 RESOLVED (Site Settings feature, owner-approved 2026-09-20): now rendered as a promo-banner strip on the real homepage (`RedesignedHome.tsx`) — see `sliderRepository.ts`'s header
  pinCodes: 'pinCodes', // DR-03 open — see schemas/pinCode.ts
  statezones: 'statezones',
  cities: 'cities',

  // --- Vestigial-but-populated tables (DR-02, provisional pending approval) ---
  productFeatures: 'productFeatures',
  productVariations: 'productVariations',
  productPkg: 'productPkg',

  // --- Vestigial/dead-write tables, migrated per NN-10, unused by any code ---
  baskets: 'baskets',
  sellerPayments: 'sellerPayments',
  orderFullfill: 'orderFullfill',
  statusCodes: 'statusCodes',
  variations: 'variations',
  passwordResets: 'passwordResets', // has no `id` column in source — see docs/DATABASE-ANALYSIS-MARIADB-SOURCE.md §3
  shipping: 'shipping', // P-09: never actually read by live code; delivery charge stays hardcoded 0 regardless

  // NOTE: `migrations` (Laravel framework bookkeeping) is intentionally NOT
  // included — out of scope for data migration by definition
  // (docs/M3-DATABASE-MAPPING.md §2). Cart has no collection — session-based
  // (docs/M3-DATABASE-MAPPING.md §1.3).
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];
