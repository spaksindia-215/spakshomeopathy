/**
 * Demo-fixture generator — a ONE-OFF, DEVELOPER-RUN tool that produces the
 * static TypeScript files under `src/lib/demo/`.
 *
 * ============================================================================
 * THIS SCRIPT IS NEVER RUN AUTOMATICALLY. It is not part of `npm run dev`,
 * `npm run build`, or any test. Its OUTPUT (the files it writes under
 * src/lib/demo/) is committed to the repository like any other source
 * file, exactly as scripts/migrate.ts's own dry-run output is meant to be
 * inspected and acted on by a human, not chained into an automated build
 * step. Re-run this script only when the curated demo selection needs to
 * change (see src/lib/demo/index.ts's header for the exact invocation and
 * the list of legacyIds currently selected).
 * ============================================================================
 *
 * WHY THIS EXISTS (added for the "UI/visual demo migration" milestone,
 * 2026-08-20 owner instruction): the demo needs REAL product/category/post
 * content (not invented placeholder text), but the Next.js app itself must
 * not depend on a live database connection or on the 20MB SQL dump file
 * being present at request time. This script bridges that gap exactly
 * once: it reuses `getAcceptedDocuments` (src/lib/migration/documents.ts,
 * built M3-C) — THE SAME extraction/transformation/validation pipeline
 * every other M3 migration tool trusts — to pull real, schema-valid rows
 * out of `Database/db_newhomo.sql`, then writes a small, hand-curated
 * subset of them to disk as plain `.ts` files.
 *
 * NO TRANSFORMATION LOGIC IS DUPLICATED HERE — this script calls
 * `getAcceptedDocuments` exactly as `scripts/migrate-to-mongodb.ts` does;
 * it does not reimplement any mapping rule.
 *
 * CURATION, NOT A FULL DUMP: this script does not write every row it
 * extracts — it hand-picks a bounded, documented subset (see the
 * `CURATED_*` constants below), chosen so that (a) pages needing a
 * complete list (disease/herb category trees) get the complete real list,
 * since those tables are small, and (b) pages needing a handful of
 * representative rows (products, posts) get real rows that were
 * DELIBERATELY chosen to match existing Playwright baseline screenshots
 * (baseline/screenshots/) wherever a baseline names a specific subject —
 * e.g. products named "Agaricus"/"Bryonia"/"Colchicum", disease slugs
 * "bones"/"brain"/"cancer" — so that visually comparing a newly-built demo
 * page against its production baseline is a meaningful signal, not a
 * coincidence.
 *
 * USAGE:
 *   npx tsx scripts/generate-demo-fixtures.ts [--dump <path>]
 *
 *   --dump   Path to the SQL dump. Defaults to Database/db_newhomo.sql
 *            (the project's own dump, same default as scripts/migrate.ts).
 *
 * SAFETY: like scripts/migrate.ts, this script never imports
 * src/lib/mongodb/client.ts and never constructs a MongoClient — it only
 * reads a text file and writes plain .ts files under src/lib/demo/.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import { getAcceptedDocuments } from '../src/lib/migration/documents';
import type {
  Product,
  Category,
  ProductCategory,
  Post,
  HomeopathyMaster,
  Statezone,
  Blog,
  BlogCategory,
  User,
  Enquiry,
  PinCode,
  Slider,
} from '../src/lib/mongodb/schemas';

// ============================================================================
// CURATION LISTS — the only "judgment calls" this script makes. Edit these
// to change what the demo shows; everything else below is mechanical.
// ============================================================================

/** Product NAME substrings (case-insensitive) to select — chosen to match
 * existing baseline screenshots (product-details-agaricus/-bryonia/-colchicum)
 * plus a handful more for grid-page visual variety. */
const CURATED_PRODUCT_NAME_MATCHES = [
  'agaricus',
  'bryonia',
  'colchicum',
  'arnica',
  'belladonna',
  'nux vomica',
  'pulsatilla',
  'sulphur',
  'rhus tox',
  'calcarea',
  'ignatia',
  'lycopodium',
  'sepia',
  'phosphorus',
  'natrum mur',
];

/** Category slug substrings to prioritize (baseline: diseases-details-bones/-brain/-cancer). */
const CURATED_CATEGORY_SLUG_HINTS = ['bones', 'brain', 'cancer'];

/**
 * pCat value to ensure is well-represented for the /productsbydisease/{id}
 * route demo. An existing baseline screenshot is named
 * `productsbydisease-24`, but VERIFIED this session (by extracting the
 * real dump and counting products per pCat): pCat=24 has ZERO real
 * products in production — the baseline was very likely captured against
 * a genuinely-empty category page, not a populated one. Rather than
 * fabricate products under pCat=24 to force a visual match that source
 * itself doesn't have, this demo uses pCat=1 (the best-represented real
 * category, 34 real products) so `/productsbydisease/1` shows real,
 * non-empty content. `/productsbydisease/24` remains available and will
 * correctly render empty, matching what the real data actually shows.
 */
const CURATED_PCAT_FOR_PRODUCTSBYDISEASE = 1;

const MAX_POSTS = 15;

/** M4-DEMO Phase 1 (admin UI): number of real enquiries to curate — same
 * "no special curation" precedent as MAX_POSTS. Real production has
 * 16,386 rows (schemas/enquiry.ts); this is a small representative slice
 * for the admin Enquiries List demo, not an attempt at completeness. */
const MAX_ADMIN_ENQUIRIES = 15;

/** M4-DEMO Phase 1: utype filter matching AdminController@UsersList's
 * real query (confirmed this session: `users-list` route filters
 * utype=2, i.e. SELLERS — schemas/user.ts's own header documents utype=2
 * as "VESTIGIAL — can never log in" — this naming inversion vs. the
 * page's plain "Users" title is real, not a curation choice, and is
 * flagged explicitly in the admin demo-data layer's own doc comments. */
const CURATED_USER_UTYPE = 2;

function parseArgs(argv: string[]) {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg?.startsWith('--')) {
      const key = arg.slice(2);
      const value = argv[i + 1];
      if (value && !value.startsWith('--')) {
        args[key] = value;
        i++;
      }
    }
  }
  return args;
}

/** Renders a JS value as a TypeScript source literal. Dates become `new
 * Date("ISO")` expressions (not JSON strings) so the generated file is
 * valid, directly-importable TypeScript, not a JSON blob. */
function toTsLiteral(value: unknown, indent = 0): string {
  const pad = '  '.repeat(indent);
  const padInner = '  '.repeat(indent + 1);

  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (value instanceof Date) return `new Date(${JSON.stringify(value.toISOString())})`;
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);

  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const items = value.map((v) => `${padInner}${toTsLiteral(v, indent + 1)}`).join(',\n');
    return `[\n${items},\n${pad}]`;
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return '{}';
    const body = entries
      .map(([k, v]) => `${padInner}${JSON.stringify(k)}: ${toTsLiteral(v, indent + 1)}`)
      .join(',\n');
    return `{\n${body},\n${pad}}`;
  }

  throw new Error(`toTsLiteral: unsupported value type: ${typeof value}`);
}

function writeFixtureFile(
  path: string,
  header: string,
  exportName: string,
  typeName: string,
  typeImportPath: string,
  values: unknown[]
): void {
  const body =
    `${header}\n\n` +
    `import type { ${typeName} } from '${typeImportPath}';\n\n` +
    `export const ${exportName}: ${typeName}[] = ${toTsLiteral(values)};\n`;
  writeFileSync(path, body, 'utf-8');
  console.log(`  wrote ${path} (${values.length} rows)`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const dumpPath = args.dump ?? resolve(__dirname, '../../Database/db_newhomo.sql');
  const outDir = resolve(__dirname, '../src/lib/demo');

  console.log('='.repeat(70));
  console.log('DEMO FIXTURE GENERATOR — one-off, writes committed .ts files');
  console.log('No MongoDB connection. No writes outside src/lib/demo/.');
  console.log('='.repeat(70));
  console.log(`Reading source dump: ${dumpPath}`);

  const dumpText = readFileSync(dumpPath, 'utf-8');
  const docs = getAcceptedDocuments(dumpText);

  // --- categories: full real disease (N) + herb (H) trees — small tables,
  // include everything so diseases-list/herbs-list/all-diseases are
  // completely real, not a sample.
  const allCategories = docs.categories as Category[];
  const sortedCategories = [...allCategories].sort((a, b) => {
    const aHint = CURATED_CATEGORY_SLUG_HINTS.some((h) => a.slug?.includes(h)) ? 0 : 1;
    const bHint = CURATED_CATEGORY_SLUG_HINTS.some((h) => b.slug?.includes(h)) ? 0 : 1;
    return aHint - bHint;
  });

  // --- productCategories: full real marketplace tree (also small).
  const allProductCategories = docs.productCategories as ProductCategory[];

  // --- products: curated by name match, plus a handful of pCat=1 products
  // (see CURATED_PCAT_FOR_PRODUCTSBYDISEASE's header for why 1, not 24)
  // to ensure /productsbydisease/1 has real, non-empty content.
  const allProducts = docs.products as Product[];
  const byNameMatch = allProducts.filter((p) =>
    CURATED_PRODUCT_NAME_MATCHES.some((needle) => p.pName?.toLowerCase().includes(needle))
  );
  const pCatAnchors = allProducts
    .filter((p) => p.pCat === CURATED_PCAT_FOR_PRODUCTSBYDISEASE)
    .slice(0, 6);
  const curatedProducts = [...byNameMatch, ...pCatAnchors.filter((p) => !byNameMatch.includes(p))];

  // --- posts: first N accepted posts, real content, bounded for file size.
  const curatedPosts = (docs.posts as Post[]).slice(0, MAX_POSTS);
  const curatedHomeopathyMaster = docs.homeopathyMaster as HomeopathyMaster[];

  // --- statezones: full real list (small table) — needed by /register and
  // the checkout state dropdown.
  const allStatezones = docs.statezones as Statezone[];

  // --- blogs/blogCategories: full real lists (both small tables, 4 and 1
  // rows respectively) — needed by /blog-detail/{slug}.
  const allBlogs = docs.blogs as Blog[];
  const allBlogCategories = docs.blogCategories as BlogCategory[];

  // --- M4-DEMO Phase 1 (admin UI) additions below ---

  // --- admin users: utype=2 (sellers) — matches AdminController@UsersList's
  // real filter exactly, see CURATED_USER_UTYPE's header for the naming
  // inversion this preserves (page titled "Users", data is sellers).
  const curatedAdminUsers = (docs.users as User[]).filter((u) => u.utype === CURATED_USER_UTYPE);

  // --- admin enquiries: small real slice, same "no special curation"
  // precedent as posts.
  const curatedAdminEnquiries = (docs.enquiries as Enquiry[]).slice(0, MAX_ADMIN_ENQUIRIES);

  // --- admin pincodes: full real table. VERIFIED this session: production
  // has exactly 1 row — rendered honestly, not padded to look fuller.
  const allAdminPinCodes = docs.pinCodes as PinCode[];

  // --- admin sliders: full real table. VERIFIED (schemas/slider.ts's own
  // header, re-confirmed this session): 0 rows in production, matching
  // the already-registered P-18 finding (sliders unused/disconnected
  // end-to-end). Written as an empty array — NOT padded with synthetic
  // rows; the admin Slider List page renders honestly empty by default.
  const allAdminSliders = docs.sliders as Slider[];

  console.log('\nCurated counts:');
  console.log(`  categories: ${sortedCategories.length} (full)`);
  console.log(`  productCategories: ${allProductCategories.length} (full)`);
  console.log(`  products: ${curatedProducts.length} (curated from ${allProducts.length})`);
  console.log(`  posts: ${curatedPosts.length} (curated from ${docs.posts.length})`);
  console.log(`  homeopathyMaster: ${curatedHomeopathyMaster.length} (full)`);
  console.log(`  statezones: ${allStatezones.length} (full)`);
  console.log(`  blogs: ${allBlogs.length} (full)`);
  console.log(`  blogCategories: ${allBlogCategories.length} (full)`);
  console.log(`  admin/users (utype=${CURATED_USER_UTYPE}): ${curatedAdminUsers.length}`);
  console.log(
    `  admin/enquiries: ${curatedAdminEnquiries.length} (curated from ${docs.enquiries.length})`
  );
  console.log(`  admin/pincodes: ${allAdminPinCodes.length} (full)`);
  console.log(`  admin/sliders: ${allAdminSliders.length} (full — 0 expected, see header note)`);

  console.log('\nWriting fixture files...');

  writeFixtureFile(
    resolve(outDir, 'categories.generated.ts'),
    '/**\n' +
      ' * GENERATED by scripts/generate-demo-fixtures.ts — DO NOT hand-edit.\n' +
      ' * Real category rows from Database/db_newhomo.sql, via the same\n' +
      ' * extraction/transformation/validation pipeline every M3 migration\n' +
      ' * tool uses (src/lib/migration/documents.ts getAcceptedDocuments).\n' +
      ' * Full real list (disease N + herb H trees) — not a sample.\n' +
      ' */',
    'DEMO_CATEGORIES',
    'Category',
    '@/lib/mongodb/schemas',
    sortedCategories
  );

  writeFixtureFile(
    resolve(outDir, 'productCategories.generated.ts'),
    '/**\n' +
      ' * GENERATED by scripts/generate-demo-fixtures.ts — DO NOT hand-edit.\n' +
      ' * Real product_category rows (marketplace tree). Full real list.\n' +
      ' */',
    'DEMO_PRODUCT_CATEGORIES',
    'ProductCategory',
    '@/lib/mongodb/schemas',
    allProductCategories
  );

  writeFixtureFile(
    resolve(outDir, 'products.generated.ts'),
    '/**\n' +
      ' * GENERATED by scripts/generate-demo-fixtures.ts — DO NOT hand-edit.\n' +
      ' * Real, curated product rows — see this script header for the exact\n' +
      ' * curation criteria (CURATED_PRODUCT_NAME_MATCHES).\n' +
      ' */',
    'DEMO_PRODUCTS',
    'Product',
    '@/lib/mongodb/schemas',
    curatedProducts
  );

  writeFixtureFile(
    resolve(outDir, 'posts.generated.ts'),
    '/**\n' +
      ' * GENERATED by scripts/generate-demo-fixtures.ts — DO NOT hand-edit.\n' +
      ` * First ${MAX_POSTS} real, accepted post rows.\n` +
      ' */',
    'DEMO_POSTS',
    'Post',
    '@/lib/mongodb/schemas',
    curatedPosts
  );

  writeFixtureFile(
    resolve(outDir, 'homeopathyMaster.generated.ts'),
    '/**\n' +
      ' * GENERATED by scripts/generate-demo-fixtures.ts — DO NOT hand-edit.\n' +
      ' * Full real homeopathyMaster list.\n' +
      ' */',
    'DEMO_HOMEOPATHY_MASTER',
    'HomeopathyMaster',
    '@/lib/mongodb/schemas',
    curatedHomeopathyMaster
  );

  writeFixtureFile(
    resolve(outDir, 'statezones.generated.ts'),
    '/**\n' +
      ' * GENERATED by scripts/generate-demo-fixtures.ts — DO NOT hand-edit.\n' +
      ' * Full real statezones list.\n' +
      ' */',
    'DEMO_STATEZONES',
    'Statezone',
    '@/lib/mongodb/schemas',
    allStatezones
  );

  writeFixtureFile(
    resolve(outDir, 'blogs.generated.ts'),
    '/**\n' +
      ' * GENERATED by scripts/generate-demo-fixtures.ts — DO NOT hand-edit.\n' +
      ' * Full real blogs list (4 rows in production).\n' +
      ' */',
    'DEMO_BLOGS',
    'Blog',
    '@/lib/mongodb/schemas',
    allBlogs
  );

  writeFixtureFile(
    resolve(outDir, 'blogCategories.generated.ts'),
    '/**\n' +
      ' * GENERATED by scripts/generate-demo-fixtures.ts — DO NOT hand-edit.\n' +
      ' * Full real blogCategories list.\n' +
      ' */',
    'DEMO_BLOG_CATEGORIES',
    'BlogCategory',
    '@/lib/mongodb/schemas',
    allBlogCategories
  );

  // --- M4-DEMO Phase 1 (admin UI): written into src/lib/demo/admin/,
  // a separate namespace from the public-site fixtures above.
  const adminOutDir = resolve(outDir, 'admin');
  mkdirSync(adminOutDir, { recursive: true });

  writeFixtureFile(
    resolve(adminOutDir, 'users.generated.ts'),
    '/**\n' +
      ' * GENERATED by scripts/generate-demo-fixtures.ts — DO NOT hand-edit.\n' +
      ` * Real users with utype=${CURATED_USER_UTYPE} (sellers) — matches\n` +
      " * AdminController@UsersList's real filter. See CURATED_USER_UTYPE's\n" +
      ' * header comment in this script for the naming inversion this\n' +
      ' * preserves (the admin page is titled "Users", the data is sellers).\n' +
      ' */',
    'DEMO_ADMIN_USERS',
    'User',
    '@/lib/mongodb/schemas',
    curatedAdminUsers
  );

  writeFixtureFile(
    resolve(adminOutDir, 'enquiries.generated.ts'),
    '/**\n' +
      ' * GENERATED by scripts/generate-demo-fixtures.ts — DO NOT hand-edit.\n' +
      ` * First ${MAX_ADMIN_ENQUIRIES} real, accepted enquiry rows (of\n` +
      ' * 16,386 total in production) — for the admin Enquiries List/View.\n' +
      ' */',
    'DEMO_ADMIN_ENQUIRIES',
    'Enquiry',
    '@/lib/mongodb/schemas',
    curatedAdminEnquiries
  );

  writeFixtureFile(
    resolve(adminOutDir, 'pincodes.generated.ts'),
    '/**\n' +
      ' * GENERATED by scripts/generate-demo-fixtures.ts — DO NOT hand-edit.\n' +
      ' * Full real pinCodes list — VERIFIED exactly 1 row in production,\n' +
      ' * rendered honestly, not padded.\n' +
      ' */',
    'DEMO_ADMIN_PINCODES',
    'PinCode',
    '@/lib/mongodb/schemas',
    allAdminPinCodes
  );

  writeFixtureFile(
    resolve(adminOutDir, 'sliders.generated.ts'),
    '/**\n' +
      ' * GENERATED by scripts/generate-demo-fixtures.ts — DO NOT hand-edit.\n' +
      ' * Full real sliders list — VERIFIED 0 rows in production (matches\n' +
      ' * the already-registered P-18 finding). Intentionally empty, not\n' +
      ' * padded with synthetic rows.\n' +
      ' */',
    'DEMO_ADMIN_SLIDERS',
    'Slider',
    '@/lib/mongodb/schemas',
    allAdminSliders
  );

  console.log('\n' + '='.repeat(70));
  console.log('DONE. Review the generated files, then commit them.');
  console.log('No MongoDB connection was made. No file outside src/lib/demo/ was touched.');
  console.log('='.repeat(70));
}

main();
